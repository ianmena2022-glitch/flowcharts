import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            Flowcharts
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-600">
            <Link href="/usuarios" className="hover:text-slate-900">
              Usuarios
            </Link>
            <span className="text-slate-400">{user.name}</span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
