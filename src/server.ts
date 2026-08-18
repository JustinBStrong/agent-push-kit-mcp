import {
  type CallToolResult,
  McpServer,
  type ToolAnnotations,
} from '@modelcontextprotocol/server';
import { locateOperation, openApi, operationInputSchema, operationInputs } from './openapi.js';

type ToolInput = Record<string, unknown>;

export interface AgentPushKitClientOptions {
  token: string;
  apiBase?: string;
  fetch?: typeof globalThis.fetch;
}

export class AgentPushKitClient {
  private readonly token: string;
  private readonly apiBase: string;
  private readonly fetchImplementation: typeof globalThis.fetch;

  constructor(options: AgentPushKitClientOptions) {
    if (!options.token.startsWith('apt_')) {
      throw new Error('AGENT_PUSH_KIT_TOKEN must be an agent token beginning with apt_.');
    }
    this.token = options.token;
    this.apiBase = (options.apiBase ?? 'https://api.chatdna.co/agent-push-kit/v1').replace(/\/$/, '');
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
  }

  async call(operationId: string, input: ToolInput): Promise<unknown> {
    const located = locateOperation(operationId);
    const inputs = operationInputs(operationId);
    let path = located.path;
    for (const name of inputs.path) {
      path = path.replace(`{${name}}`, encodeURIComponent(this.string(input[name], name)));
    }
    const url = new URL(`${this.apiBase}${path}`);
    for (const name of inputs.query) {
      const value = input[name];
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(name, String(value));
    }
    const body = Object.fromEntries(
      inputs.body.filter((name) => input[name] !== undefined).map((name) => [name, input[name]]),
    );
    const response = await this.fetchImplementation(url, {
      method: located.method.toUpperCase(),
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(inputs.body.length ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(inputs.body.length ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    const payload = text ? this.parse(text) : null;
    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && 'message' in payload
          ? String((payload as { message: unknown }).message)
          : text || response.statusText;
      throw new Error(`Agent Push Kit returned ${response.status}: ${message}`);
    }
    return payload;
  }

  private string(value: unknown, name: string): string {
    if (typeof value !== 'string') throw new Error(`${name} must be a string.`);
    return value;
  }

  private parse(value: string): unknown {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
}

const READ_ONLY: ToolAnnotations = { readOnlyHint: true };
const MUTATING: ToolAnnotations = { readOnlyHint: false, idempotentHint: false };
const IDEMPOTENT: ToolAnnotations = { readOnlyHint: false, idempotentHint: true };
const DESTRUCTIVE: ToolAnnotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: true };

const tools: Array<{
  name: string;
  operationId: string;
  description: string;
  annotations: ToolAnnotations;
}> = [
  { name: 'get_account', operationId: 'getCurrentAccount', description: 'Get the current user and customer accounts.', annotations: READ_ONLY },
  { name: 'delete_account', operationId: 'deleteCurrentAccount', description: 'Permanently delete this user and every customer account they own.', annotations: DESTRUCTIVE },
  { name: 'list_customer_accounts', operationId: 'listOrganizations', description: 'List customer accounts available to this user.', annotations: READ_ONLY },
  { name: 'create_customer_account', operationId: 'createOrganization', description: 'Create another customer account and reveal its ingestion key once.', annotations: MUTATING },
  { name: 'add_member', operationId: 'addOrganizationMember', description: 'Add an already-registered user to a customer account.', annotations: MUTATING },
  { name: 'list_members', operationId: 'listOrganizationMembers', description: 'List members of a customer account.', annotations: READ_ONLY },
  { name: 'regenerate_ingestion_key', operationId: 'regenerateOrganizationApiKey', description: 'Rotate an application ingestion key immediately.', annotations: DESTRUCTIVE },
  { name: 'list_agent_tokens', operationId: 'listAgentTokens', description: 'List agent tokens without their secrets.', annotations: READ_ONLY },
  { name: 'create_agent_token', operationId: 'createAgentToken', description: 'Create another named agent token and reveal it once.', annotations: MUTATING },
  { name: 'revoke_agent_token', operationId: 'revokeAgentToken', description: 'Revoke an agent token immediately.', annotations: DESTRUCTIVE },
  { name: 'send_event', operationId: 'sendEventAsUser', description: 'Store a notification and attempt eligible pushes.', annotations: MUTATING },
  { name: 'list_events', operationId: 'listEvents', description: 'List a paginated inbox with simple filters.', annotations: READ_ONLY },
  { name: 'search_events', operationId: 'searchEvents', description: 'Search notifications with an AND, OR, and NOT filter tree.', annotations: READ_ONLY },
  { name: 'get_event', operationId: 'getEvent', description: 'Get one notification including metadata.', annotations: READ_ONLY },
  { name: 'list_services', operationId: 'listServices', description: 'List discovered services.', annotations: READ_ONLY },
  { name: 'list_notification_types', operationId: 'listNotificationTypes', description: 'List exact notification types.', annotations: READ_ONLY },
  { name: 'list_push_preferences', operationId: 'listPreferences', description: 'Read service defaults and exact-type overrides.', annotations: READ_ONLY },
  { name: 'set_service_push', operationId: 'setServicePreference', description: 'Set a service push default.', annotations: IDEMPOTENT },
  { name: 'set_type_push', operationId: 'setTypePreference', description: 'Set an exact notification-type override.', annotations: IDEMPOTENT },
  { name: 'remove_type_push_override', operationId: 'removeTypePreference', description: 'Restore inheritance for an exact type.', annotations: IDEMPOTENT },
  { name: 'register_device', operationId: 'registerDevice', description: 'Register or refresh an APNs installation.', annotations: IDEMPOTENT },
  { name: 'remove_device', operationId: 'removeDevice', description: 'Disable an APNs installation.', annotations: DESTRUCTIVE },
  { name: 'get_browser_push_configuration', operationId: 'getWebPushConfiguration', description: 'Get browser push availability and its public VAPID key.', annotations: READ_ONLY },
  { name: 'register_browser_push_subscription', operationId: 'registerWebPushSubscription', description: 'Register or refresh a browser push subscription.', annotations: IDEMPOTENT },
  { name: 'remove_browser_push_subscription', operationId: 'removeWebPushSubscription', description: 'Disable a browser push subscription.', annotations: DESTRUCTIVE }
];

export function createAgentPushKitServer(client: AgentPushKitClient): McpServer {
  const server = new McpServer(
    { name: 'agent-push-kit', version: openApi.info.version },
    { instructions: 'Complete Agent Push Kit access for the user represented by AGENT_PUSH_KIT_TOKEN.' },
  );
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: operationInputSchema(tool.operationId),
        annotations: tool.annotations,
      },
      async (input) => result(await client.call(tool.operationId, input as ToolInput)),
    );
  }
  return server;
}

export const agentPushKitToolNames = tools.map((tool) => tool.name);

function result(value: unknown): CallToolResult {
  const structuredContent =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : { result: value };
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent,
  };
}
