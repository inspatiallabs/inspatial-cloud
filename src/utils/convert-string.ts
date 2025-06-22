/**
 * Converts a string from camel case to snake case
 * e.g. "helloWorld" -> "hello_world"
 * Also works for Pascal case
 * e.g. "HelloWorld" -> "hello_world"
 * @param {string} inputString - input string
 * @returns {string} snake case string
 */
function camelToSnakeCase(inputString: string): string {
  // strip leading and trailing whitespace and delimiters
  inputString = inputString.trim().replace(/[^a-zA-Z0-9_]+/g, "_");
  // substitute capital letters with underscore and lowercase
  inputString = inputString.replace(/(?<!^)(?=[A-Z])/g, "_").toLowerCase();

  //insert an underscore before any digit that is preceded by a letter
  inputString = inputString.replace(/(?<=[a-zA-Z])(?=\d)/g, "_");
  return sanitizeString(inputString);
}

/**
 * Converts a string to camel case
 * e.g. "hello_world" -> "helloWorld"
 * e.g. "hello-world" -> "helloWorld"
 * e.g. "hello world" -> "helloWorld"
 * e.g. "hello   world" -> "helloWorld"
 * @param {string} inputString - input string
 * @returns {string} camel case string
 */
function toCamelCase(inputString: string): string {
  inputString = sanitizeString(inputString);
  const words = splitWords(inputString);
  // split the string into words

  // if there is only one word, return the input string
  if (words.length === 1) {
    return inputString;
  }
  // capitalize the first letter of each word except the first word
  return words[0] +
    words.slice(1).map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
}

/**
 * Converts a string to pascal case
 * e.g. "hello_world " -> "HelloWorld"
 * e.g. "hello-world" -> "HelloWorld"
 * e.g. "hello world" -> "HelloWorld"
 * e.g. "hello   world" -> "HelloWorld"
 * @param {string} inputString - input string
 * @returns {string} pascal case string
 */
function toPascalCase(inputString: string): string {
  inputString = sanitizeString(inputString);
  // split the string into words
  const words = splitWords(inputString);
  // capitalize the first letter of each word
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(
    "",
  );
}
function splitWords(inputString: string): RegExpMatchArray {
  const words = inputString.match(/([a-zA-Z0-9]+|_{2,}[a-zA-Z0-9]+)/g);
  if (!words) {
    return [inputString];
  }
  return words;
}
/**
 * Converts a string to snake case
 * e.g. "HelloWorld" -> "hello_world"
 * e.g. "hello-world" -> "hello_world"
 * e.g. "hello world" -> "hello_world"
 * e.g. "hello   world" -> "hello_world"
 * @param {string} inputString - input string
 * @returns {string} snake case string
 */
function toSnakeCase(inputString: string): string {
  return sanitizeString(inputString);
}

/**
 * Converts a string to title case
 * @param {string} inputString
 */
function toTitleCase(inputString: string): string {
  inputString = sanitizeString(inputString);
  inputString = inputString.replace(/_+/g, " ");
  return inputString.split(" ").map((word) =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(" ");
}

/**
 * Converts a camel case string to title case
 * @param {string} inputString
 */
function camelToTitleCase(inputString: string): string {
  return toTitleCase(camelToSnakeCase(inputString));
}

/**
 * Converts a string to kebab case
 * @param {string} inputString
 */

function toKebabCase(inputString: string): string {
  return sanitizeString(inputString).replace(/_/g, "-");
}

/**
 * Effectively converts a string to snake case
 * 1. Removes non-alphanumeric characters from a string
 * 2. Strips leading and trailing whitespace and delimiters
 * 3. replaces delimiters [_, -, and space] with underscores
 * 4. replaces multiple underscores with a single underscore
 * 5. converts the string to lowercase
 * @param {string} inputString - input string
 * @returns {string} sanitized string
 */
function sanitizeString(inputString: string): string {
  // strip leading and trailing whitespace and delimiters
  inputString = inputString.trim().replace(/[^a-zA-Z0-9_#]/g, "_");
  // replace spaces with underscores
  inputString = inputString.replace(" ", "_");
  // replace hyphens with underscores
  inputString = inputString.replace("-", "_");
  // replace multiple underscores with a single underscore
  // inputString = inputString.replace(/_+/g, "_");
  // convert to lowercase
  inputString = inputString.toLowerCase();
  return inputString;
}

/**
 * Generates a random string of a given length
 * @param {number} length - length of the random string
 */
function generateRandomString(length: number = 24): string {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < length; i++) {
    id += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return id;
}

/**
 * Adds leading zeros to a number or string
 * @param {number | string} value - value to add leading zeros to
 * @param {number} length - length of the resulting string (default is 2)
 */
function addLeadingZeros(
  value: number | string,
  length: number = 2,
): string {
  value = value.toString();
  if (value.length >= length) {
    return value;
  }
  return "0".repeat(length - value.length) + value;
}

type StringFormat = "snake" | "camel" | "pascal" | "title" | "kebab";

function convertString(
  inputString: string,
  toFormat: StringFormat,
  fromCamelCase?: boolean,
): string {
  if (fromCamelCase) {
    // strip leading and trailing whitespace and delimiters
    inputString = inputString.trim().replace(/[^a-zA-Z0-9_#]/g, "_");
    // substitute capital letters with underscore and lowercase
    inputString = inputString.replace(/(?<!^)(?=[A-Z])/g, "_").toLowerCase();

    //insert an underscore before any digit that is preceded by a letter
    inputString = inputString.replace(/(?<=[a-zA-Z])(?=\d)/g, "_");
  }
  switch (toFormat) {
    case "snake":
      return toSnakeCase(inputString);
    case "camel":
      return toCamelCase(inputString);
    case "pascal":
      return toPascalCase(inputString);
    case "title":
      return toTitleCase(inputString);
    case "kebab":
      return toKebabCase(inputString);
  }
}

/** */
export {
  addLeadingZeros,
  camelToSnakeCase,
  camelToTitleCase,
  convertString,
  generateRandomString,
  sanitizeString,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  toSnakeCase,
  toTitleCase,
};

export default convertString;
