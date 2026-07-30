"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { moveFlowchartToFolder } from "@/app/(app)/actions";

export default function MoveFolderSelect({
  subprocessId,
  currentFolderId,
  folders,
}: {
  subprocessId: string;
  currentFolderId: string | null;
  folders: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || null;
    setPending(true);
    try {
      await moveFlowchartToFolder(subprocessId, value);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <select
      defaultValue={currentFolderId ?? ""}
      onChange={handleChange}
      disabled={pending}
      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50"
    >
      <option value="">Sin carpeta</option>
      {folders.map((folder) => (
        <option key={folder.id} value={folder.id}>
          {folder.name}
        </option>
      ))}
    </select>
  );
}
