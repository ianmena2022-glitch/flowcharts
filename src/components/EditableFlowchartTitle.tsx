"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameFlowchart } from "@/app/(app)/actions";

export default function EditableFlowchartTitle({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, setPending] = useState(false);

  async function commit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setValue(name);
      setEditing(false);
      return;
    }
    setPending(true);
    const formData = new FormData();
    formData.set("name", trimmed);
    await renameFlowchart(id, formData);
    setPending(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setValue(name);
            setEditing(false);
          }
        }}
        className="rounded-md border border-violet-500 bg-slate-950 px-1.5 py-0.5 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50"
      />
    );
  }

  return (
    <h1
      onDoubleClick={() => setEditing(true)}
      title="Doble click para renombrar"
      className="cursor-text rounded-md px-1.5 py-0.5 text-sm font-semibold text-slate-100 hover:bg-slate-800"
    >
      {name}
    </h1>
  );
}
