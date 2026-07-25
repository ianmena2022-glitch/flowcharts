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
      className="flex min-h-[46px] w-[150px] items-center justify-center rounded-lg border-2 px-3 py-2 text-center text-[11px] leading-tight"
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
