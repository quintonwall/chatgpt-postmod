import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Collection, Job, Endpoint } from "../server/types";
const pageSize = 24;
export function Equalizer({
  job,
}: {
  job?: Job;
  collections: Collection[];
  selected: string[];
}) {
  const endpoints = (job?.rows ?? []).flatMap((row) =>
    (row.endpoints ?? []).map((e) => ({ ...e, collection: row.name })),
  );
  const [page, setPage] = useState(0);
  const [follow, setFollow] = useState(true);
  const [picked, setPicked] = useState<string>();
  const active = endpoints.findIndex((e) => e.state === "running");
  useEffect(() => {
    setFollow(true);
    setPage(0);
    setPicked(undefined);
  }, [job?.id]);
  useEffect(() => {
    if (follow && active >= 0) setPage(Math.floor(active / pageSize));
  }, [active, follow]);
  const maxPage = Math.max(0, Math.ceil(endpoints.length / pageSize) - 1);
  const current = Math.min(page, maxPage);
  const visible = endpoints.slice(current * pageSize, (current + 1) * pageSize);
  const focus = endpoints.find((e) => e.id === picked) ?? endpoints[active];
  const rate = (e: Endpoint) =>
    e.passed + e.failed
      ? Math.round((e.passed / (e.passed + e.failed)) * 100)
      : null;
  return (
    <div className={`equalizer ${active >= 0 ? "is-playing" : ""}`}>
      <div className="eq-heading">
        <span>
          <i className={active >= 0 ? "live-dot" : ""} />
          {job?.state === "running"
            ? "ENDPOINTS / LIVE"
            : "ENDPOINT TEST SIGNAL"}
        </span>
        <span>
          {active >= 0
            ? `${endpoints[active].method} ${endpoints[active].name}`
            : job?.state === "running"
              ? "Preparing endpoints…"
              : job
                ? "Run complete"
                : "Awaiting a run"}
        </span>
      </div>
      <div className="eq-display endpoint-display">
        <div className="eq-axis">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div className="eq-channels">
          {visible.map((e, i) => {
            const value = rate(e);
            const tone = e.error
              ? "error"
              : e.failed
                ? "failed"
                : e.passed
                  ? "passed"
                  : "neutral";
            return (
              <button
                key={e.id}
                className={`endpoint-channel ${tone} ${e.state === "running" ? "executing" : ""} ${picked === e.id ? "picked" : ""}`}
                onClick={() => setPicked(e.id)}
                aria-label={`${e.method} ${e.name}: ${e.state}, ${value === null ? "no assertions" : value + " percent passing"}`}
                title={`${e.collection} · ${e.method} ${e.name}`}
              >
                <div className="endpoint-track">
                  <span
                    className="endpoint-fill"
                    style={{ "--rate": `${value ?? 0}%` } as CSSProperties}
                  />
                  {e.state === "running" && <span className="endpoint-scan" />}
                </div>
                <span className="endpoint-number">
                  {String(current * pageSize + i + 1).padStart(2, "0")}
                </span>
              </button>
            );
          })}
          {!visible.length && (
            <div className="eq-standby">
              Each bar will represent an endpoint’s actual test results.
            </div>
          )}
        </div>
      </div>
      <div className="eq-caption">
        <span>
          Bar height = assertion pass rate · green: all pass · red: failures ·
          gray: no tests yet
        </span>
        <div className="eq-pages">
          <button
            aria-label="Previous endpoints"
            disabled={current === 0}
            onClick={() => {
              setFollow(false);
              setPage(current - 1);
            }}
          >
            ‹
          </button>
          <span>
            {endpoints.length
              ? `${current * pageSize + 1}–${Math.min((current + 1) * pageSize, endpoints.length)} / ${endpoints.length}`
              : "0 endpoints"}
          </span>
          <button
            aria-label="Next endpoints"
            disabled={current >= maxPage}
            onClick={() => {
              setFollow(false);
              setPage(current + 1);
            }}
          >
            ›
          </button>
          {job?.state === "running" && (
            <button
              className={follow ? "following" : ""}
              onClick={() => setFollow(!follow)}
            >
              {follow ? "Following live" : "Follow live"}
            </button>
          )}
        </div>
      </div>
      {focus && (
        <div className="endpoint-detail" aria-live="polite">
          <span>
            <b>{focus.method}</b> {focus.name}
            <small>{focus.collection}</small>
          </span>
          <span className={focus.failed ? "endpoint-failure" : ""}>
            {focus.state} · {focus.passed} passed / {focus.failed} failed
            {focus.skipped ? ` / ${focus.skipped} skipped` : ""}
            {rate(focus) !== null ? ` · ${rate(focus)}%` : ""}
            {focus.statusCode ? ` · HTTP ${focus.statusCode}` : ""}
            {focus.durationMs !== undefined ? ` · ${focus.durationMs}ms` : ""}
            {focus.error ? ` · ${focus.error}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
