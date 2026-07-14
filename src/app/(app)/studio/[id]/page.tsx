import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Presentation } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getProject } from "@/lib/planningStore";
import { PlanningWizard } from "@/components/planning/PlanningWizard";

export const dynamic = "force-dynamic";

export default async function StudioProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const project = await getProject(user.id, id);
  if (!project) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/studio" className="btn-ghost px-2 py-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" /> 프로젝트 목록
        </Link>
        {project.artifacts.plan && (
          <div className="flex gap-2">
            <Link href={`/studio/${id}/plan`} className="btn-outline px-3 py-2 text-sm">
              <FileText className="h-4 w-4" /> 사업계획서
            </Link>
            <Link href={`/studio/${id}/rehearsal`} className="btn-outline px-3 py-2 text-sm">
              <Presentation className="h-4 w-4" /> 발표연습
            </Link>
          </div>
        )}
      </div>
      <PlanningWizard project={project} />
    </div>
  );
}
