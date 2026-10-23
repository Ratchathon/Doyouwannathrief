export type Access = "public" | "user" | "admin";

// Top-level sections behind sign-in. Matched as whole path segments, so a
// shop slug like "accounting" is not caught by "account".
const SECTIONS: Record<string, Exclude<Access, "public">> = {
  account: "user",
  sell: "user",
  report: "user",
  admin: "admin",
};

export function requiredAccess(pathname: string): Access {
  const firstSegment = pathname.split("/")[1] ?? "";
  return SECTIONS[firstSegment] ?? "public";
}
