import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MoveFolderSelect from "@/components/MoveFolderSelect";
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
        <h1 className="text-xl font-semibold text-slate-900">Flowcharts</h1>
        <p className="text-sm text-slate-500">Documentá y organizá tus procesos.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Carpetas</h2>

        <form
          action={createFolder}
          className="flex gap-2 rounded-lg border border-slate-200 bg-white p-4"
        >
          <input
            name="name"
            required
            placeholder="Nombre de la carpeta"
            className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Nueva carpeta
          </button>
        </form>

        {folders.length > 0 && (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {folders.map((folder) => (
              <li key={folder.id}>
                <Link
                  href={`/carpetas/${folder.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-slate-900">📁 {folder.name}</span>
                  <span className="text-xs text-slate-500">
                    {folder._count.subprocesses} flowchart(s)
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Nuevo flowchart</h2>

        <form
          action={createFlowchart}
          className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4"
        >
          <input
            name="name"
            required
            placeholder="Nombre del flowchart"
            className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
          <select
            name="folderId"
            defaultValue=""
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
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
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Crear y abrir
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Sin carpeta</h2>

        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {ungrouped.map((sp) => (
            <li key={sp.id} className="flex items-center justify-between px-4 py-3">
              <Link
                href={`/flowcharts/${sp.id}`}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                {sp.name}
              </Link>
              <MoveFolderSelect subprocessId={sp.id} currentFolderId={null} folders={folders} />
            </li>
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
