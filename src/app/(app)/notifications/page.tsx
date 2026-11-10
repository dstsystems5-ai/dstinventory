import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate, notifications } from "@/lib/demo-data";

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader title="Alerts" description="Stock, inbound, assignments, QuickBooks." />
      <ul className="space-y-3">
        {notifications.map((n) => (
          <li key={n.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-medium">{n.title}</p>
            <p className="text-sm text-slate-600">{n.body}</p>
            <p className="text-xs text-slate-400">{formatDate(n.createdAt)}</p>
            {n.actionUrl ? <Link href={n.actionUrl} className="text-sm text-amber-800">Open</Link> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
