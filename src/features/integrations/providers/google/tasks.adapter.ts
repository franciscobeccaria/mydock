import { googleTasksMockItems } from "@/features/integrations/mock/google-tasks.mock";
import { googleApiFetch } from "@/features/integrations/providers/google/client";
import type { WidgetItem } from "@/features/integrations/types";

type TaskListsResponse = {
  items?: {
    id: string;
    title?: string;
  }[];
};

type TasksResponse = {
  items?: {
    id: string;
    title?: string;
    due?: string;
    status?: string;
    updated?: string;
  }[];
};

export async function getGoogleTaskItems(userId?: string): Promise<WidgetItem[]> {
  if (!userId) {
    return googleTasksMockItems;
  }

  const taskLists = await googleApiFetch<TaskListsResponse>(
    userId,
    "https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=20",
  );

  const lists = taskLists.items ?? [];

  if (lists.length === 0) {
    return [];
  }

  const tasksByList = await Promise.all(
    lists.map(async (list) => {
      const url = new URL(
        `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks`,
      );
      url.searchParams.set("showCompleted", "false");
      url.searchParams.set("showHidden", "false");
      url.searchParams.set("maxResults", "100");

      const response = await googleApiFetch<TasksResponse>(userId, url);
      return (response.items ?? []).map((task) => ({
        ...task,
        listTitle: list.title ?? "Tasks",
      }));
    }),
  );

  const allTasks = tasksByList.flat().filter((task) => Boolean(task.title));

  // The Google Tasks API exposes no "starred" status (it's a UI-only smart
  // list), so the widget filters by real task list. We sort newest-first by
  // `updated`, the only recency signal the API returns.
  return allTasks
    .sort((a, b) => {
      const aTime = a.updated ? new Date(a.updated).getTime() : 0;
      const bTime = b.updated ? new Date(b.updated).getTime() : 0;
      return bTime - aTime;
    })
    .map((task) => ({
      id: task.id ?? crypto.randomUUID(),
      provider: "google_tasks",
      title: task.title ?? "Untitled task",
      subtitle: task.listTitle,
      status: task.status ?? "needsAction",
      dueAt: task.due,
      occurredAt: task.updated,
      metadata: {
        list: task.listTitle,
      },
    }));
}
