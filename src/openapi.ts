import { fromJsonSchema, type JsonSchemaType, type StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import documentJson from './openapi.generated.json' with { type: 'json' };

type JsonRecord = Record<string, unknown>;
type Operation = {
  operationId: string;
  parameters?: JsonRecord[];
  requestBody?: JsonRecord;
};

export const openApi = documentJson as unknown as {
  info: { version: string };
  paths: Record<string, Record<string, Operation>>;
  components: {
    parameters: Record<string, JsonRecord>;
    requestBodies: Record<string, JsonRecord>;
    schemas: Record<string, JsonRecord>;
  };
};

export interface LocatedOperation {
  method: string;
  path: string;
  operation: Operation;
}

export function locateOperation(operationId: string): LocatedOperation {
  for (const [path, methods] of Object.entries(openApi.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (operation.operationId === operationId) return { method, path, operation };
    }
  }
  throw new Error(`OpenAPI operation not found: ${operationId}`);
}

export function operationInputSchema(operationId: string): StandardSchemaWithJSON {
  const { operation } = locateOperation(operationId);
  const properties: Record<string, unknown> = {};
  const required = new Set<string>();
  for (const unresolved of operation.parameters ?? []) {
    const parameter = resolveComponent(unresolved, 'parameters');
    const name = String(parameter.name);
    properties[name] = parameter.schema ?? {};
    if (parameter.required === true) required.add(name);
  }
  if (operation.requestBody) {
    const body = resolveComponent(operation.requestBody, 'requestBodies');
    const content = body.content as JsonRecord;
    const mediaType = content['application/json'] as JsonRecord;
    const schema = resolveSchema(mediaType.schema as JsonRecord);
    Object.assign(properties, (schema.properties as JsonRecord | undefined) ?? {});
    for (const name of (schema.required as string[] | undefined) ?? []) required.add(name);
  }
  return fromJsonSchema(
    rewriteRefs({
      type: 'object',
      additionalProperties: false,
      properties,
      ...(required.size ? { required: [...required] } : {}),
      $defs: openApi.components.schemas,
    }) as JsonSchemaType,
  );
}

export function operationInputs(operationId: string): {
  path: string[];
  query: string[];
  body: string[];
} {
  const { operation } = locateOperation(operationId);
  const path: string[] = [];
  const query: string[] = [];
  for (const unresolved of operation.parameters ?? []) {
    const parameter = resolveComponent(unresolved, 'parameters');
    const name = String(parameter.name);
    if (parameter.in === 'path') path.push(name);
    if (parameter.in === 'query') query.push(name);
  }
  const body: string[] = [];
  if (operation.requestBody) {
    const requestBody = resolveComponent(operation.requestBody, 'requestBodies');
    const content = requestBody.content as JsonRecord;
    const mediaType = content['application/json'] as JsonRecord;
    const schema = resolveSchema(mediaType.schema as JsonRecord);
    body.push(...Object.keys((schema.properties as JsonRecord | undefined) ?? {}));
  }
  return { path, query, body };
}

function resolveComponent(value: JsonRecord, section: 'parameters' | 'requestBodies'): JsonRecord {
  if (typeof value.$ref !== 'string') return value;
  const name = value.$ref.split('/').at(-1);
  const resolved = name ? openApi.components[section][name] : undefined;
  if (!resolved) throw new Error(`OpenAPI reference not found: ${String(value.$ref)}`);
  return resolved;
}

function resolveSchema(value: JsonRecord): JsonRecord {
  if (typeof value.$ref !== 'string') return value;
  const name = value.$ref.split('/').at(-1);
  const resolved = name ? openApi.components.schemas[name] : undefined;
  if (!resolved) throw new Error(`OpenAPI schema not found: ${String(value.$ref)}`);
  return resolved;
}

function rewriteRefs(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(rewriteRefs);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as JsonRecord).map(([key, item]) => [
      key,
      key === '$ref' && typeof item === 'string'
        ? item.replace('#/components/schemas/', '#/$defs/')
        : rewriteRefs(item),
    ]),
  );
}
