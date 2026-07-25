import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "./actions";

export default async function DashboardPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Clientes</h1>
        <p className="text-sm text-slate-500">Organizá tus proyectos por cliente.</p>
      </div>

      <form action={createClient} className="flex gap-2">
        <input
          name="name"
          required
          placeholder="Nombre del cliente"
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
        {clients.map((client) => (
          <li key={client.id}>
            <Link
              href={`/clientes/${client.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <span className="text-sm font-medium text-slate-900">{client.name}</span>
              <span className="text-xs text-slate-500">{client._count.projects} proyecto(s)</span>
            </Link>
          </li>
        ))}
        {clients.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">Todavía no hay clientes.</li>
        )}
      </ul>
    </div>
  );
}
