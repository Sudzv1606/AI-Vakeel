/**
 * Zod validation schema for Nyayadoot (Review Agent) output.
 * Enforces constraints: qualityScore 0-100, approvalStatus enum,
 * issues array max 10 with deficiencyType enum.
 */

import { z } from 'zod';

export const NyayadootOutputSchema = z.object({
  qualityScore: z.number().int().min(0).max(100),
  approvalStatus: z.enum(['approved', 'needs_revision']),
  issues: z.array(
    z.object({
      section: z.string().min(1),
      deficiencyType: z.enum([
        'missing_element',
        'incorrect_reference',
        'formatting_error',
        'factual_inconsistency',
      ]),
      description: z.string().min(1),
      suggestedCorrection: z.string().min(1),
    })
  ).max(10),
  finalDocument: z.string().min(1),
});

export type NyayadootOutput = z.infer<typeof NyayadootOutputSchema>;
