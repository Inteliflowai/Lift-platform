import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roles } = await supabase
    .from("user_tenant_roles")
    .select("role")
    .eq("user_id", user.id);

  const roleOrder = [
    "platform_admin",
    "school_admin",
    "evaluator",
    "interviewer",
    "support",
  ];
  const userRoles = roles?.map((r) => r.role) ?? [];
  const primaryRole =
    roleOrder.find((r) => userRoles.includes(r)) ?? "school_admin";

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-white text-[#1a1a2e]">
      <Sidebar role={primaryRole} userName={profile?.full_name} />
      <div className="ml-60 flex min-h-screen flex-col">
        <TopBar
          email={user.email!}
          fullName={profile?.full_name}
          avatarUrl={profile?.avatar_url}
        />
        <main className="flex-1 bg-[#f8f8fa] p-6">{children}</main>
      </div>
    </div>
  );
}
