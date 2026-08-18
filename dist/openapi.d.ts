import { type StandardSchemaWithJSON } from '@modelcontextprotocol/server';
type JsonRecord = Record<string, unknown>;
type Operation = {
    operationId: string;
    parameters?: JsonRecord[];
    requestBody?: JsonRecord;
};
export declare const openApi: {
    info: {
        version: string;
    };
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
export declare function locateOperation(operationId: string): LocatedOperation;
export declare function operationInputSchema(operationId: string): StandardSchemaWithJSON;
export declare function operationInputs(operationId: string): {
    path: string[];
    query: string[];
    body: string[];
};
export {};
