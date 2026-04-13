import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DemoNewPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lift.inteliflowai.com";

  const res = await fetch(`${baseUrl}/api/demo/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  if (!res.ok) redirect("/register");

  const { redirectUrl } = await res.json();
  redirect(redirectUrl);
}
