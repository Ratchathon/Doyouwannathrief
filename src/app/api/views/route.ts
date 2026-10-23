import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isBot, viewerHash } from "@/lib/views/views";

const COOKIE = "dywt_vid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Counts one view of an item. Always answers 204 once the body is valid, so callers learn nothing. */
export async function POST(request: Request): Promise<Response> {
  let productId: unknown;
  try {
    productId = ((await request.json()) as { productId?: unknown }).productId;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof productId !== "string" || !UUID.test(productId)) return new Response(null, { status: 400 });

  if (isBot(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });

  const jar = await cookies();
  let visitor = jar.get(COOKIE)?.value;
  if (!visitor || !UUID.test(visitor)) {
    visitor = crypto.randomUUID();
    jar.set(COOKIE, visitor, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: ONE_YEAR });
  }

  const supabase = await createClient();
  await supabase.rpc("record_product_view", { p_product_id: productId, p_viewer: await viewerHash(visitor) });
  return new Response(null, { status: 204 });
}
