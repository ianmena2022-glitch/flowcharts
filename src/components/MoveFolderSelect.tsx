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
      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-500"
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
