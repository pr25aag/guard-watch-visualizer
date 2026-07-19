import { useEffect, useRef } from "react";
import type { AgentEvent } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Play,
  Brain,
  Wrench,
  FileOutput,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Flag,
  ArrowDown,
} from "lucide-react";

interface Props {
  events: AgentEvent[];
  running: boolean;
  error?: string | null;
}

export function Timeline({ events, running, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length, running]);

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-5 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm font-semibold tracking-wide">
            EXECUTION TIMELINE
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live step-by-step trace. Guard checkpoint sits between raw tool output and what the agent sees.
          </p>
        </div>
        {running && (
          <div className="flex items-center gap-2 text-xs font-mono text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            STREAMING
          </div>
        )}
      </div>

      <div className="p-5 space-y-3 min-h-[300px] scanline-bg">
        {events.length === 0 && !running && !error && (
          <div className="text-center text-sm text-muted-foreground font-mono py-16">
            Awaiting run. Configure a task above and press RUN AGENT.
          </div>
        )}
        {events.map((evt, i) => (
          <EventCard key={i} event={evt} prev={events[i - 1]} />
        ))}
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 p-3 font-mono text-xs text-danger animate-fade-in">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <AlertCircle className="w-3.5 h-3.5" /> STREAM ERROR
            </div>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}

function EventCard({ event, prev }: { event: AgentEvent; prev?: AgentEvent }) {
  const d = event.data ?? {};
  const step = event.step;

  switch (event.type) {
    case "run_started":
      return (
        <Card icon={<Play className="w-3.5 h-3.5" />} tone="info" step={step} title="RUN STARTED">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
            <KV k="task" v={String(d.task ?? "")} />
            <KV k="guard" v={d.guard_enabled ? "on" : "off"} tone={d.guard_enabled ? "success" : "danger"} />
            <KV k="llm" v={String(d.llm_provider ?? "-")} />
          </div>
        </Card>
      );

    case "agent_thought":
      return (
        <Card icon={<Brain className="w-3.5 h-3.5" />} tone="neutral" step={step} title="AGENT THOUGHT">
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            {String(d.thought ?? "")}
          </p>
        </Card>
      );

    case "tool_call":
      return (
        <Card icon={<Wrench className="w-3.5 h-3.5" />} tone="info" step={step} title={`TOOL CALL · ${d.tool_name ?? ""}`}>
          <pre className="text-xs font-mono bg-background/60 border border-border rounded p-2 overflow-x-auto">
{JSON.stringify(d.tool_args ?? {}, null, 2)}
          </pre>
        </Card>
      );

    case "tool_result": {
      const raw = String(d.raw_output ?? "");
      return (
        <Card
          icon={<FileOutput className="w-3.5 h-3.5" />}
          tone="warning"
          step={step}
          title={`RAW TOOL OUTPUT (unfiltered) · ${d.tool_name ?? ""}`}
        >
          <MonoBlock text={raw} />
        </Card>
      );
    }

    case "guard_verdict": {
      const label = String(d.label ?? "");
      const score = Number(d.score ?? 0);
      const isInjected = label === "injected";
      return (
        <div className="relative animate-fade-in">
          <div className="absolute left-4 -top-3 text-muted-foreground">
            <ArrowDown className="w-4 h-4" />
          </div>
          <Card
            icon={isInjected ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            tone={isInjected ? "danger" : "success"}
            step={step}
            title="GUARD CHECKPOINT"
            emphasized
          >
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                className={cn(
                  "font-mono uppercase tracking-wider",
                  isInjected
                    ? "bg-danger/20 text-danger border border-danger/40"
                    : "bg-success/20 text-success border border-success/40",
                )}
              >
                {label}
              </Badge>
              {d.category && (
                <Badge className="bg-muted text-muted-foreground border font-mono">
                  {String(d.category)}
                </Badge>
              )}
              <Badge className="bg-secondary text-secondary-foreground border font-mono text-[10px]">
                backend: {String(d.backend ?? "-")}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground ml-auto">
                threshold {Number(d.threshold ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                <span>confidence · injected</span>
                <span>{score.toFixed(3)}</span>
              </div>
              <div className="h-2 rounded-full bg-background/60 border border-border overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    isInjected ? "bg-danger" : "bg-success",
                  )}
                  style={{ width: `${Math.max(2, Math.min(100, score * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-0.5">
                <span>0.0</span>
                <span>1.0</span>
              </div>
            </div>
          </Card>
          <div className="absolute left-4 -bottom-3 text-muted-foreground">
            <ArrowDown className="w-4 h-4" />
          </div>
        </div>
      );
    }

    case "tool_result_filtered": {
      const filtered = String(d.content_seen_by_agent ?? "");
      const rawEvent = findPrevRaw(prev);
      const raw = rawEvent ? String(rawEvent.data?.raw_output ?? "") : "";
      const changed = raw && filtered !== raw;
      return (
        <Card
          icon={<Shield className="w-3.5 h-3.5" />}
          tone={changed ? "danger" : "success"}
          step={step}
          title={`WHAT THE AGENT ACTUALLY SEES · ${d.tool_name ?? ""}`}
          emphasized
        >
          {changed && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-danger/20 text-danger border border-danger/40 font-mono uppercase tracking-widest">
                  {isEmptyOrBlocked(filtered) ? "Blocked" : "Sanitized"}
                </Badge>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  before / after
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-danger mb-1">
                    ✗ Would have been seen
                  </div>
                  <MonoBlock text={raw} muted strike />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-success mb-1">
                    ✓ Delivered to agent
                  </div>
                  <MonoBlock text={filtered || "(empty — content blocked)"} />
                </div>
              </div>
            </>
          )}
          {!changed && (
            <>
              <Badge className="bg-success/20 text-success border border-success/40 font-mono uppercase tracking-widest mb-2">
                Passed through
              </Badge>
              <MonoBlock text={filtered} />
            </>
          )}
        </Card>
      );
    }

    case "final_answer":
      return (
        <div className="mt-6 rounded-lg border-2 border-primary/40 bg-primary/5 p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Flag className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs uppercase tracking-widest text-primary">
              Final answer · step {step}
            </span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {String(d.answer ?? "")}
          </p>
        </div>
      );

    case "run_finished":
      return (
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground py-2 animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          RUN FINISHED · {d.total_steps ?? "-"} steps
        </div>
      );

    case "error":
      return (
        <Card icon={<AlertCircle className="w-3.5 h-3.5" />} tone="danger" step={step} title="ERROR">
          <p className="text-xs font-mono">{String(d.message ?? "unknown error")}</p>
        </Card>
      );

    default:
      return (
        <Card icon={<Wrench className="w-3.5 h-3.5" />} tone="neutral" step={step} title={event.type}>
          <pre className="text-xs font-mono overflow-x-auto">{JSON.stringify(d, null, 2)}</pre>
        </Card>
      );
  }
}

function findPrevRaw(prev?: AgentEvent) {
  // Only immediate prev usage; caller passes prev event.
  // We look for tool_result with matching-ish tool_name.
  if (!prev) return null;
  if (prev.type === "tool_result") return prev;
  return null;
}

function isEmptyOrBlocked(s: string) {
  const t = s.trim().toLowerCase();
  return !t || t.includes("blocked") || t.includes("removed") || t.length < 8;
}

type Tone = "neutral" | "info" | "success" | "danger" | "warning";

const toneStyles: Record<Tone, string> = {
  neutral: "border-border bg-card",
  info: "border-info/30 bg-info/5",
  success: "border-success/30 bg-success/5",
  danger: "border-danger/40 bg-danger/5",
  warning: "border-warning/30 bg-warning/5",
};
const toneAccent: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  info: "text-info",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
};

function Card({
  icon,
  tone,
  step,
  title,
  children,
  emphasized,
}: {
  icon: React.ReactNode;
  tone: Tone;
  step: number;
  title: string;
  children: React.ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 animate-fade-in transition-shadow",
        toneStyles[tone],
        emphasized && "shadow-lg shadow-black/30",
      )}
    >
      <div className={cn("flex items-center gap-2 mb-2", toneAccent[tone])}>
        {icon}
        <span className="font-mono text-[11px] uppercase tracking-widest font-semibold">
          {title}
        </span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          step {step}
        </span>
      </div>
      {children}
    </div>
  );
}

function KV({ k, v, tone }: { k: string; v: string; tone?: "success" | "danger" }) {
  return (
    <div className="rounded border border-border bg-background/60 px-2 py-1">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
        {k}
      </div>
      <div
        className={cn(
          "truncate text-foreground",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
        )}
      >
        {v}
      </div>
    </div>
  );
}

function MonoBlock({
  text,
  muted,
  strike,
}: {
  text: string;
  muted?: boolean;
  strike?: boolean;
}) {
  return (
    <pre
      className={cn(
        "text-xs font-mono whitespace-pre-wrap break-words rounded border border-border bg-background/60 p-3 max-h-64 overflow-auto",
        muted && "text-muted-foreground",
        strike && "line-through decoration-danger/70 decoration-1",
      )}
    >
      {text || "(empty)"}
    </pre>
  );
}
