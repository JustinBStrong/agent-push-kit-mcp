import { fromJsonSchema } from '@modelcontextprotocol/server';
import documentJson from './openapi.generated.json' with { type: 'json' };
export const openApi = documentJson;
export function locateOperation(operationId) {
    for (const [path, methods] of Object.entries(openApi.paths)) {
        for (const [method, operation] of Object.entries(methods)) {
            if (operation.operationId === operationId)
                return { method, path, operation };
        }
    }
    throw new Error(`OpenAPI operation not found: ${operationId}`);
}
export function operationInputSchema(operationId) {
    const { operation } = locateOperation(operationId);
    const properties = {};
    const required = new Set();
    for (const unresolved of operation.parameters ?? []) {
        const parameter = resolveComponent(unresolved, 'parameters');
        const name = String(parameter.name);
        properties[name] = parameter.schema ?? {};
        if (parameter.required === true)
            required.add(name);
    }
    if (operation.requestBody) {
        const body = resolveComponent(operation.requestBody, 'requestBodies');
        const content = body.content;
        const mediaType = content['application/json'];
        const schema = resolveSchema(mediaType.schema);
        Object.assign(properties, schema.properties ?? {});
        for (const name of schema.required ?? [])
            required.add(name);
    }
    return fromJsonSchema(rewriteRefs({
        type: 'object',
        additionalProperties: false,
        properties,
        ...(required.size ? { required: [...required] } : {}),
        $defs: openApi.components.schemas,
    }));
}
export function operationInputs(operationId) {
    const { operation } = locateOperation(operationId);
    const path = [];
    const query = [];
    for (const unresolved of operation.parameters ?? []) {
        const parameter = resolveComponent(unresolved, 'parameters');
        const name = String(parameter.name);
        if (parameter.in === 'path')
            path.push(name);
        if (parameter.in === 'query')
            query.push(name);
    }
    const body = [];
    if (operation.requestBody) {
        const requestBody = resolveComponent(operation.requestBody, 'requestBodies');
        const content = requestBody.content;
        const mediaType = content['application/json'];
        const schema = resolveSchema(mediaType.schema);
        body.push(...Object.keys(schema.properties ?? {}));
    }
    return { path, query, body };
}
function resolveComponent(value, section) {
    if (typeof value.$ref !== 'string')
        return value;
    const name = value.$ref.split('/').at(-1);
    const resolved = name ? openApi.components[section][name] : undefined;
    if (!resolved)
        throw new Error(`OpenAPI reference not found: ${String(value.$ref)}`);
    return resolved;
}
function resolveSchema(value) {
    if (typeof value.$ref !== 'string')
        return value;
    const name = value.$ref.split('/').at(-1);
    const resolved = name ? openApi.components.schemas[name] : undefined;
    if (!resolved)
        throw new Error(`OpenAPI schema not found: ${String(value.$ref)}`);
    return resolved;
}
function rewriteRefs(value) {
    if (Array.isArray(value))
        return value.map(rewriteRefs);
    if (!value || typeof value !== 'object')
        return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        key === '$ref' && typeof item === 'string'
            ? item.replace('#/components/schemas/', '#/$defs/')
            : rewriteRefs(item),
    ]));
}
//# sourceMappingURL=openapi.js.map