// API client for MCP-IPI-Guard backend.
// Base URL is fully configurable via VITE_API_BASE_URL.

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

export type GuardBackend = "heuristic" | "deberta" | string;

export interface HealthResponse {
  status: string;
  llm_provider: string;
  guard_backend: GuardBackend;
  guard_model_path?: string | null;
}

export interface ToolInfo {
  name: string;
  description: string;
  category?: string;
}

export interface GuardScoreResponse {
  label: "benign" | "injected" | string;
  score: number;
  threshold: number;
  backend: GuardBackend;
}

export interface InjectAttack {
  tool_name: string;
  attack_text: string;
  attack_category?: string;
}

export interface EvaluateResult {
  guard_enabled: boolean;
  final_answer: string;
  guard_triggered: boolean;
  steps: unknown[];
}

export interface EvaluateResponse {
  without_guard: EvaluateResult;
  with_guard: EvaluateResult;
}

// Streaming event types
export type AgentEventType =
  | "run_started"
  | "agent_thought"
  | "tool_call"
  | "tool_result"
  | "guard_verdict"
  | "tool_result_filtered"
  | "final_answer"
  | "run_finished"
  | "error";

export interface AgentEvent {
  type: AgentEventType | string;
  step: number;
  data: Record<string, any>;
  timestamp: number;
}

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${path}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => j<HealthResponse>("/health"),
  tools: () => j<ToolInfo[]>("/tools"),
  guardScore: (text: string) =>
    j<GuardScoreResponse>("/guard/score", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  evaluate: (task: string, inject_attack: InjectAttack) =>
    j<EvaluateResponse>("/evaluate", {
      method: "POST",
      body: JSON.stringify({ task, inject_attack }),
    }),
};

export interface RunAgentParams {
  task: string;
  guard_enabled: boolean;
  inject_attack?: InjectAttack;
}

/**
 * Streams POST /agent/run (text/event-stream). Native EventSource is GET-only,
 * so we read the response body manually.
 */
export async function runAgentStream(
  params: RunAgentParams,
  onEvent: (evt: { eventName: string; payload: AgentEvent }) => void,
  signal?: AbortSignal,
): Promise<void> {
  const body: Record<string, unknown> = {
    task: params.task,
    guard_enabled: params.guard_enabled,
  };
  if (params.inject_attack) body.inject_attack = params.inject_attack;

  const response = await fetch(`${API_BASE_URL}/agent/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`Stream failed: ${response.status} ${response.statusText}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const lines = chunk.split("\n");
      let eventName = "message";
      let dataStr = "";
      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
      }
      if (!dataStr) continue;
      try {
        const payload = JSON.parse(dataStr) as AgentEvent;
        onEvent({ eventName, payload });
      } catch (err) {
        console.warn("Failed to parse SSE chunk", err, dataStr);
      }
    }
  }
}
