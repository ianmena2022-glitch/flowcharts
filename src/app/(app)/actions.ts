"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import type { FlowchartDataInput } from "@/lib/flowchart/schema";

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

export async function deleteFolder(folderId: string) {
  await requireUser();
  // Los flowcharts adentro no se borran (onDelete: SetNull en Subprocess.folder),
  // solo quedan sin carpeta.
  await prisma.folder.delete({ where: { id: folderId } });
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

export async function renameFlowchart(subprocessId: string, formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const subprocess = await prisma.subprocess.update({
    where: { id: subprocessId },
    data: { name },
  });

  revalidatePath("/");
  revalidatePath(`/flowcharts/${subprocessId}`);
  if (subprocess.folderId) revalidatePath(`/carpetas/${subprocess.folderId}`);
}

export async function deleteFlowchart(subprocessId: string) {
  await requireUser();
  const subprocess = await prisma.subprocess.delete({ where: { id: subprocessId } });

  revalidatePath("/");
  if (subprocess.folderId) revalidatePath(`/carpetas/${subprocess.folderId}`);
}

export async function importFolder(
  folderName: string,
  items: { name: string; data: FlowchartDataInput }[]
) {
  await requireUser();
  if (items.length === 0) return;

  const folder = await prisma.folder.create({
    data: { name: folderName.trim() || "Importado" },
  });

  for (const item of items) {
    const subprocess = await prisma.subprocess.create({
      data: { folderId: folder.id, name: item.name },
    });
    await prisma.flowchart.create({
      data: {
        subprocessId: subprocess.id,
        lanes: item.data.lanes as Prisma.InputJsonValue,
        sections: (item.data.sections ?? []) as Prisma.InputJsonValue,
        nodes: item.data.nodes as Prisma.InputJsonValue,
        edges: item.data.edges as Prisma.InputJsonValue,
        orientation: item.data.orientation ?? "horizontal",
      },
    });
  }

  revalidatePath("/");
  redirect(`/carpetas/${folder.id}`);
}
