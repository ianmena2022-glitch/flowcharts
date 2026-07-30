import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import FlowchartEditor from "@/components/flowchart/FlowchartEditor";
import EditableFlowchartTitle from "@/components/EditableFlowchartTitle";
import DeleteFlowchartButton from "@/components/DeleteFlowchartButton";
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
    include: { folder: true, flowchart: true },
  });

  if (!subprocess || !subprocess.flowchart) notFound();

  const initialData: FlowchartData = {
    lanes: subprocess.flowchart.lanes as unknown as FlowchartData["lanes"],
    sections: subprocess.flowchart.sections as unknown as FlowchartData["sections"],
    nodes: subprocess.flowchart.nodes as unknown as FlowchartData["nodes"],
    edges: subprocess.flowchart.edges as unknown as FlowchartData["edges"],
    orientation: subprocess.flowchart.orientation as FlowchartData["orientation"],
  };

  const handleSave = saveFlowchart.bind(null, subprocessId);

  const context = subprocess.folder?.name;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 py-2">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-100"
        >
          <ArrowLeft size={15} />
          Flowcharts
        </Link>
        <span className="text-slate-700">|</span>
        <EditableFlowchartTitle id={subprocess.id} name={subprocess.name} />
        {context && <span className="text-xs text-slate-500">{context}</span>}
        <DeleteFlowchartButton id={subprocess.id} name={subprocess.name} />
      </div>
      <div className="flex-1">
        <FlowchartEditor title={subprocess.name} initialData={initialData} onSave={handleSave} />
      </div>
    </div>
  );
}
