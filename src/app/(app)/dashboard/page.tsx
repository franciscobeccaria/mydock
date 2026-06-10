import { connection } from "next/server";

import { PageContainer } from "@/components/layout/page-container";
import { WidgetGridClient } from "@/components/widgets/widget-grid-client";

export default async function DashboardPage() {
  await connection();

  return (
    <PageContainer>
      <WidgetGridClient />
    </PageContainer>
  );
}
