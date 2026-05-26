/**
 * Zod validation schema for Vivechak (Router Agent) output.
 * Enforces constraints: legalDomain enum, confidenceScore 0-1,
 * requiresUserConfirmation boolean.
 */

import { z } from 'zod';

export const VivechakOutputSchema = z.object({
  legalDomain: z.enum(['consumer_protection_2019', 'rera_2016', 'rti_2005']),
  forum: z.string().min(1),
  confidenceScore: z.number().min(0).max(1),
  requiresUserConfirmation: z.boolean(),
  reasoning: z.string().min(1),
});

export type VivechakOutput = z.infer<typeof VivechakOutputSchema>;
