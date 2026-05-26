/**
 * Zod validation schema for Munshi (Draft Agent) output.
 * Enforces constraints: complaintDocument string, documentStructure
 * with all required sections, optional hindiPrayerClause.
 */

import { z } from 'zod';

export const MunshiOutputSchema = z.object({
  complaintDocument: z.string().min(1),
  documentStructure: z.object({
    header: z.string().min(1),
    factsOfCase: z.string().min(1),
    legalGrounds: z.string().min(1),
    prayerClause: z.string().min(1),
    verification: z.string().min(1),
    hindiPrayerClause: z.string().min(1).optional(),
  }),
});

export type MunshiOutput = z.infer<typeof MunshiOutputSchema>;
