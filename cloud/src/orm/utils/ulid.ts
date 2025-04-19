function encodeBase32(input: number) {
  const base32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

  let output = "";
  let value = input;
  while (value > 0) {
    const index = value % 32;
    output = base32[index] + output;
    value = Math.floor(value / 32);
  }
  return output;
}

function ulid(): string {
  const timestamp = Date.now();
  const timeChars = encodeBase32(timestamp).padStart(10, "0");
  const randomChars = crypto.getRandomValues(new Uint8Array(8));
  const randomChars32 = Array.from(randomChars)
    .map((value) => encodeBase32(value).padStart(2, "0"))
    .join("");
  const ulid = timeChars + randomChars32;
  return ulid;
}
export default ulid;
