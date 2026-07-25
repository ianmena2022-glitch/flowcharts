import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createProject } from "./actions";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      projects: {
        orderBy: { name: "asc" },
        include: { _count: { select: { subprocesses: true } } },
      },
    },
  });

  if (!client) notFound();

  const createProjectForClient = createProject.bind(null, client.id);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          &larr; Clientes
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{client.name}</h1>
        <p className="text-sm text-slate-500">Proyectos de este cliente.</p>
      </div>

      <form
        action={createProjectForClient}
        className="space-y-2 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div className="flex gap-2">
          <input
            name="name"
            required
            placeholder="Nombre del proyecto"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Agregar
          </button>
        </div>
        <input
          name="description"
          placeholder="Descripción (opcional)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </form>

      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {client.projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/clientes/${client.id}/proyectos/${project.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <span className="text-sm font-medium text-slate-900">{project.name}</span>
              <span className="text-xs text-slate-500">
                {project._count.subprocesses} subproceso(s)
              </span>
            </Link>
          </li>
        ))}
        {client.projects.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            Todavía no hay proyectos.
          </li>
        )}
      </ul>
    </div>
  );
}
