import { requiredAccess } from "@/lib/auth/access";
import { safeNextPath } from "@/lib/auth/redirect";

export type GateResult = { type: "continue" } | { type: "redirect"; to: string };

const SIGN_IN_PAGES = new Set(["/login", "/signup"]);

/**
 * Decides what the proxy does with a request, before any page renders.
 * Only signed-in vs signed-out is decided here. Admin pages are left to the
 * admin layout, which answers not-found to everyone who is not an admin, so
 * the admin area's existence is never confirmed by a redirect.
 */
export function gate(request: { pathname: string; search: string; signedIn: boolean }): GateResult {
  const { pathname, search, signedIn } = request;

  if (signedIn && SIGN_IN_PAGES.has(pathname)) {
    const next = new URLSearchParams(search).get("next");
    return { type: "redirect", to: safeNextPath(next) };
  }

  if (!signedIn && requiredAccess(pathname) === "user") {
    return { type: "redirect", to: `/login?next=${encodeURIComponent(pathname + search)}` };
  }

  return { type: "continue" };
}
