import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

export function convertZodSchema(zodSchema: z.ZodTypeAny): object {
  return zodToJsonSchema(zodSchema, { 
    target: 'jsonSchema7',
    $refStrategy: 'none'
  });
}