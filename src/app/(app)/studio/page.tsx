import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listProjects } from "@/lib/planningStore";
import { StudioList } from "@/components/planning/StudioList";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const projects = await listProjects(user.id);
  return <StudioList initial={projects} />;
}
