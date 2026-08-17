"""Wolfie Control Center — Python instrumentation SDK.

Backward-compatible with the existing sync_runs / sync_run_logs convention used
by wolfie-ajman-sync, wolfie-sharjah-sync, wolfie-geniemap-sync, adinteract-sync.

Design goals:
  - drop-in: existing pipeline code can wrap its orchestrator in `with run_context(...)`
    without changing extraction logic.
  - safe: telemetry failures are logged and swallowed; they NEVER break the pipeline.
  - richer: adds stages, heartbeats, snapshots, correlation IDs, pipeline_id resolution.

Usage:

    from wolfie_monitoring import run_context

    with run_context(kind="ajman_sales_incremental", mode="incremental",
                     commit=os.getenv("GITHUB_SHA")) as run:
        with run.stage("extract"):
            rows = api.export_all_records()
        run.counters(rows_fetched=len(rows))
        with run.stage("load"):
            writer.upsert_batched(rows)
        run.counters(rows_upserted=len(rows))
        run.snapshot(dataset="ajman_sales_summary", total_rows=total)

Status derivation:
  - context manager exits normally  -> status="succeeded"
  - exception propagates             -> status="failed", error captured
  - to mark "unchanged", call run.finish("unchanged") inside the block
"""

from __future__ import annotations

import contextlib
import logging
import os
import re
import threading
import time
import traceback
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Iterable, Iterator, Optional

logger = logging.getLogger("wolfie_monitoring")

HEARTBEAT_INTERVAL_S = 60


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


_SECRET_PATTERNS = [
    (re.compile(r"eyJ[\w-]{20,}\.[\w-]{10,}\.[\w-]+"),        "[jwt-redacted]"),
    (re.compile(r"(bearer\s+)[A-Za-z0-9_.\-]+", re.I),         r"\1[redacted]"),
    (re.compile(r"(:\/\/[^:@\/]+:)[^@\/]+@"),                 r"\1[redacted]@"),
    (re.compile(r"(sk-[A-Za-z0-9_-]{16,})"),                  "[api-key-redacted]"),
    (re.compile(r"(ghp_[A-Za-z0-9]{20,})"),                   "[gh-pat-redacted]"),
]


def redact(text: str | None) -> str:
    if not text:
        return ""
    out = str(text)
    for pat, repl in _SECRET_PATTERNS:
        out = pat.sub(repl, out)
    return out


def _swallow(fn: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator: silent monitoring failures never break the caller."""
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        try:
            return fn(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001
            logger.warning("wolfie-monitoring swallowed error: %s", exc)
            return None
    return wrapped


def _client():
    from supabase import create_client  # local import so Supabase is optional at import time
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("wolfie-monitoring: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) required")
    return create_client(url, key)


@dataclass
class RunHandle:
    kind: str
    mode: Optional[str]
    trigger: str
    commit: Optional[str]
    environment: str
    parent_run_id: Optional[int]

    supabase: Any = field(default=None, repr=False)
    run_id: Optional[int] = None
    pipeline_id: Optional[int] = None
    correlation_id: Optional[str] = None
    stats: dict = field(default_factory=dict)
    _finalized: bool = False
    _hb_stop: Optional[threading.Event] = None
    _hb_thread: Optional[threading.Thread] = None
    _explicit_status: Optional[str] = None

    # ---------- lifecycle ----------
    @_swallow
    def start(self) -> None:
        pipeline_id = self._resolve_pipeline_id()
        payload = {
            "kind": self.kind,
            "status": "running",
            "stats": {**self.stats, "mode": self.mode},
            "pipeline_id": pipeline_id,
            "trigger": self.trigger,
            "environment": self.environment,
            "commit_sha": self.commit,
            "parent_run_id": self.parent_run_id,
            "heartbeat_at": _now(),
        }
        row = self.supabase.table("sync_runs").insert(payload).execute()
        data = getattr(row, "data", None) or (row.get("data") if isinstance(row, dict) else None)
        if data:
            self.run_id = data[0]["id"]
            self.correlation_id = data[0].get("correlation_id")
            self.pipeline_id = pipeline_id

        # Kick off heartbeat thread
        self._hb_stop = threading.Event()
        self._hb_thread = threading.Thread(target=self._heartbeat_loop, daemon=True, name=f"wolfie-hb-{self.run_id}")
        self._hb_thread.start()
        logger.info("wolfie-monitoring: run started id=%s kind=%s pipeline_id=%s", self.run_id, self.kind, self.pipeline_id)

    @_swallow
    def _resolve_pipeline_id(self) -> Optional[int]:
        rows = self.supabase.table("wcc_pipelines").select("id, kind_patterns").execute()
        data = getattr(rows, "data", None) or (rows.get("data") if isinstance(rows, dict) else None) or []
        for row in data:
            for pat in (row.get("kind_patterns") or []):
                regex = "^" + re.escape(str(pat)).replace("%", ".*") + "$"
                if re.match(regex, self.kind):
                    return row["id"]
        return None

    def _heartbeat_loop(self) -> None:
        assert self._hb_stop is not None
        while not self._hb_stop.wait(HEARTBEAT_INTERVAL_S):
            self._heartbeat()

    @_swallow
    def _heartbeat(self) -> None:
        if not self.run_id:
            return
        self.supabase.table("sync_runs").update({"heartbeat_at": _now()}).eq("id", self.run_id).execute()

    # ---------- public API ----------
    @_swallow
    def log(self, level: str, message: str, meta: dict | None = None) -> None:
        if not self.run_id:
            return
        self.supabase.table("sync_run_logs").insert({
            "run_id": self.run_id,
            "level": level,
            "message": redact(str(message))[:4000],
            "meta": meta,
        }).execute()

    @contextlib.contextmanager
    def stage(self, name: str, *, order: int = 0, metadata: dict | None = None) -> Iterator[dict]:
        stage_id = self._start_stage(name, order, metadata or {})
        ctx: dict = {}
        try:
            yield ctx
            self._end_stage(stage_id, "succeeded", input_count=ctx.get("input_count"), output_count=ctx.get("output_count"))
        except Exception as exc:  # noqa: BLE001
            self._end_stage(stage_id, "failed", message=redact(str(exc)))
            raise

    @_swallow
    def _start_stage(self, name: str, order: int, metadata: dict) -> Optional[int]:
        if not self.run_id:
            return None
        row = self.supabase.table("wcc_pipeline_run_stages").insert({
            "run_id": self.run_id, "stage": name, "stage_order": order, "status": "running", "metadata": metadata,
        }).execute()
        data = getattr(row, "data", None) or (row.get("data") if isinstance(row, dict) else None)
        return data[0]["id"] if data else None

    @_swallow
    def _end_stage(self, stage_id: Optional[int], status: str, **extra: Any) -> None:
        if not stage_id:
            return
        self.supabase.table("wcc_pipeline_run_stages").update({
            "status": status,
            "finished_at": _now(),
            **{k: v for k, v in extra.items() if v is not None},
        }).eq("id", stage_id).execute()

    @_swallow
    def counters(self, **patch: Any) -> None:
        if not self.run_id:
            return
        current = self.supabase.table("sync_runs").select("stats").eq("id", self.run_id).single().execute()
        current_stats = (getattr(current, "data", None) or {}).get("stats") or {}
        merged = {**current_stats, **patch}
        self.supabase.table("sync_runs").update({"stats": merged}).eq("id", self.run_id).execute()

    @_swallow
    def snapshot(self, *, dataset: str, **row: Any) -> None:
        if not self.run_id:
            return
        self.supabase.table("wcc_dataset_snapshots").insert({
            "pipeline_id": self.pipeline_id, "run_id": self.run_id, "dataset": dataset, **row,
        }).execute()

    def finish(self, status: str) -> None:
        """Explicitly mark a run's terminal status (e.g. 'unchanged'). Overrides the auto derivation."""
        self._explicit_status = status

    @_swallow
    def _finalize(self, status: str, *, error: str | None = None, error_details: Any = None) -> None:
        if self._finalized:
            return
        self._finalized = True
        if self._hb_stop:
            self._hb_stop.set()
        if not self.run_id:
            return
        patch: dict[str, Any] = {"status": status, "finished_at": _now(), "heartbeat_at": _now()}
        if error is not None:
            patch["error"] = redact(error)[:4000]
        if error_details is not None:
            patch["error_details"] = error_details
        self.supabase.table("sync_runs").update(patch).eq("id", self.run_id).execute()


@contextlib.contextmanager
def run_context(
    *, kind: str, mode: str | None = None, commit: str | None = None,
    environment: str | None = None, trigger: str = "schedule", parent_run_id: int | None = None,
    stats: dict | None = None,
) -> Iterator[RunHandle]:
    """Context manager. On normal exit → succeeded. On exception → failed (with redacted error)."""
    supabase = _client()
    handle = RunHandle(
        kind=kind, mode=mode, trigger=trigger, commit=commit or os.getenv("GITHUB_SHA") or os.getenv("COMMIT_SHA"),
        environment=environment or os.getenv("ENVIRONMENT") or os.getenv("PYTHON_ENV") or "production",
        parent_run_id=parent_run_id, supabase=supabase, stats=stats or {},
    )
    handle.start()
    try:
        yield handle
        handle._finalize(handle._explicit_status or "succeeded")
    except Exception as exc:  # noqa: BLE001
        handle._finalize("failed", error=str(exc), error_details={"traceback": redact(traceback.format_exc())[:4000]})
        raise


__all__ = ["run_context", "RunHandle", "redact"]
