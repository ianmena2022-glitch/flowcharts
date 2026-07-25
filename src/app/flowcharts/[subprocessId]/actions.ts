"use server";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import type { FlowchartData } from "@/lib/flowchart/types";

const flowchartDataSchema = z.object({
  lanes: z.array(z.object({ id: z.string(), label: z.string(), order: z.number() })),
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
});

export async function saveFlowchart(subprocessId: string, data: FlowchartData) {
  await requireUser();
  const parsed = flowchartDataSchema.parse(data);

  await prisma.flowchart.update({
    where: { subprocessId },
    data: {
      lanes: parsed.lanes as Prisma.InputJsonValue,
      nodes: parsed.nodes as Prisma.InputJsonValue,
      edges: parsed.edges as Prisma.InputJsonValue,
    },
  });
}
