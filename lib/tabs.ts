export const TAB_IDS = ["clock", "tasks", "countdown", "notion"] as const;
export type TabId = (typeof TAB_IDS)[number];

export function isTabId(value: string | undefined): value is TabId {
  return TAB_IDS.some((id) => id === value);
}
