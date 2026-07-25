import { z } from "zod";

export const laneSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number(),
});

export const flowchartDataSchema = z.object({
  lanes: z.array(laneSchema),
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
});

export type FlowchartDataInput = z.infer<typeof flowchartDataSchema>;
