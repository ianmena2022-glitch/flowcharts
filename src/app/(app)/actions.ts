"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";

export async function createFolder(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.folder.create({ data: { name } });
  revalidatePath("/");
}

export async function renameFolder(folderId: string, formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.folder.update({ where: { id: folderId }, data: { name } });
  revalidatePath(`/carpetas/${folderId}`);
  revalidatePath("/");
}

export async function createFlowchart(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const folderId = String(formData.get("folderId") ?? "").trim() || undefined;
  if (!name) return;

  const subprocess = await prisma.subprocess.create({
    data: { folderId, name },
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

export async function moveFlowchartToFolder(subprocessId: string, folderId: string | null) {
  await requireUser();
  await prisma.subprocess.update({ where: { id: subprocessId }, data: { folderId } });
  revalidatePath("/");
}
