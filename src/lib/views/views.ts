/** Crawlers, link previews and headless browsers should not count as views. */
const BOT = /bot|crawl|spider|slurp|preview|externalhit|headless|lighthouse|pingdom|monitor|curl|wget|python|httpclient|axios|node-fetch/i;

export function isBot(userAgent: string): boolean {
  return userAgent.trim() === "" || BOT.test(userAgent);
}

/** The view log keeps only a digest of the visitor's random cookie id. */
export async function viewerHash(id: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`dywt-view:${id}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
