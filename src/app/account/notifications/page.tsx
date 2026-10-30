import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/guards";
import { markNotificationsRead } from "@/lib/trade/actions";
import { getNotifications } from "@/lib/trade/data";

export const metadata: Metadata = { title: "Notifications" };

const date = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

async function NotificationsContent() {
  await requireUser("/account/notifications");
  const items = await getNotifications();
  if (items.length === 0) return <p className="text-muted">ยังไม่มีการแจ้งเตือน</p>;
  const unread = items.filter((n) => !n.read).length;
  return (
    <div>
      {unread > 0 && (
        <form action={markNotificationsRead} className="mb-4">
          <button type="submit" className="btn-outline h-10 px-4 text-[11px]">
            MARK ALL READ ({unread})
          </button>
        </form>
      )}
      <ul className="border-t-2 border-print">
        {items.map((n) => (
          <li key={n.id}>
            <Link href={n.href} className={`flex items-start gap-3 border-b border-print py-4 hover:text-magenta-strong ${n.read ? "" : "font-semibold"}`}>
              <span aria-hidden="true" className={`mt-2 size-2.5 shrink-0 ${n.read ? "" : "bg-magenta"}`} />
              <span className="flex flex-col">
                {!n.read && <span className="sr-only">ยังไม่อ่าน</span>}
                <span>{n.body}</span>
                <span className="text-sm font-normal text-muted">{date.format(new Date(n.createdAt))}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <PageShell title="NOTIFICATIONS">
      <Suspense fallback={<FormSkeleton />}>
        <NotificationsContent />
      </Suspense>
    </PageShell>
  );
}
