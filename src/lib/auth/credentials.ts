export type AuthError =
  | "email_required"
  | "email_invalid"
  | "password_required"
  | "password_too_short"
  | "password_too_long"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_already_exists"
  | "rate_limited"
  | "link_expired"
  | "unknown";

export type Checked<T> = { ok: true; value: T } | { ok: false; error: AuthError };

export const PASSWORD_MIN = 8;
// Supabase hashes passwords with bcrypt, which only reads the first 72 bytes.
// Thai characters take 3 bytes each, so this is measured in bytes.
export const PASSWORD_MAX_BYTES = 72;
const EMAIL_MAX = 254;

export function validateEmail(input: string): Checked<string> {
  const email = input.trim().toLowerCase();
  if (email.length === 0) return { ok: false, error: "email_required" };
  // Deliberately simple: Supabase sends a confirmation email, which is the real check.
  if (email.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "email_invalid" };
  }
  return { ok: true, value: email };
}

export function validatePassword(input: string): Checked<string> {
  if (input.length === 0) return { ok: false, error: "password_required" };
  if (input.length < PASSWORD_MIN) return { ok: false, error: "password_too_short" };
  if (new TextEncoder().encode(input).length > PASSWORD_MAX_BYTES) {
    return { ok: false, error: "password_too_long" };
  }
  return { ok: true, value: input };
}

const MESSAGES: Record<AuthError, string> = {
  email_required: "ใส่อีเมล",
  email_invalid: "อีเมลไม่ถูกต้อง ตรวจดูอีกครั้ง เช่น name@gmail.com",
  password_required: "ใส่รหัสผ่าน",
  password_too_short: `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN} ตัวอักษร`,
  password_too_long: "รหัสผ่านยาวเกินไป ลองให้สั้นลง",
  invalid_credentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  email_not_confirmed: "ยืนยันอีเมลก่อน เราส่งลิงก์ไปที่กล่องจดหมายของคุณแล้ว",
  user_already_exists: "อีเมลนี้มีบัญชีอยู่แล้ว เข้าสู่ระบบแทน",
  rate_limited: "ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่",
  link_expired: "ลิงก์หมดอายุหรือใช้ไปแล้ว ขอลิงก์ใหม่",
  unknown: "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง",
};

export function authErrorMessage(error: AuthError): string {
  return MESSAGES[error];
}
