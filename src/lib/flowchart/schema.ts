import { z } from "zod";

export const laneSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number(),
  thickness: z.number().optional(),
});

export const sectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number(),
  length: z.number().optional(),
});

export const flowchartDataSchema = z.object({
  lanes: z.array(laneSchema),
  sections: z.array(sectionSchema).optional(),
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
  orientation: z.enum(["horizontal", "vertical"]).optional(),
});

export type FlowchartDataInput = z.infer<typeof flowchartDataSchema>;
