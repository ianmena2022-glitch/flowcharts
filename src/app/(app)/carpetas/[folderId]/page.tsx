import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import FlowchartListItem from "@/components/FlowchartListItem";
import DeleteFolderButton from "@/components/DeleteFolderButton";
import { createFlowchart, renameFolder } from "../../actions";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;

  const [folder, folders] = await Promise.all([
    prisma.folder.findUnique({
      where: { id: folderId },
      include: { subprocesses: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.folder.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!folder) notFound();

  const renameFolderForThis = renameFolder.bind(null, folder.id);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft size={15} />
          Flowcharts
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <form action={renameFolderForThis} className="flex items-center gap-2">
            <input
              name="name"
              defaultValue={folder.name}
              className="rounded-md border border-transparent px-1 -ml-1 text-2xl font-semibold tracking-tight text-slate-900 outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Guardar nombre
            </button>
          </form>
          <DeleteFolderButton id={folder.id} name={folder.name} />
        </div>
      </div>

      <form
        action={createFlowchart}
        className="flex gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="folderId" value={folder.id} />
        <input
          name="name"
          required
          placeholder="Nombre del flowchart"
          className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <Plus size={16} />
          Crear y abrir
        </button>
      </form>

      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
        {folder.subprocesses.map((sp) => (
          <FlowchartListItem
            key={sp.id}
            id={sp.id}
            name={sp.name}
            currentFolderId={folder.id}
            folders={folders}
          />
        ))}
        {folder.subprocesses.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            Esta carpeta todavía no tiene flowcharts.
          </li>
        )}
      </ul>
    </div>
  );
}
