/** Callbacks inyectados vía `data` para que cada nodo pueda pedirle al editor
 * que registre un checkpoint de historial (Ctrl+Z) antes de resizearse, y
 * que aplique el nuevo tamaño/posición al estado controlado de React Flow. */
export type NodeResizeHandlers = {
  onResizeStart?: () => void;
  onResize?: (nodeId: string, x: number, y: number, width: number, height: number) => void;
};
