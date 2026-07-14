import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      <AuthForm mode="login" />
    </div>
  );
}
