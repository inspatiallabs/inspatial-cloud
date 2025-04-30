/**
 * Converts a string from camel case to snake case
 * e.g. "helloWorld" -> "hello_world"
 * Also works for Pascal case
 * e.g. "HelloWorld" -> "hello_world"
 * @param {string} inputString - input string
 * @returns {string} snake case string
 */
export function camelToSnakeCase(inputString: string): string {
  // strip leading and trailing whitespace and delimiters
  inputString = inputString.trim().replace(/[^a-zA-Z0-9_#]/g, "_");
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
export function toCamelCase(inputString: string): string {
  inputString = sanitizeString(inputString);
  // split the string into words
  const words = inputString.split("_");
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
 * Effectively converts a string to snake case
 * 1. Removes non-alphanumeric characters from a string
 * 2. Strips leading and trailing whitespace and delimiters
 * 3. replaces delimiters [_, -, and space] with underscores
 * 4. replaces multiple underscores with a single underscore
 * 5. converts the string to lowercase
 * @param {string} inputString - input string
 * @returns {string} sanitized string
 */
export function sanitizeString(inputString: string): string {
  // strip leading and trailing whitespace and delimiters
  inputString = inputString.trim().replace(/[^a-zA-Z0-9_#]/g, "_");
  // replace spaces with underscores
  inputString = inputString.replace(" ", "_");
  // replace hyphens with underscores
  inputString = inputString.replace("-", "_");
  // replace multiple underscores with a single underscore
  inputString = inputString.replace(/_+/g, "_");
  // convert to lowercase
  inputString = inputString.toLowerCase();
  return inputString;
}
