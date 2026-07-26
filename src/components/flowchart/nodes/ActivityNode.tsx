import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { CATEGORY_CONFIG } from "@/lib/flowchart/categories";
import type { FlowchartNodeData } from "@/lib/flowchart/types";
import EditableLabel from "./EditableLabel";

export default function ActivityNode({
  id,
  data,
  selected,
}: NodeProps<Node<FlowchartNodeData>>) {
  const config = CATEGORY_CONFIG[data.category];
  const onLabelChange = data.onLabelChange as
    | ((nodeId: string, label: string) => void)
    | undefined;

  return (
    <div
      className="flex min-h-[56px] w-[220px] items-center justify-center rounded-lg border-2 px-4 py-3 text-center text-[12px] leading-snug"
      style={{
        backgroundColor: config.fill,
        borderColor: selected ? "#1e293b" : config.border,
        color: config.text,
      }}
    >
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="target" position={Position.Top} id="top" />
      <EditableLabel label={data.label} onChange={(label) => onLabelChange?.(id, label)} />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
    </div>
  );
}
