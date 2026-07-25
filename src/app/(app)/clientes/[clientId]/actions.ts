"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";

export async function createProject(clientId: string, formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return;

  await prisma.project.create({
    data: { clientId, name, description: description || null },
  });
  revalidatePath(`/clientes/${clientId}`);
}
