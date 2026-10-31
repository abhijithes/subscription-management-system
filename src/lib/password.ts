/** Returns one message per violated rule (AUTH-03, BR-02). Empty when the password is valid. */
export function validatePassword(pw: string): string[] {
  const problems: string[] = [];
  if (pw.length <= 8) problems.push("Password must be longer than 8 characters");
  if (!/[A-Z]/.test(pw)) problems.push("Password needs an uppercase letter");
  if (!/[a-z]/.test(pw)) problems.push("Password needs a lowercase letter");
  if (!/[^A-Za-z0-9]/.test(pw)) problems.push("Password needs a special character");
  return problems;
}
