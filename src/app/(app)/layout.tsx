import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav user={user} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
