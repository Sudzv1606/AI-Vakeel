/**
 * Zod validation schema for Arzdar (Intake Agent) output.
 * Enforces constraints: fields can be string or "not provided",
 * followUpQuestions max 3, originalLanguage enum ['en', 'hi'].
 *
 * Expanded schema includes:
 * - allOppositeParties: array of parties with role and liability type
 * - complainantAddress: address of complainant
 * - productName / productAmount: product details
 * - timeline: structured date+event pairs
 * - financialClaims: breakdown of refund, compensation, total
 * - missingFields: explicit list of what's missing
 */

import { z } from 'zod';

const OppositePartySchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  liabilityType: z.enum([
    'product_seller',
    'product_manufacturer',
    'service_provider',
    'other',
  ]),
});

const TimelineEventSchema = z.object({
  date: z.string().min(1),
  event: z.string().min(1),
});

const FinancialClaimsSchema = z.object({
  productRefund: z.number().nullable(),
  compensation: z.number().nullable(),
  total: z.number().nullable(),
});

export const ArzdarOutputSchema = z.object({
  complainantName: z.union([z.string().min(1), z.literal('not provided')]),
  complainantAddress: z.union([z.string().min(1), z.literal('not provided')]).optional(),
  allOppositeParties: z.array(OppositePartySchema).optional(),
  respondentName: z.union([z.string().min(1), z.literal('not provided')]),
  productName: z.union([z.string().min(1), z.literal('not provided')]).optional(),
  productAmount: z.number().nullable().optional(),
  incidentDates: z.union([z.array(z.string()), z.literal('not provided')]),
  timeline: z.array(TimelineEventSchema).optional(),
  grievanceSummary: z.union([z.string().min(1), z.literal('not provided')]),
  reliefSought: z.union([z.string().min(1), z.literal('not provided')]),
  financialClaims: FinancialClaimsSchema.optional(),
  originalLanguage: z.enum(['en', 'hi']),
  followUpQuestions: z.array(z.string()).max(3).optional(),
  extractionComplete: z.boolean(),
  missingFields: z.array(z.string()).optional(),
});

export type ArzdarOutput = z.infer<typeof ArzdarOutputSchema>;
