import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { CATEGORY_CONFIG } from "@/lib/flowchart/categories";
import type { FlowchartNodeData } from "@/lib/flowchart/types";
import EditableLabel from "./EditableLabel";

export default function DecisionNode({
  id,
  data,
  selected,
}: NodeProps<Node<FlowchartNodeData>>) {
  const config = CATEGORY_CONFIG.decision;
  const onLabelChange = data.onLabelChange as
    | ((nodeId: string, label: string) => void)
    | undefined;

  return (
    <div
      className="relative flex h-[110px] w-[170px] items-center justify-center text-center text-[10px] leading-snug"
      style={{
        backgroundColor: config.fill,
        border: `2px solid ${selected ? "#1e293b" : config.border}`,
        color: config.text,
        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
      }}
    >
      <Handle type="target" position={Position.Left} id="left" style={{ left: 0 }} />
      <Handle type="target" position={Position.Top} id="top" style={{ top: 0 }} />
      <EditableLabel
        label={data.label}
        onChange={(label) => onLabelChange?.(id, label)}
        className="px-6"
      />
      <Handle type="source" position={Position.Right} id="right" style={{ right: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ bottom: 0 }} />
    </div>
  );
}
