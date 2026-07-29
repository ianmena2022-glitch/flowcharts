"use client";

import { useRef, useState } from "react";
import { FolderInput } from "lucide-react";
import { flowchartDataSchema } from "@/lib/flowchart/schema";
import { importFolder } from "@/app/(app)/actions";

type FileWithRelativePath = File & { webkitRelativePath?: string };

export default function ImportFolderButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []) as FileWithRelativePath[];
    event.target.value = "";
    const jsonFiles = files.filter((f) => f.name.toLowerCase().endsWith(".json"));

    if (jsonFiles.length === 0) {
      setError("La carpeta elegida no tiene archivos .json.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const folderName = jsonFiles[0].webkitRelativePath?.split("/")[0] || "Importado";
      const items: { name: string; data: import("@/lib/flowchart/schema").FlowchartDataInput }[] = [];
      const invalid: string[] = [];

      for (const file of jsonFiles) {
        try {
          const text = await file.text();
          const parsed = flowchartDataSchema.safeParse(JSON.parse(text));
          if (!parsed.success) {
            invalid.push(file.name);
            continue;
          }
          items.push({ name: file.name.replace(/\.json$/i, ""), data: parsed.data });
        } catch {
          invalid.push(file.name);
        }
      }

      if (items.length === 0) {
        setError("Ningún archivo tenía el formato de flowchart esperado.");
        return;
      }
      if (invalid.length > 0) {
        setError(`Se importaron ${items.length} de ${jsonFiles.length}. No se pudo leer: ${invalid.join(", ")}`);
      }

      await importFolder(folderName, items);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/json"
        className="hidden"
        onChange={handleChange}
        {...{ webkitdirectory: "", directory: "" }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
      >
        <FolderInput size={16} />
        {pending ? "Importando..." : "Importar carpeta"}
      </button>
      {error && <p className="max-w-sm text-xs text-red-600">{error}</p>}
    </div>
  );
}
