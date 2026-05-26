/**
 * Zod validation schema for Arzdar (Intake Agent) output.
 * Enforces constraints: fields can be string or "not provided",
 * followUpQuestions max 3, originalLanguage enum ['en', 'hi'].
 */

import { z } from 'zod';

export const ArzdarOutputSchema = z.object({
  complainantName: z.union([z.string().min(1), z.literal('not provided')]),
  respondentName: z.union([z.string().min(1), z.literal('not provided')]),
  incidentDates: z.union([z.array(z.string()), z.literal('not provided')]),
  grievanceSummary: z.union([z.string().min(1), z.literal('not provided')]),
  reliefSought: z.union([z.string().min(1), z.literal('not provided')]),
  originalLanguage: z.enum(['en', 'hi']),
  followUpQuestions: z.array(z.string()).max(3).optional(),
  extractionComplete: z.boolean(),
});

export type ArzdarOutput = z.infer<typeof ArzdarOutputSchema>;
