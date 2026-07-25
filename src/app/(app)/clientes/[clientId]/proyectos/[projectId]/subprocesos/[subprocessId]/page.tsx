import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FlowchartEditor from "@/components/flowchart/FlowchartEditor";
import { saveFlowchart } from "./actions";
import type { FlowchartData } from "@/lib/flowchart/types";

export default async function SubprocessEditorPage({
  params,
}: {
  params: Promise<{ clientId: string; projectId: string; subprocessId: string }>;
}) {
  const { clientId, projectId, subprocessId } = await params;

  const subprocess = await prisma.subprocess.findUnique({
    where: { id: subprocessId },
    include: { project: { include: { client: true } }, flowchart: true },
  });

  if (
    !subprocess ||
    subprocess.projectId !== projectId ||
    subprocess.project.clientId !== clientId ||
    !subprocess.flowchart
  ) {
    notFound();
  }

  const initialData: FlowchartData = {
    lanes: subprocess.flowchart.lanes as unknown as FlowchartData["lanes"],
    nodes: subprocess.flowchart.nodes as unknown as FlowchartData["nodes"],
    edges: subprocess.flowchart.edges as unknown as FlowchartData["edges"],
  };

  const handleSave = saveFlowchart.bind(null, subprocessId);

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <Link
          href={`/clientes/${clientId}/proyectos/${projectId}`}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          &larr; {subprocess.project.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{subprocess.name}</h1>
      </div>

      <FlowchartEditor initialData={initialData} onSave={handleSave} />
    </div>
  );
}
