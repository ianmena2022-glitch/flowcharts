"use server";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { flowchartDataSchema } from "@/lib/flowchart/schema";
import type { FlowchartData } from "@/lib/flowchart/types";

export async function saveFlowchart(subprocessId: string, data: FlowchartData) {
  await requireUser();
  const parsed = flowchartDataSchema.parse(data);

  await prisma.flowchart.update({
    where: { subprocessId },
    data: {
      lanes: parsed.lanes as Prisma.InputJsonValue,
      sections: (parsed.sections ?? []) as Prisma.InputJsonValue,
      nodes: parsed.nodes as Prisma.InputJsonValue,
      edges: parsed.edges as Prisma.InputJsonValue,
      orientation: parsed.orientation ?? "horizontal",
    },
  });
}
