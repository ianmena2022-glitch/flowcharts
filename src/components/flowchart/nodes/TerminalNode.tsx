import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { CATEGORY_CONFIG } from "@/lib/flowchart/categories";
import type { FlowchartNodeData } from "@/lib/flowchart/types";

export default function TerminalNode({
  data,
  selected,
}: NodeProps<Node<FlowchartNodeData>>) {
  const config = CATEGORY_CONFIG.terminal;

  return (
    <div
      className="flex h-[42px] w-[120px] items-center justify-center rounded-full border-2 px-3 text-center text-[11px]"
      style={{
        backgroundColor: config.fill,
        borderColor: selected ? "#1e293b" : config.border,
        color: config.text,
      }}
    >
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="target" position={Position.Top} id="top" />
      {data.label}
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
    </div>
  );
}
