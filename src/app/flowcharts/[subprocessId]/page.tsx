import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FlowchartEditor from "@/components/flowchart/FlowchartEditor";
import { saveFlowchart } from "./actions";
import type { FlowchartData } from "@/lib/flowchart/types";

export default async function FlowchartEditorPage({
  params,
}: {
  params: Promise<{ subprocessId: string }>;
}) {
  const { subprocessId } = await params;

  const subprocess = await prisma.subprocess.findUnique({
    where: { id: subprocessId },
    include: { project: { include: { client: true } }, flowchart: true },
  });

  if (!subprocess || !subprocess.flowchart) notFound();

  const initialData: FlowchartData = {
    lanes: subprocess.flowchart.lanes as unknown as FlowchartData["lanes"],
    nodes: subprocess.flowchart.nodes as unknown as FlowchartData["nodes"],
    edges: subprocess.flowchart.edges as unknown as FlowchartData["edges"],
  };

  const handleSave = saveFlowchart.bind(null, subprocessId);

  const context = [subprocess.project?.client?.name, subprocess.project?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Flowcharts
        </Link>
        <span className="text-slate-300">|</span>
        <h1 className="text-sm font-semibold text-slate-900">{subprocess.name}</h1>
        {context && <span className="text-xs text-slate-400">{context}</span>}
      </div>
      <div className="flex-1">
        <FlowchartEditor title={subprocess.name} initialData={initialData} onSave={handleSave} />
      </div>
    </div>
  );
}
