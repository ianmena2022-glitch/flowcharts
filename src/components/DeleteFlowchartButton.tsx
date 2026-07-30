"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteFlowchart } from "@/app/(app)/actions";

export default function DeleteFlowchartButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    setPending(true);
    await deleteFlowchart(id);
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      title="Eliminar flowchart"
      className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
    >
      <Trash2 size={14} />
      Eliminar
    </button>
  );
}
