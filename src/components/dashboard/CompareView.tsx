import { useEffect, useState } from "react";
import { api, type EvaluateResponse, type InjectAttack, type ToolInfo } from "@/lib/api";
import { ATTACK_CATEGORIES } from "@/lib/attack-presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitCompare, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompareView() {
  const [task, setTask] = useState("read my project notes file");
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [toolName, setToolName] = useState("");
  const [category, setCategory] = useState("jailbreak_escalation");
  const [attackText, setAttackText] = useState(
    ATTACK_CATEGORIES.find((c) => c.value === "jailbreak_escalation")!.example,
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.tools().then((t) => {
      setTools(t);
      if (t.length && !toolName) setToolName(t[0].name);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickCategory(v: string) {
    setCategory(v);
    const preset = ATTACK_CATEGORIES.find((c) => c.value === v);
    if (preset?.example) setAttackText(preset.example);
  }

  async function run() {
    if (!task.trim() || !toolName || !attackText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const inject: InjectAttack = {
        tool_name: toolName,
        attack_text: attackText,
        attack_category: category === "__other__" ? undefined : category,
      };
      const r = await api.evaluate(task, inject);
      setResult(r);
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <h2 className="font-mono text-sm font-semibold tracking-wide flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-primary" />
          BEFORE / AFTER — SIDE-BY-SIDE EVALUATION
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Runs the same task + attack twice: once with the guard off, once with it on. Non-streaming.
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Task
            </Label>
            <Input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Injected via tool
            </Label>
            <Select value={toolName} onValueChange={setToolName}>
              <SelectTrigger className="font-mono text-sm">
                <SelectValue placeholder="Select tool" />
              </SelectTrigger>
              <SelectContent>
                {tools.map((t) => (
                  <SelectItem key={t.name} value={t.name} className="font-mono text-xs">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Attack category
            </Label>
            <Select value={category} onValueChange={pickCategory}>
              <SelectTrigger className="font-mono text-sm">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {ATTACK_CATEGORIES.filter((c) => c.value !== "__other__").map((c) => (
                  <SelectItem key={c.value} value={c.value} className="font-mono text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Attack payload
          </Label>
          <Textarea
            rows={4}
            value={attackText}
            onChange={(e) => setAttackText(e.target.value)}
            className="font-mono text-xs"
          />
        </div>

        <Button onClick={run} disabled={loading} className="font-mono">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              EVALUATING…
            </>
          ) : (
            "COMPARE"
          )}
        </Button>

        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 p-3 font-mono text-xs text-danger">
            {error}
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <ResultPanel title="Without Guard" result={result.without_guard} />
            <ResultPanel title="With Guard" result={result.with_guard} />
          </div>
        )}
      </div>
    </section>
  );
}

function ResultPanel({
  title,
  result,
}: {
  title: string;
  result: { guard_enabled: boolean; final_answer: string; guard_triggered: boolean; steps: unknown[] };
}) {
  const attackSucceeded = !result.guard_triggered;
  return (
    <div
      className={cn(
        "rounded-md border-2 p-4 space-y-3",
        attackSucceeded
          ? "border-danger/50 bg-danger/5"
          : "border-success/50 bg-success/5",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {title}
        </div>
        <Badge
          className={cn(
            "font-mono uppercase tracking-widest border",
            attackSucceeded
              ? "bg-danger/20 text-danger border-danger/40"
              : "bg-success/20 text-success border-success/40",
          )}
        >
          {attackSucceeded ? (
            <>
              <ShieldAlert className="w-3 h-3 mr-1" /> Attack succeeded
            </>
          ) : (
            <>
              <ShieldCheck className="w-3 h-3 mr-1" /> Attack blocked
            </>
          )}
        </Badge>
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
          Final answer
        </div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {result.final_answer || "(no answer)"}
        </p>
      </div>
      <div className="text-[10px] font-mono text-muted-foreground">
        {result.steps.length} step{result.steps.length === 1 ? "" : "s"} · guard{" "}
        {result.guard_enabled ? "on" : "off"}
      </div>
    </div>
  );
}
