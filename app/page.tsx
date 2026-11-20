import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { Dashboard } from "@/components/dashboard";
import { isTabId } from "@/lib/tabs";
import type { Theme } from "@/components/theme-provider";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { tab } = await searchParams;
  const initialTab = typeof tab === "string" && isTabId(tab) ? tab : undefined;

  let themePreference: Theme | null = null;
  try {
    const rows = await query<{ ThemePreference: Theme | null }>(
      "SELECT ThemePreference FROM dbo.Users WHERE Id = @userId",
      { userId: session.userId }
    );
    themePreference = rows[0]?.ThemePreference ?? null;
  } catch {
    // The page still renders with the locally stored theme.
  }

  return (
    <Dashboard username={session.username} themePreference={themePreference} initialTab={initialTab} />
  );
}
