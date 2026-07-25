"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";

export async function createSubprocess(
  clientId: string,
  projectId: string,
  formData: FormData
) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const last = await prisma.subprocess.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
  });

  const subprocess = await prisma.subprocess.create({
    data: { projectId, name, order: (last?.order ?? -1) + 1 },
  });

  await prisma.flowchart.create({
    data: {
      subprocessId: subprocess.id,
      lanes: [{ id: "lane-1", label: "Puesto 1", order: 0 }],
      nodes: [],
      edges: [],
    },
  });

  revalidatePath(`/clientes/${clientId}/proyectos/${projectId}`);
}
