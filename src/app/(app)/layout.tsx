import Link from "next/link";
import { Workflow } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow-[0_0_16px_-2px_rgba(139,92,246,0.6)]">
              <Workflow size={18} strokeWidth={2.25} />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-100">
              Flowcharts
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-slate-400">
            <Link href="/usuarios" className="transition-colors hover:text-violet-300">
              Usuarios
            </Link>
            <span className="hidden text-slate-700 sm:inline">|</span>
            <span className="hidden text-slate-500 sm:inline">{user.name}</span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
