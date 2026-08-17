import { env } from "@/lib/env";

/**
 * Dispatch a manual pipeline run to the underlying scheduler.
 * Returns { ok, target, reference?, message }.
 *
 * Wiring per source:
 *  - github_actions -> POST /repos/:owner/:repo/actions/workflows/sync.yml/dispatches (needs GITHUB_DISPATCH_TOKEN)
 *  - windows_scheduler -> UNSUPPORTED remote dispatch. Return a helpful message.
 *  - launchd           -> UNSUPPORTED remote dispatch. Return a helpful message.
 *  - manual            -> UNSUPPORTED remote dispatch.
 */

const REPO_MAP: Record<string, { owner: string; repo: string; workflow: string; ref: string }> = {
  ajman_sales:              { owner: "amanpatel-allegiance", repo: "wolfie-ajman-sync",   workflow: "sync.yml", ref: "main" },
  sharjah_all:              { owner: "amanpatel-allegiance", repo: "wolfie-sharjah-sync", workflow: "sync.yml", ref: "main" },
  geniemap_developers:      { owner: "amanpatel-allegiance", repo: "wolfie-geniemap-sync", workflow: "sync.yml", ref: "main" },
  geniemap_projects:        { owner: "amanpatel-allegiance", repo: "wolfie-geniemap-sync", workflow: "sync.yml", ref: "main" },
  geniemap_units:           { owner: "amanpatel-allegiance", repo: "wolfie-geniemap-sync", workflow: "sync.yml", ref: "main" },
  geniemap_reference:       { owner: "amanpatel-allegiance", repo: "wolfie-geniemap-sync", workflow: "sync.yml", ref: "main" },
  geniemap_project_assets:  { owner: "amanpatel-allegiance", repo: "wolfie-geniemap-sync", workflow: "sync.yml", ref: "main" },
};

export type DispatchResult = {
  ok: boolean;
  target: string;
  reference?: string;
  message: string;
};

export async function dispatchPipeline(pipelineKey: string, scheduler: string, mode: string): Promise<DispatchResult> {
  if (scheduler === "github_actions") {
    const map = REPO_MAP[pipelineKey];
    if (!map) return { ok: false, target: "github_actions", message: `No GitHub repo mapping for ${pipelineKey}` };
    const token = env.githubDispatchToken();
    if (!token) return { ok: false, target: "github_actions", message: "GITHUB_DISPATCH_TOKEN is not configured on the server" };

    const url = `https://api.github.com/repos/${map.owner}/${map.repo}/actions/workflows/${map.workflow}/dispatches`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: map.ref, inputs: { mode } }),
    });
    if (resp.ok) {
      return {
        ok: true,
        target: "github_actions",
        reference: `https://github.com/${map.owner}/${map.repo}/actions/workflows/${map.workflow}`,
        message: `dispatched to ${map.owner}/${map.repo} (mode=${mode})`,
      };
    }
    const text = await resp.text();
    return { ok: false, target: "github_actions", message: `GitHub API ${resp.status}: ${text.slice(0, 200)}` };
  }

  if (scheduler === "windows_scheduler") {
    return {
      ok: false,
      target: "windows_scheduler",
      message: "dld-ingest runs via Windows Task Scheduler on a private machine — remote dispatch is not wired. Run `npm run sync:all` on the ingest machine.",
    };
  }
  if (scheduler === "launchd") {
    return {
      ok: false,
      target: "launchd",
      message: "adinteract-sync runs via launchd on your Mac — remote dispatch is not wired. Run `make sync` on the sync host.",
    };
  }
  return { ok: false, target: scheduler, message: `Scheduler '${scheduler}' has no remote dispatch adapter.` };
}
