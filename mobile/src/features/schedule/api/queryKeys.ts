export const scheduleKeys = {
  all: ["schedule"] as const,
  list: () => [...scheduleKeys.all, "list"] as const,
  today: () => [...scheduleKeys.all, "today"] as const,
};
