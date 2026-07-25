import { requireUser } from "@/lib/auth/guards";

export default async function FlowchartsLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="h-screen w-screen overflow-hidden bg-slate-50">{children}</div>;
}
