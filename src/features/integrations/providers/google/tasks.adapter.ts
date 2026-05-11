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
  }[];
};

export async function getGoogleTaskItems(userId?: string): Promise<WidgetItem[]> {
  if (!userId) {
    return googleTasksMockItems;
  }

  const taskLists = await googleApiFetch<TaskListsResponse>(
    userId,
    "https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=10",
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
      url.searchParams.set("maxResults", "5");

      const response = await googleApiFetch<TasksResponse>(userId, url);
      return (response.items ?? []).map((task) => ({
        ...task,
        listTitle: list.title ?? "Tasks",
      }));
    }),
  );

  return tasksByList
    .flat()
    .filter((task) => Boolean(task.title))
    .sort((a, b) => {
      const aTime = a.due ? new Date(a.due).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.due ? new Date(b.due).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .slice(0, 5)
    .map((task) => ({
      id: task.id ?? crypto.randomUUID(),
      provider: "google_tasks",
      title: task.title ?? "Untitled task",
      subtitle: task.listTitle,
      status: task.status ?? "needsAction",
      dueAt: task.due,
    }));
}
