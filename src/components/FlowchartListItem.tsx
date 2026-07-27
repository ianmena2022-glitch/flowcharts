"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { renameFlowchart, deleteFlowchart } from "@/app/(app)/actions";
import MoveFolderSelect from "./MoveFolderSelect";

export default function FlowchartListItem({
  id,
  name,
  currentFolderId,
  folders,
}: {
  id: string;
  name: string;
  currentFolderId: string | null;
  folders: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, startTransition] = useTransition();

  function cancelEdit() {
    setValue(name);
    setEditing(false);
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      cancelEdit();
      return;
    }
    const formData = new FormData();
    formData.set("name", trimmed);
    startTransition(async () => {
      await renameFlowchart(id, formData);
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      await deleteFlowchart(id);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      {editing ? (
        <form onSubmit={handleRename} className="flex flex-1 items-center gap-1.5">
          <input
            autoFocus
            value={value}
            disabled={pending}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
            className="flex-1 rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
            title="Guardar"
          >
            <Check size={15} />
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={pending}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            title="Cancelar"
          >
            <X size={15} />
          </button>
        </form>
      ) : (
        <Link
          href={`/flowcharts/${id}`}
          className="flex-1 truncate text-sm font-medium text-slate-900 transition-colors hover:text-indigo-600"
        >
          {name}
        </Link>
      )}

      {!editing && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title="Renombrar"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      <MoveFolderSelect subprocessId={id} currentFolderId={currentFolderId} folders={folders} />
    </li>
  );
}
