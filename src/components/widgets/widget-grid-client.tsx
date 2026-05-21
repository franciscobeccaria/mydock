"use client";

import dynamic from "next/dynamic";

const WidgetGrid = dynamic(() => import("@/components/widgets/widget-grid"), {
  ssr: false,
});

export function WidgetGridClient() {
  return <WidgetGrid />;
}
