import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod';

export function convertZodSchema(zodSchema: z.ZodTypeAny): object {
  const jsonSchema = zodToJsonSchema(zodSchema, { 
    target: 'jsonSchema7',
    $refStrategy: 'none'
  });
  
  // Ensure the schema has the correct type field for MCP compatibility
  if (typeof jsonSchema === 'object' && jsonSchema !== null) {
    return {
      ...jsonSchema,
      type: 'object' // MCP SDK expects inputSchema.type to be 'object'
    };
  }
  
  // Fallback for edge cases
  return {
    type: 'object',
    properties: {},
    additionalProperties: false
  };
}