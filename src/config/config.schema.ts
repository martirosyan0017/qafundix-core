import { z } from 'zod';
import { ENVIRONMENTS } from '../types/common.types.js';

export const commonConfigSchema = z.object({
  environment: z.enum(ENVIRONMENTS),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),
});

export type ValidatedCommonConfig = z.infer<typeof commonConfigSchema>;
