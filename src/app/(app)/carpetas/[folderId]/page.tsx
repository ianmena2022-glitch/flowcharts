import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MoveFolderSelect from "@/components/MoveFolderSelect";
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
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          &larr; Flowcharts
        </Link>
        <form action={renameFolderForThis} className="mt-2 flex items-center gap-2">
          <input
            name="name"
            defaultValue={folder.name}
            className="text-xl font-semibold text-slate-900 outline-none focus:border-b focus:border-slate-400"
          />
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            Guardar nombre
          </button>
        </form>
      </div>

      <form
        action={createFlowchart}
        className="flex gap-2 rounded-lg border border-slate-200 bg-white p-4"
      >
        <input type="hidden" name="folderId" value={folder.id} />
        <input
          name="name"
          required
          placeholder="Nombre del flowchart"
          className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Crear y abrir
        </button>
      </form>

      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {folder.subprocesses.map((sp) => (
          <li key={sp.id} className="flex items-center justify-between px-4 py-3">
            <Link
              href={`/flowcharts/${sp.id}`}
              className="text-sm font-medium text-slate-900 hover:underline"
            >
              {sp.name}
            </Link>
            <MoveFolderSelect subprocessId={sp.id} currentFolderId={folder.id} folders={folders} />
          </li>
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
