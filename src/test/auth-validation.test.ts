import { describe, expect, it } from "vitest";
import { validateSignupConfirmation } from "@/lib/auth-validation";

describe("signup confirmation validation", () => {
  it("reports mismatched email addresses first", () => {
    expect(validateSignupConfirmation("first@example.com", "other@example.com", "password1", "password2"))
      .toBe("Email addresses do not match.");
  });

  it("reports mismatched passwords", () => {
    expect(validateSignupConfirmation("same@example.com", "same@example.com", "password1", "password2"))
      .toBe("Passwords do not match.");
  });

  it("accepts matching confirmation values", () => {
    expect(validateSignupConfirmation("same@example.com", "same@example.com", "password1", "password1"))
      .toBeNull();
  });
});
