import { useEffect, useMemo, useState } from "react";
import { api, type ToolInfo, type InjectAttack } from "@/lib/api";
import { ATTACK_CATEGORIES } from "@/lib/attack-presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Play, Shield, ShieldOff, Skull, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RunRequest {
  task: string;
  guard_enabled: boolean;
  inject_attack?: InjectAttack;
}

interface Props {
  onRun: (req: RunRequest) => void;
  running: boolean;
  onCancel?: () => void;
}

export function TaskPanel({ onRun, running, onCancel }: Props) {
  const [task, setTask] = useState("read my project notes file");
  const [guardEnabled, setGuardEnabled] = useState(true);
  const [attackOpen, setAttackOpen] = useState(false);

  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [toolName, setToolName] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState("");
  const [attackText, setAttackText] = useState("");

  useEffect(() => {
    api.tools().then((t) => {
      setTools(t);
      if (t.length && !toolName) setToolName(t[0].name);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const injectValid = useMemo(
    () => attackOpen && toolName && attackText.trim().length > 0,
    [attackOpen, toolName, attackText],
  );

  function pickCategory(v: string) {
    setCategory(v);
    const preset = ATTACK_CATEGORIES.find((c) => c.value === v);
    if (preset && preset.example && !attackText.trim()) {
      setAttackText(preset.example);
    }
  }

  function handleRun() {
    if (!task.trim()) return;
    const req: RunRequest = { task: task.trim(), guard_enabled: guardEnabled };
    if (injectValid) {
      const cat =
        category === "__other__" ? customCategory.trim() || undefined : category || undefined;
      req.inject_attack = {
        tool_name: toolName,
        attack_text: attackText,
        attack_category: cat,
      };
    }
    onRun(req);
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-mono text-sm font-semibold tracking-wide">
              AGENT TASK
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send a task to the agent. Toggle the guard to see the defense in action.
            </p>
          </div>

          <label
            className={cn(
              "flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer select-none transition-colors",
              guardEnabled
                ? "border-success/40 bg-success/10"
                : "border-danger/40 bg-danger/10",
            )}
          >
            {guardEnabled ? (
              <Shield className="w-4 h-4 text-success" />
            ) : (
              <ShieldOff className="w-4 h-4 text-danger" />
            )}
            <div className="leading-tight">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Guard
              </div>
              <div
                className={cn(
                  "font-mono text-sm font-semibold",
                  guardEnabled ? "text-success" : "text-danger",
                )}
              >
                {guardEnabled ? "ON" : "OFF"}
              </div>
            </div>
            <Switch checked={guardEnabled} onCheckedChange={setGuardEnabled} />
          </label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Task
          </Label>
          <Input
            id="task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g. read my project notes file"
            className="font-mono text-sm"
          />
        </div>

        <Collapsible open={attackOpen} onOpenChange={setAttackOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-md border border-dashed border-warning/40 bg-warning/5 hover:bg-warning/10 px-3 py-2 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-warning" />
                <span className="font-mono text-xs uppercase tracking-widest text-warning">
                  Simulate an attack
                </span>
                {injectValid && (
                  <span className="ml-2 text-[10px] font-mono uppercase tracking-widest text-warning/80">
                    · armed
                  </span>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-warning transition-transform",
                  attackOpen && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        <span className="text-foreground">{t.name}</span>
                        {t.category && (
                          <span className="text-muted-foreground"> · {t.category}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Attack category
                </Label>
                <Select value={category} onValueChange={pickCategory}>
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTACK_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="font-mono text-xs">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {category === "__other__" && (
              <Input
                placeholder="Custom category label (e.g. InjecAgent DirectHarm)"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="font-mono text-sm"
              />
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Attack payload (embedded in tool output)
              </Label>
              <Textarea
                value={attackText}
                onChange={(e) => setAttackText(e.target.value)}
                placeholder="Payload text that will be injected into the tool's raw output…"
                rows={5}
                className="font-mono text-xs leading-relaxed"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleRun}
            disabled={running || !task.trim()}
            className="font-mono"
            size="lg"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                RUNNING…
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                RUN AGENT
              </>
            )}
          </Button>
          {running && onCancel && (
            <Button variant="outline" onClick={onCancel} className="font-mono">
              Cancel
            </Button>
          )}
          <div className="text-xs text-muted-foreground font-mono">
            {injectValid
              ? "→ Attack payload will be injected into the tool response"
              : "→ Normal run (no attack)"}
          </div>
        </div>
      </div>
    </section>
  );
}
