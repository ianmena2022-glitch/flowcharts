import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createFlowchart } from "./actions";

export default async function DashboardPage() {
  const subprocesses = await prisma.subprocess.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: { include: { client: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Flowcharts</h1>
        <p className="text-sm text-slate-500">Documentá y organizá tus procesos.</p>
      </div>

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
        <input
          name="client"
          placeholder="Cliente (opcional)"
          className="min-w-[160px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Crear y abrir
        </button>
      </form>

      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {subprocesses.map((sp) => (
          <li key={sp.id}>
            <Link
              href={`/flowcharts/${sp.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <span className="text-sm font-medium text-slate-900">{sp.name}</span>
              {sp.project?.client?.name && (
                <span className="text-xs text-slate-500">{sp.project.client.name}</span>
              )}
            </Link>
          </li>
        ))}
        {subprocesses.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            Todavía no hay flowcharts.
          </li>
        )}
      </ul>
    </div>
  );
}
