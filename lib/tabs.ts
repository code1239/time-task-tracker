export const TAB_IDS = ["dashboard", "focus", "notion"] as const;
export type TabId = (typeof TAB_IDS)[number];

export function isTabId(value: string | undefined): value is TabId {
  return TAB_IDS.some((id) => id === value);
}

/** v1 links (`?tab=clock`, `?tab=tasks`, `?tab=countdown`) land on their v2 homes. */
const LEGACY_TABS: Record<string, TabId> = { clock: "dashboard", tasks: "focus", countdown: "focus" };

export function resolveTab(value: string | undefined): TabId | undefined {
  if (!value) return undefined;
  if (isTabId(value)) return value;
  return LEGACY_TABS[value];
}
