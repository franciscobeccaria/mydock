"use client";

import dynamic from "next/dynamic";

const WidgetGrid = dynamic(() => import("@/components/widgets/widget-grid"), {
  ssr: false,
});

export function WidgetGridClient({
  accountEmail,
  userId,
}: {
  accountEmail: string | null;
  userId: string | null;
}) {
  return <WidgetGrid accountEmail={accountEmail} userId={userId} />;
}
