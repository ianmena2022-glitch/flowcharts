import { UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createTeamUser } from "./actions";

export default async function UsuariosPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Usuarios del equipo
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Todos los usuarios ven y editan los mismos clientes y proyectos.
        </p>
      </div>

      <form
        action={createTeamUser}
        className="grid gap-2 rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm sm:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <input
          name="name"
          required
          placeholder="Nombre"
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Contraseña (mín. 6)"
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          <UserPlus size={16} />
          Crear
        </button>
      </form>

      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900 shadow-sm">
        {users.map((user) => (
          <li key={user.id} className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2.5 text-sm font-medium text-slate-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-300">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              {user.name}
            </span>
            <span className="text-xs text-slate-500">{user.email}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
