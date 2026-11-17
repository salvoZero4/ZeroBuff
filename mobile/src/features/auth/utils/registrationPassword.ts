export const REGISTRATION_PASSWORD_HINT =
  "At least 8 characters, including an uppercase letter, a lowercase letter, and a digit.";

// Python str.isdigit() also accepts Unicode Numeric_Type=Digit (e.g. ²).
const DIGIT = /[\p{Decimal_Number}\u{b2}-\u{b3}\u{b9}\u{1369}-\u{1371}\u{19da}\u{2070}\u{2074}-\u{2079}\u{2080}-\u{2089}\u{2460}-\u{2468}\u{2474}-\u{247c}\u{2488}-\u{2490}\u{24ea}\u{24f5}-\u{24fd}\u{24ff}\u{2776}-\u{277e}\u{2780}-\u{2788}\u{278a}-\u{2792}\u{10a40}-\u{10a43}\u{10e60}-\u{10e68}\u{11052}-\u{1105a}\u{1f100}-\u{1f10a}]/u;

export function getRegistrationPasswordError(password: string): string | undefined {
  if (Array.from(password).length < 8) return "Use at least 8 characters.";
  if (!DIGIT.test(password)) return "Add at least one digit.";
  if (!/\p{Uppercase}/u.test(password)) return "Add at least one uppercase letter.";
  if (!/\p{Lowercase}/u.test(password)) return "Add at least one lowercase letter.";
}
