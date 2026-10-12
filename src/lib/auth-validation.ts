export function validateSignupConfirmation(
  email: string,
  confirmEmail: string,
  password: string,
  confirmPassword: string,
) {
  if (email !== confirmEmail) return "Email addresses do not match.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}
