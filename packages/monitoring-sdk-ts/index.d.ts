export type RunHandle = {
  runId: number | null;
  pipelineId: number | null;
  log: (level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) => Promise<void>;
  stage: <T>(name: string, fn: (ctx: { stageId: number | null }) => Promise<T>, opts?: { order?: number; metadata?: Record<string, unknown> }) => Promise<T>;
  counters: (patch: Record<string, unknown>) => Promise<void>;
  snapshot: (row: Record<string, unknown>) => Promise<void>;
  finish: (status?: "succeeded" | "succeeded_with_warnings" | "unchanged" | "partial") => Promise<void>;
  fail: (err: unknown) => Promise<void>;
};

export function createRun(opts: {
  kind: string;
  mode?: string;
  commit?: string | null;
  environment?: string;
  trigger?: "schedule" | "manual" | "retry" | "backfill" | "api";
  parentRunId?: number | null;
  stats?: Record<string, unknown>;
}): Promise<RunHandle>;

export function withRun<T>(
  opts: Parameters<typeof createRun>[0],
  body: (run: RunHandle) => Promise<T>,
): Promise<T>;

export function redact(input: string | null | undefined): string;
