"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteFolder } from "@/app/(app)/actions";

export default function DeleteFolderButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !window.confirm(
        `¿Eliminar la carpeta "${name}"? Los flowcharts adentro no se borran, quedan sin carpeta.`
      )
    )
      return;
    setPending(true);
    await deleteFolder(id);
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      title="Eliminar carpeta"
      className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
    >
      <Trash2 size={14} />
    </button>
  );
}
