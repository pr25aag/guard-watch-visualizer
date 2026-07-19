import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { TaskPanel, type RunRequest } from "@/components/dashboard/TaskPanel";
import { Timeline } from "@/components/dashboard/Timeline";
import { CompareView } from "@/components/dashboard/CompareView";
import { GuardTester } from "@/components/dashboard/GuardTester";
import { runAgentStream, type AgentEvent } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleRun(req: RunRequest) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setEvents([]);
    setError(null);
    setRunning(true);
    try {
      await runAgentStream(
        req,
        ({ payload }) => {
          setEvents((prev) => [...prev, payload]);
        },
        ctrl.signal,
      );
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(String(e.message ?? e));
    } finally {
      setRunning(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setRunning(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <StatusBar />
      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="font-mono">
            <TabsTrigger value="live">Live Run</TabsTrigger>
            <TabsTrigger value="compare">Before / After</TabsTrigger>
            <TabsTrigger value="tester">Guard Tester</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6 mt-4">
            <TaskPanel onRun={handleRun} running={running} onCancel={handleCancel} />
            <Timeline events={events} running={running} error={error} />
          </TabsContent>

          <TabsContent value="compare" className="mt-4">
            <CompareView />
          </TabsContent>

          <TabsContent value="tester" className="mt-4">
            <GuardTester />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
