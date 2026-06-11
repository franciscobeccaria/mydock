"use client";

import dynamic from "next/dynamic";

const WidgetGrid = dynamic(() => import("@/components/widgets/widget-grid"), {
  ssr: false,
});

export function WidgetGridClient({
  accountEmail,
  accountName,
  accountAvatarUrl,
  userId,
}: {
  accountEmail: string | null;
  accountName: string | null;
  accountAvatarUrl: string | null;
  userId: string | null;
}) {
  return (
    <WidgetGrid
      accountEmail={accountEmail}
      accountName={accountName}
      accountAvatarUrl={accountAvatarUrl}
      userId={userId}
    />
  );
}
