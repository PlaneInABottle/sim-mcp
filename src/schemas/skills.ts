/**
 * Skills Schemas
 *
 * Type definitions for skills in the sim API.
 */

import { z } from 'zod';

/**
 * Schema for a skill from the API
 */
export const SkillSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string(),
  content: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Schema for skill input (for create/update)
 */
export const SkillInputSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  description: z.string().min(1).max(1024),
  content: z.string().min(1).max(50000),
});

/**
 * Inferred types from schemas
 */
export type Skill = z.infer<typeof SkillSchema>;
export type SkillInput = z.infer<typeof SkillInputSchema>;
