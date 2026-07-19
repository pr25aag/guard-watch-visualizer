import { useEffect, useState } from "react";
import { api, API_BASE_URL, type HealthResponse } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, Activity, AlertTriangle } from "lucide-react";

export function StatusBar() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .health()
      .then((h) => {
        setHealth(h);
        setError(null);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  const guardBadge = (() => {
    if (!health) return null;
    if (health.guard_backend === "deberta") {
      return (
        <Badge className="bg-success/15 text-success border border-success/30 font-mono">
          <Shield className="w-3 h-3 mr-1" /> Trained Model
        </Badge>
      );
    }
    if (health.guard_backend === "heuristic") {
      return (
        <Badge className="bg-warning/15 text-warning border border-warning/30 font-mono">
          <ShieldAlert className="w-3 h-3 mr-1" /> Heuristic (fallback)
        </Badge>
      );
    }
    return (
      <Badge className="bg-muted text-muted-foreground border font-mono">
        {health.guard_backend}
      </Badge>
    );
  })();

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="leading-tight">
            <div className="font-mono text-sm font-semibold tracking-wide">
              MCP-IPI-GUARD
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Indirect Prompt Injection Defense
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3 font-mono text-xs">
          {error ? (
            <Badge className="bg-danger/15 text-danger border border-danger/30">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Backend unreachable at {API_BASE_URL}
            </Badge>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Activity className="w-3 h-3 text-success" />
                <span>API</span>
                <span className="text-foreground">{API_BASE_URL}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>LLM</span>
                <span className="text-foreground">
                  {health?.llm_provider ?? "…"}
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>GUARD</span>
                {guardBadge ?? <span>…</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
