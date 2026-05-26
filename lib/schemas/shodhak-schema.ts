/**
 * Zod validation schema for Shodhak (Research Agent) output.
 * Enforces constraints: legalSections array with similarityScore,
 * searchMetadata with thresholdUsed and totalResultsFound.
 */

import { z } from 'zod';

export const ShodhakOutputSchema = z.object({
  legalSections: z.array(
    z.object({
      content: z.string().min(1),
      actName: z.string().min(1),
      sectionNumber: z.string().min(1),
      chapter: z.string().min(1),
      similarityScore: z.number().min(0).max(1),
    })
  ),
  searchMetadata: z.object({
    thresholdUsed: z.number().min(0).max(1),
    totalResultsFound: z.number().int().min(0),
  }),
});

export type ShodhakOutput = z.infer<typeof ShodhakOutputSchema>;
