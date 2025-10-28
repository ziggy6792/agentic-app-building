import { type ZodTypeAny, type z } from 'zod';

export const parseResult = <T extends z.ZodSchema>(result: string, schema: T): z.infer<T> => {
  try {
    const parsedJson = JSON.parse(result.trim());
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return schema.parse(parsedJson);
    } catch (error) {
      throw new Error(`Failed to validate result against schema \n ERROR: ${JSON.stringify(error)} \n RESULT: ${result}`);
    }
  } catch (error) {
    throw new Error(`Failed to parse result as JSON \n ERROR: ${JSON.stringify(error)} \n RESULT: ${result}`);
  }
};

export function validateAndStringify<T extends ZodTypeAny>(schema: T, data: z.infer<T>): string {
  const validated = schema.parse(data);
  return JSON.stringify(validated, null, 2);
}
