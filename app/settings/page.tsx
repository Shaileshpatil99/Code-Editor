import { currentUser } from "@/features/auth/action";
import { SettingsView } from "@/features/settings/components/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();

  return <SettingsView user={user} />;
}
