"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";

export async function createFlowchart(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("client") ?? "").trim();
  if (!name) return;

  let projectId: string | undefined;

  if (clientName) {
    const client =
      (await prisma.client.findFirst({ where: { name: clientName } })) ??
      (await prisma.client.create({ data: { name: clientName } }));

    const project =
      (await prisma.project.findFirst({ where: { clientId: client.id } })) ??
      (await prisma.project.create({ data: { clientId: client.id, name: "General" } }));

    projectId = project.id;
  }

  const subprocess = await prisma.subprocess.create({
    data: { projectId, name },
  });

  await prisma.flowchart.create({
    data: {
      subprocessId: subprocess.id,
      lanes: [{ id: "lane-1", label: "Puesto 1", order: 0 }],
      nodes: [],
      edges: [],
    },
  });

  redirect(`/flowcharts/${subprocess.id}`);
}
