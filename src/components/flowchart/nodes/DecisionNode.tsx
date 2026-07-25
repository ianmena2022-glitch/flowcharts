import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { CATEGORY_CONFIG } from "@/lib/flowchart/categories";
import type { FlowchartNodeData } from "@/lib/flowchart/types";

export default function DecisionNode({
  data,
  selected,
}: NodeProps<Node<FlowchartNodeData>>) {
  const config = CATEGORY_CONFIG.decision;

  return (
    <div
      className="relative flex h-[96px] w-[120px] items-center justify-center text-center text-[10px] leading-tight"
      style={{
        backgroundColor: config.fill,
        border: `2px solid ${selected ? "#1e293b" : config.border}`,
        color: config.text,
        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
      }}
    >
      <Handle type="target" position={Position.Left} id="left" style={{ left: 0 }} />
      <Handle type="target" position={Position.Top} id="top" style={{ top: 0 }} />
      <span className="px-6">{data.label}</span>
      <Handle type="source" position={Position.Right} id="right" style={{ right: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ bottom: 0 }} />
    </div>
  );
}
