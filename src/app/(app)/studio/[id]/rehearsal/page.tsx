import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getProject } from "@/lib/planningStore";
import { features } from "@/lib/env";
import { RehearsalStudio } from "@/components/planning/RehearsalStudio";

export const dynamic = "force-dynamic";

export default async function RehearsalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const project = await getProject(user.id, id);
  if (!project) notFound();

  const title = project.artifacts.plan?.titleCandidates?.[0] || project.title;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/studio/${id}`} className="btn-ghost px-2 py-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" /> 기획으로
        </Link>
        <Link href={`/studio/${id}/plan`} className="btn-outline px-3 py-2 text-sm">
          <FileText className="h-4 w-4" /> 사업계획서
        </Link>
      </div>
      <RehearsalStudio
        projectId={id}
        projectTitle={title}
        whisperAvailable={features.whisper}
        initial={project.rehearsals || []}
        hasPlan={!!project.artifacts.plan}
        announcementChars={project.artifacts.announcement?.length || 0}
        applicationChars={project.artifacts.application?.length || 0}
      />
    </div>
  );
}
