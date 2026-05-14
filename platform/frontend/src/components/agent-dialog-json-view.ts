import type { AgentScope, AgentToolAssignmentMode, AgentType } from "@shared";
import type { ProfileLabel } from "@/components/agent-labels";

export type ToolExposureMode = "full" | "search_and_run_only";

export interface AgentJsonFormState {
  name: string;
  icon: string | null;
  description: string;
  systemPrompt: string;
  suggestedPrompts: Array<{ summaryTitle: string; prompt: string }>;
  selectedDelegationTargetIds: string[];
  assignedTeamIds: string[];
  labels: ProfileLabel[];
  considerContextUntrusted: boolean;
  llmApiKeyId: string | null;
  llmModel: string | null;
  identityProviderId: string | null | undefined;
  scope: AgentScope;
  knowledgeBaseIds: string[];
  connectorIds: string[];
  autoConfigureOnToolDiscovery: boolean;
  dualLlmMaxRounds: string;
  passthroughHeaders: string[];
  toolAssignmentMode: AgentToolAssignmentMode;
  toolExposureMode: ToolExposureMode;
}

export interface AgentJsonLookups {
  agentType: AgentType;
  isBuiltIn: boolean;
  isPolicyConfigBuiltIn: boolean;
  isDualLlmMainBuiltIn: boolean;
  teams: Array<{ id: string; name: string }>;
  knowledgeBases: Array<{ id: string; name: string }>;
  connectors: Array<{ id: string; name: string; connectorType?: string }>;
  delegationTargets: Array<{ id: string; name: string }>;
  currentAgentTools: Array<{ toolName: string; catalogName: string | null }>;
}

const SCHEMA_VERSION = "1";

export const AGENT_JSON_MODEL_PATH = "agent-edit.json";

export const AGENT_JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Agent",
  type: "object",
  required: ["version", "agent"],
  additionalProperties: false,
  properties: {
    version: {
      const: SCHEMA_VERSION,
      description: "Schema version. Only '1' is supported.",
    },
    agent: {
      type: "object",
      required: ["name", "agentType"],
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          minLength: 1,
          description: "Display name for the agent",
        },
        agentType: {
          enum: ["agent", "profile", "mcp_gateway", "llm_proxy"],
          description: "Entity type. Cannot be changed via JSON edit.",
        },
        description: {
          type: ["string", "null"],
          description: "Short description shown next to the name.",
        },
        systemPrompt: {
          type: ["string", "null"],
          description:
            "Instruction / system prompt sent to the LLM (Agent only).",
        },
        icon: { type: ["string", "null"] },
        scope: {
          enum: ["personal", "team", "org"],
          description: "Access scope. 'team' requires assignments in 'teams'.",
        },
        considerContextUntrusted: { type: "boolean" },
        toolAssignmentMode: {
          enum: ["manual", "automatic"],
          description: "'automatic' assigns tools by matching labels.",
        },
        toolExposureMode: {
          enum: ["full", "search_and_run_only"],
          description:
            "'search_and_run_only' exposes only search/run wrappers.",
        },
        llmModel: { type: ["string", "null"] },
        llmApiKeyId: { type: ["string", "null"] },
        identityProviderId: { type: ["string", "null"] },
        passthroughHeaders: {
          type: ["array", "null"],
          items: { type: "string" },
        },
        autoConfigureOnToolDiscovery: {
          type: "boolean",
          description: "Policy-config built-in agent only.",
        },
        dualLlmMaxRounds: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          description: "Dual-LLM main built-in agent only.",
        },
      },
    },
    teams: {
      type: "array",
      description: "Teams that can access this agent (scope='team').",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      },
    },
    labels: {
      type: "array",
      items: {
        type: "object",
        required: ["key", "value"],
        properties: {
          key: { type: "string" },
          value: { type: "string" },
        },
      },
    },
    suggestedPrompts: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        required: ["summaryTitle", "prompt"],
        properties: {
          summaryTitle: { type: "string", maxLength: 50 },
          prompt: { type: "string", maxLength: 5000 },
        },
      },
    },
    tools: {
      type: "array",
      description:
        "Read-only. Tool changes via JSON are ignored; edit in Form view.",
      items: {
        type: "object",
        properties: {
          toolName: { type: "string" },
          catalogName: { type: ["string", "null"] },
        },
      },
    },
    delegations: {
      type: "array",
      description: "Subagents this agent can delegate to (by name).",
      items: {
        type: "object",
        required: ["targetAgentName"],
        properties: { targetAgentName: { type: "string" } },
      },
    },
    knowledgeBases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      },
    },
    connectors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          connectorType: {
            enum: [
              "jira",
              "confluence",
              "github",
              "gitlab",
              "servicenow",
              "notion",
              "sharepoint",
              "gdrive",
              "file_upload",
              "dropbox",
              "onedrive",
              "asana",
              "linear",
              "outline",
              "salesforce",
            ],
          },
        },
      },
    },
  },
} as const;

export function serializeFormStateToJson(
  state: AgentJsonFormState,
  lookups: AgentJsonLookups,
): string {
  const teamsById = new Map(lookups.teams.map((t) => [t.id, t.name]));
  const kbById = new Map(lookups.knowledgeBases.map((k) => [k.id, k.name]));
  const connectorById = new Map(lookups.connectors.map((c) => [c.id, c]));
  const agentById = new Map(
    lookups.delegationTargets.map((a) => [a.id, a.name]),
  );

  const agent: Record<string, unknown> = {
    name: state.name,
    agentType: lookups.agentType,
    description: state.description.trim() ? state.description : null,
    systemPrompt: state.systemPrompt.trim() ? state.systemPrompt : null,
    icon: state.icon,
    scope: state.scope,
    considerContextUntrusted: state.considerContextUntrusted,
    toolAssignmentMode: state.toolAssignmentMode,
    toolExposureMode: state.toolExposureMode,
    llmModel: state.llmModel,
    llmApiKeyId: state.llmApiKeyId,
    identityProviderId: state.identityProviderId ?? null,
    passthroughHeaders:
      state.passthroughHeaders.length > 0 ? state.passthroughHeaders : null,
  };

  if (lookups.isPolicyConfigBuiltIn) {
    agent.autoConfigureOnToolDiscovery = state.autoConfigureOnToolDiscovery;
  }
  if (lookups.isDualLlmMainBuiltIn) {
    const parsed = Number.parseInt(state.dualLlmMaxRounds, 10);
    agent.dualLlmMaxRounds = Number.isFinite(parsed) ? parsed : 5;
  }

  const payload = {
    version: SCHEMA_VERSION,
    agent,
    teams: state.assignedTeamIds.map((id) => ({
      id,
      name: teamsById.get(id),
    })),
    labels: state.labels.map((l) => ({ key: l.key, value: l.value })),
    suggestedPrompts: state.suggestedPrompts.map((p) => ({
      summaryTitle: p.summaryTitle,
      prompt: p.prompt,
    })),
    tools: lookups.currentAgentTools,
    delegations: state.selectedDelegationTargetIds.map((id) => ({
      targetAgentName: agentById.get(id) ?? id,
    })),
    knowledgeBases: state.knowledgeBaseIds.map((id) => ({
      id,
      name: kbById.get(id),
    })),
    connectors: state.connectorIds.map((id) => {
      const c = connectorById.get(id);
      return {
        id,
        name: c?.name,
        connectorType: c?.connectorType,
      };
    }),
  };

  return JSON.stringify(payload, null, 2);
}

export type ParseResult =
  | { ok: true; state: AgentJsonFormState; warnings: string[] }
  | { ok: false; error: string };

export function parseFormStateFromJson(
  raw: string,
  current: AgentJsonFormState,
  lookups: AgentJsonLookups,
): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid JSON";
    return { ok: false, error: `Invalid JSON: ${msg}` };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "Top-level value must be an object" };
  }

  if (parsed.version !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported version "${String(parsed.version)}". Only "${SCHEMA_VERSION}" is supported.`,
    };
  }

  if (!isRecord(parsed.agent)) {
    return { ok: false, error: "Missing or invalid 'agent' object" };
  }

  const a = parsed.agent;
  if (typeof a.name !== "string" || !a.name.trim()) {
    return { ok: false, error: "'agent.name' is required" };
  }

  const warnings: string[] = [];
  const next: AgentJsonFormState = { ...current };

  next.name = a.name;
  if (a.icon === null || typeof a.icon === "string") next.icon = a.icon;
  if (a.description === null) next.description = "";
  else if (typeof a.description === "string") next.description = a.description;
  if (a.systemPrompt === null) next.systemPrompt = "";
  else if (typeof a.systemPrompt === "string")
    next.systemPrompt = a.systemPrompt;
  if (a.scope === "personal" || a.scope === "team" || a.scope === "org") {
    next.scope = a.scope;
  }
  if (typeof a.considerContextUntrusted === "boolean")
    next.considerContextUntrusted = a.considerContextUntrusted;
  if (a.toolAssignmentMode === "manual" || a.toolAssignmentMode === "automatic")
    next.toolAssignmentMode = a.toolAssignmentMode;
  if (
    a.toolExposureMode === "full" ||
    a.toolExposureMode === "search_and_run_only"
  )
    next.toolExposureMode = a.toolExposureMode;
  if (a.llmModel === null || typeof a.llmModel === "string")
    next.llmModel = a.llmModel;
  if (a.llmApiKeyId === null || typeof a.llmApiKeyId === "string")
    next.llmApiKeyId = a.llmApiKeyId;
  if (a.identityProviderId === null || typeof a.identityProviderId === "string")
    next.identityProviderId = a.identityProviderId;
  if (a.passthroughHeaders === null) next.passthroughHeaders = [];
  else if (
    Array.isArray(a.passthroughHeaders) &&
    a.passthroughHeaders.every((h) => typeof h === "string")
  ) {
    next.passthroughHeaders = a.passthroughHeaders as string[];
  }

  if (
    lookups.isPolicyConfigBuiltIn &&
    typeof a.autoConfigureOnToolDiscovery === "boolean"
  ) {
    next.autoConfigureOnToolDiscovery = a.autoConfigureOnToolDiscovery;
  }
  if (
    lookups.isDualLlmMainBuiltIn &&
    typeof a.dualLlmMaxRounds === "number" &&
    Number.isFinite(a.dualLlmMaxRounds)
  ) {
    next.dualLlmMaxRounds = String(a.dualLlmMaxRounds);
  }

  if (Array.isArray(parsed.suggestedPrompts)) {
    next.suggestedPrompts = parsed.suggestedPrompts.flatMap((item) => {
      if (!isRecord(item)) return [];
      const title =
        typeof item.summaryTitle === "string" ? item.summaryTitle : "";
      const prompt = typeof item.prompt === "string" ? item.prompt : "";
      return [{ summaryTitle: title, prompt }];
    });
  }

  if (Array.isArray(parsed.labels)) {
    next.labels = parsed.labels.flatMap((item) => {
      if (!isRecord(item)) return [];
      if (typeof item.key !== "string" || typeof item.value !== "string")
        return [];
      return [{ key: item.key, value: item.value }];
    });
  }

  if (Array.isArray(parsed.teams)) {
    const teamsByName = new Map(
      lookups.teams.map((t) => [t.name.toLowerCase(), t.id]),
    );
    const teamIds = new Set(lookups.teams.map((t) => t.id));
    const resolved: string[] = [];
    for (const item of parsed.teams) {
      if (typeof item === "string") {
        if (teamIds.has(item)) resolved.push(item);
        else warnings.push(`Unknown team "${item}"`);
        continue;
      }
      if (!isRecord(item)) continue;
      if (typeof item.id === "string" && teamIds.has(item.id)) {
        resolved.push(item.id);
        continue;
      }
      if (typeof item.name === "string") {
        const id = teamsByName.get(item.name.toLowerCase());
        if (id) {
          resolved.push(id);
          continue;
        }
        warnings.push(`Unknown team "${item.name}"`);
      }
    }
    next.assignedTeamIds = resolved;
  }

  if (Array.isArray(parsed.knowledgeBases)) {
    const kbByName = new Map(
      lookups.knowledgeBases.map((k) => [k.name.toLowerCase(), k.id]),
    );
    const kbIds = new Set(lookups.knowledgeBases.map((k) => k.id));
    const resolved: string[] = [];
    for (const item of parsed.knowledgeBases) {
      if (!isRecord(item)) continue;
      if (typeof item.id === "string" && kbIds.has(item.id)) {
        resolved.push(item.id);
        continue;
      }
      if (typeof item.name === "string") {
        const id = kbByName.get(item.name.toLowerCase());
        if (id) {
          resolved.push(id);
          continue;
        }
        warnings.push(`Unknown knowledge base "${item.name}"`);
      }
    }
    next.knowledgeBaseIds = resolved;
  }

  if (Array.isArray(parsed.connectors)) {
    const connByName = new Map(
      lookups.connectors.map((c) => [c.name.toLowerCase(), c.id]),
    );
    const connIds = new Set(lookups.connectors.map((c) => c.id));
    const resolved: string[] = [];
    for (const item of parsed.connectors) {
      if (!isRecord(item)) continue;
      if (typeof item.id === "string" && connIds.has(item.id)) {
        resolved.push(item.id);
        continue;
      }
      if (typeof item.name === "string") {
        const id = connByName.get(item.name.toLowerCase());
        if (id) {
          resolved.push(id);
          continue;
        }
        warnings.push(`Unknown connector "${item.name}"`);
      }
    }
    next.connectorIds = resolved;
  }

  if (Array.isArray(parsed.delegations)) {
    const agentByName = new Map(
      lookups.delegationTargets.map((x) => [x.name.toLowerCase(), x.id]),
    );
    const resolved: string[] = [];
    for (const item of parsed.delegations) {
      if (!isRecord(item)) continue;
      const name =
        typeof item.targetAgentName === "string" ? item.targetAgentName : null;
      if (!name) continue;
      const id = agentByName.get(name.toLowerCase());
      if (id) resolved.push(id);
      else warnings.push(`Unknown subagent "${name}"`);
    }
    next.selectedDelegationTargetIds = resolved;
  }

  if (
    Array.isArray(parsed.tools) &&
    !arrayShallowEqualByToolName(parsed.tools, lookups.currentAgentTools)
  ) {
    warnings.push(
      "Tool changes via JSON are ignored — edit tools in Form view.",
    );
  }

  return { ok: true, state: next, warnings };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayShallowEqualByToolName(
  fromJson: unknown[],
  current: Array<{ toolName: string; catalogName: string | null }>,
): boolean {
  if (fromJson.length !== current.length) return false;
  const seen = new Set(
    current.map((t) => `${t.catalogName ?? ""}::${t.toolName}`),
  );
  for (const item of fromJson) {
    if (!isRecord(item)) return false;
    const key = `${typeof item.catalogName === "string" ? item.catalogName : ""}::${
      typeof item.toolName === "string" ? item.toolName : ""
    }`;
    if (!seen.has(key)) return false;
  }
  return true;
}
