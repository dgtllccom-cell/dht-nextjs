import { NewAccountSetup } from "@/features/accounts/components/new-account-setup";
import { getRequestLanguage } from "@/lib/i18n/server";

export default async function NewAccountPage() {
  const lang = await getRequestLanguage();
  return <NewAccountSetup lang={lang} />;
}
