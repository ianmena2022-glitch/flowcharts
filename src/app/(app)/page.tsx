import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import FlowchartListItem from "@/components/FlowchartListItem";
import ImportFolderButton from "@/components/ImportFolderButton";
import DeleteFolderButton from "@/components/DeleteFolderButton";
import { createFolder, createFlowchart } from "./actions";

export default async function DashboardPage() {
  const [folders, ungrouped] = await Promise.all([
    prisma.folder.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { subprocesses: true } } },
    }),
    prisma.subprocess.findMany({
      where: { folderId: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Flowcharts</h1>
        <p className="mt-1 text-sm text-slate-400">Documentá y organizá tus procesos.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">Carpetas</h2>

        <div className="flex flex-wrap items-start gap-2 rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <form action={createFolder} className="flex flex-1 gap-2">
            <input
              name="name"
              required
              placeholder="Nombre de la carpeta"
              className="min-w-[200px] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
            >
              <Plus size={16} />
              Nueva carpeta
            </button>
          </form>

          <ImportFolderButton />
        </div>

        {folders.length > 0 && (
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900 shadow-sm">
            {folders.map((folder) => (
              <li
                key={folder.id}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-800/60"
              >
                <Link
                  href={`/carpetas/${folder.id}`}
                  className="flex flex-1 items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
                    <FolderOpen size={16} className="text-violet-400" />
                    {folder.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {folder._count.subprocesses} flowchart(s)
                  </span>
                </Link>
                <DeleteFolderButton id={folder.id} name={folder.name} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">Nuevo flowchart</h2>

        <form
          action={createFlowchart}
          className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm"
        >
          <input
            name="name"
            required
            placeholder="Nombre del flowchart"
            className="min-w-[200px] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
          />
          <select
            name="folderId"
            defaultValue=""
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
          >
            <option value="">Sin carpeta</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            <Plus size={16} />
            Crear y abrir
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">Sin carpeta</h2>

        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900 shadow-sm">
          {ungrouped.map((sp) => (
            <FlowchartListItem
              key={sp.id}
              id={sp.id}
              name={sp.name}
              currentFolderId={null}
              folders={folders}
            />
          ))}
          {ungrouped.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              Todavía no hay flowcharts sin carpeta.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
