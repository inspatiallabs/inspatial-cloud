function encodeBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

function decodeBase64(data: string): Uint8Array {
  return new Uint8Array(atob(data).split("").map((c) => c.charCodeAt(0)));
}

/** Number of random bytes used to generate a nonce */
const defaultNonceSize = 16;
const textEncoder = new TextEncoder();

enum AuthenticationState {
  Init,
  ClientChallenge,
  ServerChallenge,
  ClientResponse,
  ServerResponse,
  Failed,
}

/**
 * Collection of SCRAM authentication keys derived from a plaintext password
 * in HMAC-derived binary format
 */
interface KeySignatures {
  client: Uint8Array;
  server: Uint8Array;
  stored: Uint8Array;
}

/**
 * Reason of authentication failure
 */
export enum Reason {
  BadMessage = "server sent an ill-formed message",
  BadServerNonce = "server sent an invalid nonce",
  BadSalt = "server specified an invalid salt",
  BadIterationCount = "server specified an invalid iteration count",
  BadVerifier = "server sent a bad verifier",
  Rejected = "rejected by server",
}

function assert(cond: unknown): asserts cond {
  if (!cond) {
    throw new Error("Scram protocol assertion failed");
  }
}

/**
 * Normalizes string per SASLprep.
 * @see {@link https://tools.ietf.org/html/rfc3454}
 * @see {@link https://tools.ietf.org/html/rfc4013}
 */
function assertValidScramString(str: string) {
  const unsafe = /[^\x21-\x7e]/;
  if (unsafe.test(str)) {
    throw new Error(
      "scram username/password is currently limited to safe ascii characters",
    );
  }
}

async function computeScramSignature(
  message: string,
  rawKey: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return new Uint8Array(
    await crypto.subtle.sign(
      { name: "HMAC", hash: "SHA-256" },
      key,
      textEncoder.encode(message),
    ),
  );
}

function computeScramProof(signature: Uint8Array, key: Uint8Array): Uint8Array {
  const digest = new Uint8Array(signature.length);
  for (let i = 0; i < digest.length; i++) {
    digest[i] = signature[i] ^ key[i];
  }
  return digest;
}

/**
 * Derives authentication key signatures from a plaintext password
 */
async function deriveKeySignatures(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<KeySignatures> {
  const pbkdf2Password = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      hash: "SHA-256",
      iterations,
      name: "PBKDF2",
      salt,
    },
    pbkdf2Password,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    ["sign"],
  );

  const client = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, textEncoder.encode("Client Key")),
  );
  const server = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, textEncoder.encode("Server Key")),
  );
  const stored = new Uint8Array(await crypto.subtle.digest("SHA-256", client));

  return { client, server, stored };
}

/** Escapes "=" and "," in a string. */
function escape(str: string): string {
  return str.replace(/=/g, "=3D").replace(/,/g, "=2C");
}

function generateRandomNonce(size: number): string {
  return encodeBase64(crypto.getRandomValues(new Uint8Array(size)));
}

function parseScramAttributes(message: string): Record<string, string> {
  const attrs: Record<string, string> = {};

  for (const entry of message.split(",")) {
    const pos = entry.indexOf("=");
    if (pos < 1) {
      throw new Error(Reason.BadMessage);
    }

    const key = entry.substring(0, pos);
    const value = entry.substring(pos + 1);
    attrs[key] = value;
  }

  return attrs;
}

/**
 * Client composes and verifies SCRAM authentication messages, keeping track
 * of authentication #state and parameters.
 * @see {@link https://tools.ietf.org/html/rfc5802}
 */
export class ScramClient {
  #authMessage: string;
  #clientNonce: string;
  #keySignatures?: KeySignatures;
  #password: string;
  #serverNonce?: string;
  #state: AuthenticationState;
  #username: string;

  constructor(username: string, password: string, nonce?: string) {
    assertValidScramString(password);
    assertValidScramString(username);

    this.#authMessage = "";
    this.#clientNonce = nonce ?? generateRandomNonce(defaultNonceSize);
    this.#password = password;
    this.#state = AuthenticationState.Init;
    this.#username = escape(username);
  }

  /**
   * Composes client-first-message
   */
  composeChallenge(): string {
    assert(this.#state === AuthenticationState.Init);

    try {
      // "n" for no channel binding, then an empty authzid option follows.
      const header = "n,,";

      const challenge = `n=${this.#username},r=${this.#clientNonce}`;
      const message = header + challenge;

      this.#authMessage += challenge;
      this.#state = AuthenticationState.ClientChallenge;
      return message;
    } catch (e) {
      this.#state = AuthenticationState.Failed;
      throw e;
    }
  }

  /**
   * Processes server-first-message
   */
  async receiveChallenge(challenge: string): Promise<void> {
    assert(this.#state === AuthenticationState.ClientChallenge);

    try {
      const attrs = parseScramAttributes(challenge);

      const nonce = attrs.r;
      if (!attrs.r || !attrs.r.startsWith(this.#clientNonce)) {
        throw new Error(Reason.BadServerNonce);
      }
      this.#serverNonce = nonce;

      let salt: Uint8Array | undefined;
      if (!attrs.s) {
        throw new Error(Reason.BadSalt);
      }
      try {
        salt = decodeBase64(attrs.s);
      } catch {
        throw new Error(Reason.BadSalt);
      }

      if (!salt) throw new Error(Reason.BadSalt);

      const iterCount = parseInt(attrs.i) | 0;
      if (iterCount <= 0) {
        throw new Error(Reason.BadIterationCount);
      }

      this.#keySignatures = await deriveKeySignatures(
        this.#password,
        salt,
        iterCount,
      );

      this.#authMessage += "," + challenge;
      this.#state = AuthenticationState.ServerChallenge;
    } catch (e) {
      this.#state = AuthenticationState.Failed;
      throw e;
    }
  }

  /**
   * Composes client-final-message
   */
  async composeResponse(): Promise<string> {
    assert(this.#state === AuthenticationState.ServerChallenge);
    assert(this.#keySignatures);
    assert(this.#serverNonce);

    try {
      // "biws" is the base-64 encoded form of the gs2-header "n,,".
      const responseWithoutProof = `c=biws,r=${this.#serverNonce}`;

      this.#authMessage += "," + responseWithoutProof;

      const proof = encodeBase64(
        computeScramProof(
          await computeScramSignature(
            this.#authMessage,
            this.#keySignatures.stored,
          ),
          this.#keySignatures.client,
        ),
      );
      const message = `${responseWithoutProof},p=${proof}`;

      this.#state = AuthenticationState.ClientResponse;
      return message;
    } catch (e) {
      this.#state = AuthenticationState.Failed;
      throw e;
    }
  }

  /**
   * Processes server-final-message
   */
  async receiveResponse(response: string): Promise<void> {
    assert(this.#state === AuthenticationState.ClientResponse);
    assert(this.#keySignatures);

    try {
      const attrs = parseScramAttributes(response);

      if (attrs.e) {
        throw new Error(attrs.e ?? Reason.Rejected);
      }

      const verifier = encodeBase64(
        await computeScramSignature(
          this.#authMessage,
          this.#keySignatures.server,
        ),
      );
      if (attrs.v !== verifier) {
        throw new Error(Reason.BadVerifier);
      }

      this.#state = AuthenticationState.ServerResponse;
    } catch (e) {
      this.#state = AuthenticationState.Failed;
      throw e;
    }
  }
}
