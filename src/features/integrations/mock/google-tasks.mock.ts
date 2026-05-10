import type { WidgetItem } from "@/features/integrations/types";

export const googleTasksMockItems: WidgetItem[] = [
  {
    id: "task-1",
    provider: "google_tasks",
    title: "Review PR feedback",
    subtitle: "Engineering",
    status: "Due today",
    dueAt: "2026-05-10T21:00:00.000Z",
  },
  {
    id: "task-2",
    provider: "google_tasks",
    title: "Prepare Q2 roadmap",
    subtitle: "Product",
    status: "Tomorrow",
    dueAt: "2026-05-11T15:00:00.000Z",
  },
  {
    id: "task-3",
    provider: "google_tasks",
    title: "Follow up with design team",
    subtitle: "Design",
    status: "May 17",
    dueAt: "2026-05-17T13:00:00.000Z",
  },
  {
    id: "task-4",
    provider: "google_tasks",
    title: "Customer interviews",
    subtitle: "Research",
    status: "May 20",
    dueAt: "2026-05-20T16:00:00.000Z",
  },
];
