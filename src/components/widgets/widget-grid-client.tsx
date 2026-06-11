"use client";

import dynamic from "next/dynamic";

import { type ConnectionsByProvider } from "@/features/connections/queries";

const WidgetGrid = dynamic(() => import("@/components/widgets/widget-grid"), {
  ssr: false,
});

export function WidgetGridClient({
  accountEmail,
  accountName,
  accountAvatarUrl,
  userId,
  connections,
}: {
  accountEmail: string | null;
  accountName: string | null;
  accountAvatarUrl: string | null;
  userId: string | null;
  connections: ConnectionsByProvider;
}) {
  return (
    <WidgetGrid
      accountEmail={accountEmail}
      accountName={accountName}
      accountAvatarUrl={accountAvatarUrl}
      userId={userId}
      connections={connections}
    />
  );
}
