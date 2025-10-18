/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useCopilotAction as useRawCopilotAction } from '@copilotkit/react-core';
import type { ReactNode } from 'react';
import { z } from 'zod';

// Basic shape for CopilotKit parameter descriptors
// We intentionally keep this as a minimal structural type to avoid coupling to library internals
interface CopilotParameterDescriptor {
  name: string;
  type: string;
  description?: string;
  enum?: string[];
  attributes?: CopilotParameterDescriptor[];
}

type PrimitiveZod = z.ZodString | z.ZodNumber | z.ZodBoolean | z.ZodEnum<[string, ...string[]]>;

type ZodAnyObject = z.ZodObject<any, any, any, any>;

function isZodEnum(schema: z.ZodTypeAny): schema is z.ZodEnum<[string, ...string[]]> {
  return schema._def?.typeName === z.ZodFirstPartyTypeKind.ZodEnum;
}

function isZodObject(schema: z.ZodTypeAny): schema is ZodAnyObject {
  return schema._def?.typeName === z.ZodFirstPartyTypeKind.ZodObject;
}

function isZodArray(schema: z.ZodTypeAny): schema is z.ZodArray<z.ZodTypeAny> {
  return schema._def?.typeName === z.ZodFirstPartyTypeKind.ZodArray;
}

function isZodString(schema: z.ZodTypeAny): schema is z.ZodString {
  return schema._def?.typeName === z.ZodFirstPartyTypeKind.ZodString;
}

function isZodNumber(schema: z.ZodTypeAny): schema is z.ZodNumber {
  return schema._def?.typeName === z.ZodFirstPartyTypeKind.ZodNumber;
}

function isZodBoolean(schema: z.ZodTypeAny): schema is z.ZodBoolean {
  return schema._def?.typeName === z.ZodFirstPartyTypeKind.ZodBoolean;
}

function getZodDescription(schema: z.ZodTypeAny): string | undefined {
  // Zod stores .describe() on _def.description; some versions also expose .description
  return (schema as any).description ?? (schema as any)._def?.description;
}

function typeStringForPrimitive(schema: PrimitiveZod): string {
  if (isZodString(schema)) return 'string';
  if (isZodNumber(schema)) return 'number';
  if (isZodBoolean(schema)) return 'boolean';
  if (isZodEnum(schema)) return 'string';
  return 'string';
}

function descriptorForSchema(
  name: string,
  schema: z.ZodTypeAny,
  descriptions?: Record<string, string>,
  parentPath?: string
): CopilotParameterDescriptor {
  const fullPath = parentPath ? `${parentPath}.${name}` : name;
  const desc = descriptions?.[fullPath] ?? getZodDescription(schema);

  if (isZodEnum(schema)) {
    return {
      name,
      type: 'string',
      enum: [...schema._def.values],
      description: desc,
    };
  }

  if (isZodString(schema) || isZodNumber(schema) || isZodBoolean(schema)) {
    return {
      name,
      type: typeStringForPrimitive(schema as PrimitiveZod),
      description: desc,
    };
  }

  if (isZodArray(schema)) {
    const inner = schema.element;
    if (isZodObject(inner)) {
      // Array of objects
      return {
        name,
        type: 'object[]',
        description: desc,
        attributes: descriptorsForObject(inner, descriptions, fullPath),
      };
    }
    // Array of primitives or enums
    let type = 'string[]';
    if (isZodNumber(inner)) type = 'number[]';
    else if (isZodBoolean(inner)) type = 'boolean[]';
    else if (isZodEnum(inner)) type = 'string[]';
    return {
      name,
      type,
      description: desc,
    };
  }

  if (isZodObject(schema)) {
    return {
      name,
      type: 'object',
      description: desc,
      attributes: descriptorsForObject(schema, descriptions, fullPath),
    };
  }

  // Fallback
  return {
    name,
    type: 'string',
    description: desc,
  };
}

function descriptorsForObject(
  objectSchema: ZodAnyObject,
  descriptions?: Record<string, string>,
  parentPath?: string
): CopilotParameterDescriptor[] {
  const shape = objectSchema.shape;
  return Object.keys(shape).map((key) => descriptorForSchema(key, shape[key], descriptions, parentPath));
}

export function zodToCopilotParameters(
  schema: z.ZodTypeAny,
  options?: { descriptions?: Record<string, string>; rootName?: string }
): CopilotParameterDescriptor[] {
  const { descriptions, rootName } = options ?? {};
  if (isZodObject(schema)) {
    return descriptorsForObject(schema, descriptions);
  }
  const name = rootName ?? 'input';
  return [descriptorForSchema(name, schema, descriptions)];
}

export type ValidatedRenderContext<Args, Result = unknown> = {
  args: Args;
  result: Result | undefined;
  status: unknown;
};

export type ValidatedRenderAwaitContext<Args> = {
  args: Args;
  respond: (value: unknown) => void;
  status: unknown;
};

export type UseValidatedCopilotActionOptions<S extends z.ZodTypeAny, R = unknown> = {
  name: string;
  description?: string;
  schema: S;
  followUp?: boolean;
  parameterDescriptions?: Record<string, string>;
  rootName?: string;
  handler?: (args: z.infer<S>) => Promise<R> | R;
  render?: (ctx: ValidatedRenderContext<z.infer<S>, R>) => ReactNode;
  renderAndWaitForResponse?: (ctx: ValidatedRenderAwaitContext<z.infer<S>>) => ReactNode;
};

export function useValidatedCopilotAction<S extends z.ZodTypeAny, R = unknown>(options: UseValidatedCopilotActionOptions<S, R>): void {
  const { name, description, schema, followUp, parameterDescriptions, rootName, handler, render, renderAndWaitForResponse } = options;

  const parameters = zodToCopilotParameters(schema, {
    descriptions: parameterDescriptions,
    rootName,
  });

  useRawCopilotAction({
    name,
    description,
    parameters: parameters as any,
    followUp,
    handler: handler
      ? (rawArgs: unknown) => {
          const parsed = schema.parse(rawArgs);
          return (handler as (a: z.infer<S>) => any)(parsed);
        }
      : undefined,
    render: render
      ? ({ args, result, status }: any) => {
          const parsed = schema.safeParse(args);
          if (!parsed.success) return null;
          return (render as any)({ args: parsed.data, result, status });
        }
      : undefined,
    renderAndWaitForResponse: renderAndWaitForResponse
      ? ({ args, respond, status }: any) => {
          const parsed = schema.safeParse(args);
          if (!parsed.success) return null;
          return (renderAndWaitForResponse as any)({
            args: parsed.data,
            respond,
            status,
          });
        }
      : undefined,
  } as any);
}

// Optional: provide a re-export with the same name to encourage migration
export const useCopilotActionWithSchema = useValidatedCopilotAction;
