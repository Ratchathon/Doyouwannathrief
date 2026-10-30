"use client";

import { useEffect, useState } from "react";

async function defaultLoad(): Promise<number> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return 0;
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

/** Unread count beside the account icon, read in the browser so pages stay cacheable. */
export function NotificationDot({ load = defaultLoad }: { load?: () => Promise<number> }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let live = true;
    load()
      .then((n) => live && setCount(n))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [load]);
  if (count === 0) return null;
  return (
    <span className="wide absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center bg-magenta-strong px-1 text-[10px] leading-5 text-white">
      {count > 9 ? "9+" : count}
      <span className="sr-only"> การแจ้งเตือนใหม่</span>
    </span>
  );
}
