import { Handle, Position, NodeResizer, type NodeProps, type Node } from "@xyflow/react";
import { CATEGORY_CONFIG, NODE_WIDTH, NODE_HEIGHT } from "@/lib/flowchart/categories";
import type { FlowchartNodeData } from "@/lib/flowchart/types";
import EditableLabel from "./EditableLabel";
import type { NodeResizeHandlers } from "./resize";

export default function DecisionNode({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<Node<FlowchartNodeData>>) {
  const config = CATEGORY_CONFIG.decision;
  const onLabelChange = data.onLabelChange as
    | ((nodeId: string, label: string) => void)
    | undefined;
  const { onResizeStart, onResize } = data as NodeResizeHandlers;
  const w = width || NODE_WIDTH.decision;
  const h = height || NODE_HEIGHT.decision;

  return (
    <div
      className="relative flex items-center justify-center text-center text-[10px] leading-snug"
      style={{
        width: w,
        height: h,
        backgroundColor: config.fill,
        border: `2px solid ${selected ? "#1e293b" : config.border}`,
        color: config.text,
        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
      }}
    >
      <NodeResizer
        nodeId={id}
        isVisible={selected}
        minWidth={100}
        minHeight={70}
        onResizeStart={() => onResizeStart?.()}
        onResize={(_, params) => onResize?.(id, params.x, params.y, params.width, params.height)}
      />
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
