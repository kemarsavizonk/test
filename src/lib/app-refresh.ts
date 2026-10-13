export const APP_REFRESH = "kemtech-app-refresh";
export type AppRefreshEvent = CustomEvent<{ waitUntil: (task: Promise<unknown>) => void }>;

export async function refreshAppData() {
  const tasks: Promise<unknown>[] = [];
  window.dispatchEvent(new CustomEvent(APP_REFRESH, {
    detail: { waitUntil: (task: Promise<unknown>) => tasks.push(task) },
  }));
  await Promise.allSettled(tasks);
}
