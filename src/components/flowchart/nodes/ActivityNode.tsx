import { Handle, Position, NodeResizer, type NodeProps, type Node } from "@xyflow/react";
import { CATEGORY_CONFIG, NODE_WIDTH, NODE_HEIGHT } from "@/lib/flowchart/categories";
import type { FlowchartNodeData } from "@/lib/flowchart/types";
import EditableLabel from "./EditableLabel";
import type { NodeResizeHandlers } from "./resize";
import { SIDE_HANDLE_STYLE } from "./handleStyles";

export default function ActivityNode({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<Node<FlowchartNodeData>>) {
  const config = CATEGORY_CONFIG[data.category];
  const onLabelChange = data.onLabelChange as
    | ((nodeId: string, label: string) => void)
    | undefined;
  const { onResizeStart, onResize } = data as NodeResizeHandlers;
  // React Flow pasa width/height=0 (no null/undefined) antes de medir el
  // nodo por primera vez — `||` los trata como "todavía sin tamaño propio".
  const w = width || NODE_WIDTH.activity;
  const h = height || NODE_HEIGHT.activity;

  return (
    <div
      className="flex items-center justify-center rounded-lg border-2 px-3 py-2 text-center text-[11px] leading-snug"
      style={{
        width: w,
        height: h,
        backgroundColor: config.fill,
        borderColor: selected ? "#1e293b" : config.border,
        color: config.text,
      }}
    >
      <NodeResizer
        nodeId={id}
        isVisible={selected}
        minWidth={80}
        minHeight={32}
        onResizeStart={() => onResizeStart?.()}
        onResize={(_, params) => onResize?.(id, params.x, params.y, params.width, params.height)}
      />
      <Handle type="target" position={Position.Left} id="left" style={SIDE_HANDLE_STYLE.left} />
      <Handle type="target" position={Position.Top} id="top" style={SIDE_HANDLE_STYLE.top} />
      <EditableLabel label={data.label} onChange={(label) => onLabelChange?.(id, label)} />
      <Handle type="source" position={Position.Right} id="right" style={SIDE_HANDLE_STYLE.right} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={SIDE_HANDLE_STYLE.bottom} />
    </div>
  );
}
