import { McpServer } from '@modelcontextprotocol/server';
type ToolInput = Record<string, unknown>;
export interface AgentPushKitClientOptions {
    token: string;
    apiBase?: string;
    fetch?: typeof globalThis.fetch;
}
export declare class AgentPushKitClient {
    private readonly token;
    private readonly apiBase;
    private readonly fetchImplementation;
    constructor(options: AgentPushKitClientOptions);
    call(operationId: string, input: ToolInput): Promise<unknown>;
    private string;
    private parse;
}
export declare function createAgentPushKitServer(client: AgentPushKitClient): McpServer;
export declare const agentPushKitToolNames: string[];
export {};
