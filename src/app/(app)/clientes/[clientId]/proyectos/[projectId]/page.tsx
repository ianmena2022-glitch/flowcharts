import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSubprocess } from "./actions";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ clientId: string; projectId: string }>;
}) {
  const { clientId, projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      subprocesses: { orderBy: { order: "asc" } },
    },
  });

  if (!project || project.clientId !== clientId) notFound();

  const createSubprocessForProject = createSubprocess.bind(null, clientId, projectId);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/clientes/${clientId}`}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          &larr; {project.client.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{project.name}</h1>
        {project.description && (
          <p className="text-sm text-slate-500">{project.description}</p>
        )}
      </div>

      <form action={createSubprocessForProject} className="flex gap-2">
        <input
          name="name"
          required
          placeholder="Nombre del subproceso"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Agregar
        </button>
      </form>

      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {project.subprocesses.map((sp) => (
          <li key={sp.id}>
            <Link
              href={`/clientes/${clientId}/proyectos/${projectId}/subprocesos/${sp.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <span className="text-sm font-medium text-slate-900">{sp.name}</span>
              <span className="text-xs text-slate-500">Abrir editor →</span>
            </Link>
          </li>
        ))}
        {project.subprocesses.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            Todavía no hay subprocesos.
          </li>
        )}
      </ul>
    </div>
  );
}
