import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import InstallGuard from "./InstallGuard";
import QuickAddForm from "./QuickAddForm";

export const dynamic = "force-dynamic";

export default async function QuickAddPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [accountsResult, categoriesResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, account_type")
      .eq("user_id", user.id)
      .order("name"),

    supabase
      .from("categories")
      .select("id, name, type")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  if (accountsResult.error) {
    throw new Error(
      `Could not load accounts: ${accountsResult.error.message}`
    );
  }

  if (categoriesResult.error) {
    throw new Error(
      `Could not load categories: ${categoriesResult.error.message}`
    );
  }

  return (
    <InstallGuard>
      <QuickAddForm
        accounts={accountsResult.data ?? []}
        categories={categoriesResult.data ?? []}
      />
    </InstallGuard>
  );
}