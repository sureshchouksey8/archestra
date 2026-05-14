import { describe, expect, it } from "vitest";
import {
  type AgentJsonFormState,
  type AgentJsonLookups,
  parseFormStateFromJson,
  serializeFormStateToJson,
} from "./agent-dialog-json-view";

function baseState(
  overrides: Partial<AgentJsonFormState> = {},
): AgentJsonFormState {
  return {
    name: "My Assistant",
    icon: null,
    description: "Your personal chat assistant",
    systemPrompt: "Be helpful",
    suggestedPrompts: [{ summaryTitle: "Hi", prompt: "Say hi" }],
    selectedDelegationTargetIds: ["agent-2"],
    assignedTeamIds: ["team-1"],
    labels: [{ key: "env", value: "prod" }],
    considerContextUntrusted: false,
    llmApiKeyId: "key-1",
    llmModel: "gpt-5",
    identityProviderId: undefined,
    scope: "personal",
    knowledgeBaseIds: ["kb-1"],
    connectorIds: ["conn-1"],
    autoConfigureOnToolDiscovery: false,
    dualLlmMaxRounds: "5",
    passthroughHeaders: [],
    toolAssignmentMode: "manual",
    toolExposureMode: "full",
    ...overrides,
  };
}

function baseLookups(
  overrides: Partial<AgentJsonLookups> = {},
): AgentJsonLookups {
  return {
    agentType: "agent",
    isBuiltIn: false,
    isPolicyConfigBuiltIn: false,
    isDualLlmMainBuiltIn: false,
    teams: [
      { id: "team-1", name: "Alpha" },
      { id: "team-2", name: "Beta" },
    ],
    knowledgeBases: [
      { id: "kb-1", name: "Docs" },
      { id: "kb-2", name: "Wiki" },
    ],
    connectors: [
      { id: "conn-1", name: "Slack", connectorType: "linear" },
      { id: "conn-2", name: "GitHub", connectorType: "github" },
    ],
    delegationTargets: [
      { id: "agent-2", name: "Researcher" },
      { id: "agent-3", name: "Editor" },
    ],
    currentAgentTools: [{ toolName: "search_repos", catalogName: "github" }],
    ...overrides,
  };
}

describe("serializeFormStateToJson", () => {
  it("produces a version-1 payload with all sections", () => {
    const json = serializeFormStateToJson(baseState(), baseLookups());
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe("1");
    expect(parsed.agent.name).toBe("My Assistant");
    expect(parsed.agent.agentType).toBe("agent");
    expect(parsed.agent.systemPrompt).toBe("Be helpful");
    expect(parsed.agent.scope).toBe("personal");
    expect(parsed.agent.passthroughHeaders).toBeNull();
    expect(parsed.teams).toEqual([{ id: "team-1", name: "Alpha" }]);
    expect(parsed.knowledgeBases).toEqual([{ id: "kb-1", name: "Docs" }]);
    expect(parsed.connectors[0]).toMatchObject({
      id: "conn-1",
      name: "Slack",
      connectorType: "linear",
    });
    expect(parsed.delegations).toEqual([{ targetAgentName: "Researcher" }]);
    expect(parsed.tools).toEqual([
      { toolName: "search_repos", catalogName: "github" },
    ]);
  });

  it("omits built-in-only fields when not applicable", () => {
    const json = serializeFormStateToJson(baseState(), baseLookups());
    const parsed = JSON.parse(json);
    expect(parsed.agent.autoConfigureOnToolDiscovery).toBeUndefined();
    expect(parsed.agent.dualLlmMaxRounds).toBeUndefined();
  });

  it("includes dualLlmMaxRounds as a number for dual-llm-main built-in", () => {
    const json = serializeFormStateToJson(
      baseState({ dualLlmMaxRounds: "12" }),
      baseLookups({ isDualLlmMainBuiltIn: true, isBuiltIn: true }),
    );
    const parsed = JSON.parse(json);
    expect(parsed.agent.dualLlmMaxRounds).toBe(12);
  });

  it("nulls empty description and system prompt", () => {
    const json = serializeFormStateToJson(
      baseState({ description: "  ", systemPrompt: "" }),
      baseLookups(),
    );
    const parsed = JSON.parse(json);
    expect(parsed.agent.description).toBeNull();
    expect(parsed.agent.systemPrompt).toBeNull();
  });
});

describe("parseFormStateFromJson", () => {
  it("rejects invalid JSON", () => {
    const r = parseFormStateFromJson("{bad", baseState(), baseLookups());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Invalid JSON/);
  });

  it("rejects wrong version", () => {
    const r = parseFormStateFromJson(
      JSON.stringify({ version: "2", agent: { name: "x" } }),
      baseState(),
      baseLookups(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/version/);
  });

  it("requires agent.name", () => {
    const r = parseFormStateFromJson(
      JSON.stringify({ version: "1", agent: { name: "" } }),
      baseState(),
      baseLookups(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/name/i);
  });

  it("round-trips a serialized state", () => {
    const initial = baseState();
    const lookups = baseLookups();
    const json = serializeFormStateToJson(initial, lookups);
    const r = parseFormStateFromJson(json, initial, lookups);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.name).toBe(initial.name);
      expect(r.state.assignedTeamIds).toEqual(initial.assignedTeamIds);
      expect(r.state.knowledgeBaseIds).toEqual(initial.knowledgeBaseIds);
      expect(r.state.connectorIds).toEqual(initial.connectorIds);
      expect(r.state.selectedDelegationTargetIds).toEqual(
        initial.selectedDelegationTargetIds,
      );
      expect(r.state.labels).toEqual(initial.labels);
      expect(r.state.suggestedPrompts).toEqual(initial.suggestedPrompts);
    }
  });

  it("resolves teams, knowledge bases, connectors, and delegations by name", () => {
    const json = JSON.stringify({
      version: "1",
      agent: { name: "Test", agentType: "agent", scope: "personal" },
      teams: [{ name: "Beta" }],
      knowledgeBases: [{ name: "wiki" }],
      connectors: [{ name: "github" }],
      delegations: [{ targetAgentName: "editor" }],
    });
    const r = parseFormStateFromJson(json, baseState(), baseLookups());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.assignedTeamIds).toEqual(["team-2"]);
      expect(r.state.knowledgeBaseIds).toEqual(["kb-2"]);
      expect(r.state.connectorIds).toEqual(["conn-2"]);
      expect(r.state.selectedDelegationTargetIds).toEqual(["agent-3"]);
    }
  });

  it("warns on unresolved references", () => {
    const json = JSON.stringify({
      version: "1",
      agent: { name: "Test" },
      teams: [{ name: "Unknown" }],
      delegations: [{ targetAgentName: "Ghost" }],
    });
    const r = parseFormStateFromJson(json, baseState(), baseLookups());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.some((w) => w.includes("Unknown team"))).toBe(true);
      expect(r.warnings.some((w) => w.includes("Unknown subagent"))).toBe(true);
    }
  });

  it("warns when tools differ from the current set", () => {
    const json = JSON.stringify({
      version: "1",
      agent: { name: "Test" },
      tools: [{ toolName: "other", catalogName: "x" }],
    });
    const r = parseFormStateFromJson(json, baseState(), baseLookups());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.some((w) => w.toLowerCase().includes("tool"))).toBe(
        true,
      );
    }
  });

  it("does not warn when tools match the current set", () => {
    const lookups = baseLookups();
    const json = JSON.stringify({
      version: "1",
      agent: { name: "Test" },
      tools: lookups.currentAgentTools,
    });
    const r = parseFormStateFromJson(json, baseState(), lookups);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.some((w) => w.toLowerCase().includes("tool"))).toBe(
        false,
      );
    }
  });
});
