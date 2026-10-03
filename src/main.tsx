import { Dial } from "./Dial";
import { Equalizer } from "./Equalizer";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { invoke, requestPostman, subscribeSnapshot, embedded } from "./bridge";
import type { Summary, Job } from "../server/types";
import "./style.css";
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);
function Meter({
  label,
  value,
  count,
  color = "green",
}: {
  label: string;
  value: number | null;
  count: string;
  color?: string;
}) {
  return (
    <div className="meter">
      <div className="meter-label">
        {label}
        <span>{count}</span>
      </div>
      <div className="meter-value">
        {value ?? "—"}
        {value !== null && <small>%</small>}
      </div>
      <div
        className={`segments ${color}`}
        aria-label={`${label}: ${value === null ? "unknown" : value + " percent"}`}
      >
        {Array.from({ length: 24 }, (_, i) => (
          <i
            key={i}
            className={
              value !== null && i < Math.round((value / 100) * 24) ? "lit" : ""
            }
          />
        ))}
      </div>
      <div className="scale">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}
function Panel() {
  const [cap, setCap] = useState<any>();
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [data, setData] = useState<Summary>();
  const [workspace, setWorkspace] = useState("");
  const [env, setEnv] = useState("");
  const [environments, setEnvironments] = useState<
    { id: string; name: string }[]
  >([]);
  const [job, setJob] = useState<Job>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [source, setSource] = useState("all");
  const [layout, setLayout] = useState(() => {
    try {
      return {
        meters: true,
        equalizer: true,
        details: false,
        ...JSON.parse(localStorage.getItem("postmod.layout") ?? "{}"),
      };
    } catch {
      return { meters: true, equalizer: true, details: false };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("postmod.layout", JSON.stringify(layout));
    } catch {}
  }, [layout]);
  const [confirm, setConfirm] = useState(false);
  const [settings, setSettings] = useState(false);
  const [waiting, setWaiting] = useState(false);
  useEffect(
    () =>
      subscribeSnapshot((snapshot) => {
        setCap(snapshot);
        setWorkspace(snapshot.workspaceId);
        setEnv(snapshot.environmentId);
        setSource(snapshot.source);
        setEnvironments(snapshot.environments);
        setData(snapshot.summary);
        setJob(snapshot.job);
        setError(snapshot.error ?? "");
        setConnectionFailed(!snapshot.connected);
        setBusy(false);
        setWaiting(false);
      }),
    [],
  );
  useEffect(() => {
    invoke("open_postmod")
      .then(() => {
        setBusy(false);
      })
      .catch((e) => {
        setError(e.message);
        setBusy(false);
      });
  }, []);
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      setWaiting(false);
      setBusy(false);
      setError(
        "No panel result received yet. Check the ChatGPT conversation. A completed request may open a refreshed panel. Do not repeat a test run merely because this panel is waiting.",
      );
    }, 90000);
    return () => clearTimeout(timer);
  }, [waiting]);
  async function ask(action: string, selection: Record<string, unknown>) {
    setError("");
    setBusy(true);
    setWaiting(true);
    try {
      await requestPostman(action, selection);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      setWaiting(false);
    }
  }
  function selectWorkspace(id: string) {
    setWorkspace(id);
    setData(undefined);
    setJob(undefined);
    setEnv("");
    setEnvironments([]);
    setSource("all");
    setConfirm(false);
  }
  async function load(id: string) {
    if (id)
      await ask(
        "Read this workspace's environments using getWorkspace or the available environment listing tool. Do not scan collections yet.",
        { workspaceId: id, environmentId: "", source: "all" },
      );
  }
  function selectEnvironment(value: string) {
    setEnv(value);
    setData(undefined);
    setJob(undefined);
    setSource("all");
    setConfirm(false);
  }
  async function tune(value: string) {
    if (value && workspace)
      await ask(
        "Read collections and coverage metadata for this workspace using available Postman tools. Get full collections as needed for inherited pre-request and post-response script counts. Unknown spec/script coverage stays null. Do not run tests.",
        { workspaceId: workspace, environmentId: value, source: "all" },
      );
  }
  async function run() {
    if (!data || !workspace || !env) return;
    setConfirm(false);
    await ask(
      "Run tests once for exactly these collections and environment using the connected Postman execution tool. This is my explicit execution request. Return actual run results; omit endpoint data if unavailable.",
      {
        workspaceId: workspace,
        environmentId: env,
        source,
        collectionIds: selected,
      },
    );
  }
  const workspaceOptions: { id: string; name: string }[] = [
    { id: "", name: "Dial in a workspace" },
    ...(cap?.workspaces ?? []),
  ];
  if (workspace && !workspaceOptions.some((w) => w.id === workspace))
    workspaceOptions.push({
      id: workspace,
      name: data?.workspace.name ?? workspace,
    });
  const workspaceIndex = Math.max(
    0,
    workspaceOptions.findIndex((w) => w.id === workspace),
  );
  const environmentOptions = [
    { id: "", name: "Dial in an environment" },
    ...environments,
    ...(workspace ? [{ id: "none", name: "No environment" }] : []),
  ];
  const environmentIndex = Math.max(
    0,
    environmentOptions.findIndex((e) => e.id === env),
  );
  function changeEnvironment(value: string) {
    selectEnvironment(value);
  }
  const allCollections = data?.collections ?? [];
  const collections =
    source === "all"
      ? allCollections
      : allCollections.filter((c) => c.id === source);
  const selected = collections.map((c) => c.id);
  const sourceName =
    source === "all"
      ? "All collections"
      : (collections[0]?.name ?? "Collection");
  const sourceIndex =
    source === "all" ? 0 : allCollections.findIndex((c) => c.id === source) + 1;
  const sourceOptions = ["all", ...allCollections.map((c) => c.id)];
  function changeSource(value: string) {
    setSource(value);
    setConfirm(false);
  }
  const hasWorkspaces = !!cap?.workspaces?.length;
  const hasPostmanData = hasWorkspaces || cap?.connected;
  const matchingRows = job?.rows.filter((r) => selected.includes(r.id)) ?? [];
  const scopedJob =
    job && matchingRows.length ? { ...job, rows: matchingRows } : undefined;
  const known = collections.filter((c) => c.requests !== null);
  const totals = known.reduce(
    (a, c) => ({
      requests: a.requests + c.requests!,
      pre: a.pre + (c.pre ?? 0),
      tests: a.tests + (c.tests ?? 0),
    }),
    { requests: 0, pre: 0, tests: 0 },
  );
  const specs = collections.filter((c) => c.spec === true).length;
  const unknown = collections.filter((c) => c.spec === null).length;
  const running = job?.state === "running";
  const switchOn = running;
  const finished =
    scopedJob?.rows.filter((r) => !["queued", "running"].includes(r.state))
      .length ?? 0;
  const passed = scopedJob?.rows.reduce((a, r) => a + (r.passed ?? 0), 0) ?? 0;
  const failed = scopedJob?.rows.reduce((a, r) => a + (r.failed ?? 0), 0) ?? 0;
  return (
    <main>
      <header>
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <path
                d="M8 18v4M14 12v16M20 7v26M26 11v18M32 16v8"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1>
            postmod<span>POSTMAN WORKSPACE CONTROL</span>
          </h1>
        </div>
        <div className="header-right">
          <span
            className={`connection ${connectionFailed && !hasPostmanData ? "disconnected" : ""}`}
            role="status"
            title={
              connectionFailed && !hasPostmanData
                ? "Connect Postman in ChatGPT and load your workspaces."
                : hasPostmanData
                  ? "Postman metadata was supplied by ChatGPT; this is not a live OAuth session check."
                  : "Checking Postman connection"
            }
          >
            <i />
            {connectionFailed && !hasPostmanData
              ? "NOT CONNECTED"
              : hasPostmanData
                ? "POSTMAN VIA CHATGPT"
                : embedded
                  ? "LOAD POSTMAN"
                  : "OPEN IN CHATGPT"}
          </span>
          <button
            className="icon"
            aria-label="Panel settings"
            onClick={() => setSettings(!settings)}
          >
            ⚙
          </button>
        </div>
      </header>
      {settings && (
        <aside className="notice">
          <strong>Panel sections</strong>
          <div className="layout-switches">
            {(
              [
                ["meters", "Coverage meters"],
                ["equalizer", "Endpoint equalizer"],
                ["details", "Collection details"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={layout[key]}
                  onChange={(e) =>
                    setLayout({ ...layout, [key]: e.target.checked })
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <strong>Postman connection</strong>
          <p>
            Enable the Postman plugin in this ChatGPT conversation and connect
            your own account there. Postmod never receives your Postman
            credentials.
          </p>
        </aside>
      )}
      {error && (
        <div role="alert" className="error">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      <div className="host-connection">
        <button
          disabled={busy}
          onClick={() =>
            void ask(
              "Call getWorkspaces and return the real accessible workspaces. Set canRun only if a connected Postman execution tool is available. Leave workspace and environment unselected.",
              {},
            )
          }
        >
          {hasWorkspaces
            ? "Refresh workspaces"
            : "Load workspaces from Postman"}
        </button>
        <span>
          {waiting
            ? "Waiting for ChatGPT · check the conversation"
            : hasWorkspaces
              ? "Workspaces loaded from Postman · choose with the dials below"
              : embedded
                ? "Uses your Postman connection in ChatGPT"
                : "Open in ChatGPT with Postman enabled"}
        </span>
      </div>
      <section className="tuner" aria-label="Signal tuner">
        <div
          className={`tuner-lcd ${data ? "locked" : ""}`}
          role="status"
          aria-live="polite"
        >
          <div className="lcd-topline">
            <span>POSTMOD / DIGITAL RECEIVER</span>
            <span className="lcd-status">
              ● {busy ? "TUNING" : data ? "SIGNAL LOCKED" : "STANDBY"}
            </span>
          </div>
          <div className="lcd-waveforms" aria-label="Dial tuning waveforms">
            {[
              {
                label: "Workspace",
                position: workspaceIndex,
                tuned: !!workspace,
              },
              {
                label: "Environment",
                position: environmentIndex,
                tuned: !!env,
              },
              { label: "Collections", position: sourceIndex, tuned: !!data },
            ].map(({ label, position, tuned }, channel) => {
              const points = Array.from({ length: 181 }, (_, x) => {
                const envelope = Math.sin((Math.PI * x) / 180);
                const y = tuned
                  ? 32 -
                    Math.sin(
                      (x / 180) * Math.PI * (6 + position * 2 + channel * 1.5),
                    ) *
                      23 *
                      envelope
                  : 32;
                return `${x},${y}`;
              }).join(" ");
              return (
                <svg
                  key={`${label}-${position}-${tuned}`}
                  className={`lcd-wave wave-${channel} ${tuned ? "tuned" : ""}`}
                  viewBox="0 0 180 64"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`${label}: ${tuned ? "tuned" : "awaiting signal"}`}
                >
                  <path
                    className="wave-grid"
                    d="M0 16H180 M0 32H180 M0 48H180 M30 0V64 M60 0V64 M90 0V64 M120 0V64 M150 0V64"
                  />
                  <polyline className="wave-signal" points={points} />
                </svg>
              );
            })}
          </div>
          <div className="lcd-channels">
            <div>
              <span>01 / WORKSPACE</span>
              <strong>
                {workspace
                  ? workspaceOptions[workspaceIndex].name
                  : "— UNTUNED —"}
              </strong>
            </div>
            <div>
              <span>02 / ENVIRONMENT</span>
              <strong>
                {env
                  ? environmentOptions[environmentIndex].name
                  : "— UNTUNED —"}
              </strong>
            </div>
            <div>
              <span>03 / COLLECTIONS</span>
              <strong>{data ? sourceName : "— AWAITING SIGNAL —"}</strong>
            </div>
          </div>
          <div className="lcd-bottomline">
            {busy
              ? "Waiting for ChatGPT’s Postman result…"
              : !workspace
                ? "Turn the workspace dial to begin."
                : !env
                  ? "Load environments, then choose an environment or No environment."
                  : data
                    ? source === "all"
                      ? `${allCollections.length} collections · workspace mix`
                      : "Single collection · focused signal"
                    : "Selection ready · click Load collections to apply."}
          </div>
        </div>
        <div className="tuner-controls">
          <div className="tuner-knob">
            <span>WORKSPACE</span>
            <Dial
              label="Workspace"
              index={workspaceIndex}
              count={workspaceOptions.length}
              valueText={workspaceOptions[workspaceIndex].name}
              disabled={busy || running}
              onChange={(i) => selectWorkspace(workspaceOptions[i].id)}
            />
            <small>01 / RECEIVE</small>
            <button
              className="tuner-load"
              disabled={busy || running || !workspace}
              onClick={() => void load(workspace)}
            >
              Load environments
            </button>
            <p className="tuner-help">
              Choose a workspace, then load its environment options.
            </p>
          </div>
          <div className="tuner-knob">
            <span>ENVIRONMENT</span>
            <Dial
              label="Environment"
              index={environmentIndex}
              count={environmentOptions.length}
              valueText={environmentOptions[environmentIndex].name}
              disabled={busy || running || !workspace}
              onChange={(i) => changeEnvironment(environmentOptions[i].id)}
            />
            <small>02 / TUNE</small>
            <button
              className="tuner-load"
              disabled={busy || running || !workspace || !env}
              onClick={() => void tune(env)}
            >
              {data ? "Refresh collections" : "Load collections"}
            </button>
            <p className="tuner-help">
              Choose an environment or No environment, then load collections.
            </p>
          </div>
          <div className="tuner-knob">
            <span>COLLECTIONS</span>
            <Dial
              label="Collections"
              index={sourceIndex}
              count={sourceOptions.length}
              valueText={data ? sourceName : "Awaiting signal"}
              disabled={busy || running || !data}
              onChange={(i) => changeSource(sourceOptions[i])}
            />
            <small>03 / INPUT</small>
            <p className="tuner-help" role="status">
              {!data
                ? "Load collections using the button under Environment to enable this dial."
                : allCollections.length
                  ? "Browse loaded collections. No extra loading needed."
                  : "No collections were returned for this workspace."}
            </p>
          </div>
        </div>
        <div className="tuner-bottom">
          <span>TURN TO SELECT · CLICK TO LOAD</span>
        </div>
      </section>
      {data && layout.meters && (
        <section className="amplifier">
          <div className="screw tl" />
          <div className="screw tr" />
          <div className="screw bl" />
          <div className="screw br" />
          <div className="readout">
            <div className="meter-label">
              {source === "all" ? "COLLECTIONS" : "REQUESTS"}
              <span>{source === "all" ? "IN WORKSPACE" : "IN COLLECTION"}</span>
            </div>
            <div className="collection-count">
              {data
                ? String(
                    source === "all" ? collections.length : totals.requests,
                  ).padStart(2, "0")
                : "—"}
              <span className="tiny-light" />
            </div>
            <p>
              {totals.requests} requests <span> / {known.length} scanned</span>
            </p>
          </div>
          <Meter
            label="OPENAPI LINKED"
            value={unknown ? null : pct(specs, collections.length)}
            count={`${specs}/${collections.length}${unknown ? " · " + unknown + " unknown" : ""}`}
            color="orange"
          />
          <Meter
            label="PRE-REQUEST"
            value={pct(totals.pre, totals.requests)}
            count={`${totals.pre}/${totals.requests} req${known.length < collections.length ? " · partial" : ""}`}
          />
          <Meter
            label="POST-RESPONSE TESTS"
            value={pct(totals.tests, totals.requests)}
            count={`${totals.tests}/${totals.requests} req${known.length < collections.length ? " · partial" : ""}`}
          />
          <div className="amp-footer">
            <span>
              <i className="status-dot" />{" "}
              {busy
                ? "READING WORKSPACE"
                : running
                  ? "RUN IN PROGRESS"
                  : data
                    ? "SYSTEM READY"
                    : "AWAITING CONNECTION"}
            </span>
            <span>Script & test presence · includes inherited scripts</span>
          </div>
        </section>
      )}
      {data?.warnings.map((w) => (
        <div key={w} className="notice">
          {w}
        </div>
      ))}
      {data && layout.equalizer && (
        <Equalizer
          key={source}
          job={scopedJob}
          collections={collections}
          selected={selected}
        />
      )}
      <section
        className={`transport stereo-transport ${switchOn ? "is-running" : ""}`}
      >
        <div className="transport-label">
          <span className="eyebrow">
            <i className="deck-led" /> TEST TRANSPORT
          </span>
          <span className="execution-route">
            {data ? sourceName : "Awaiting signal"} <b>→</b>{" "}
            {environmentOptions[environmentIndex].name}
          </span>
          <strong>
            {running
              ? "Running your collections…"
              : scopedJob
                ? "Session complete"
                : data
                  ? "Ready when you are."
                  : "Not tuned"}
          </strong>
          {job?.state === "running" && (
            <button
              disabled={busy}
              onClick={() =>
                void ask(
                  "Read status of this existing Postman run. Do not execute or rerun any collection.",
                  {
                    workspaceId: workspace,
                    environmentId: env,
                    source,
                    runId: job.id,
                  },
                )
              }
            >
              Refresh run status
            </button>
          )}
          {scopedJob && (
            <span>
              {finished}/{scopedJob.rows.length} collections · {passed} passed ·{" "}
              {failed} failed assertions
            </span>
          )}
        </div>
        <div className="transport-actions">
          {scopedJob && (
            <div className="run-stats">
              <b className={failed ? "orange-text" : ""}>
                {passed}
                <small>PASS</small>
              </b>
              <b className={failed ? "red-text" : ""}>
                {failed}
                <small>FAIL</small>
              </b>
            </div>
          )}
          <button
            className={`run-toggle ${switchOn ? "engaged" : ""}`}
            aria-label={running ? "Tests running" : "Run tests"}
            aria-pressed={!!switchOn}
            disabled={
              busy ||
              running ||
              !data ||
              !env ||
              !selected.length ||
              !cap?.canRun
            }
            onClick={() => setConfirm(true)}
          >
            <span className="toggle-label">RUN TESTS</span>
            <span className="toggle-housing" aria-hidden="true">
              <i className="toggle-lever" />
            </span>
            <span className="toggle-positions">
              <span className={!switchOn ? "active" : ""}>IDLE</span>
              <span className={switchOn ? "active" : ""}>RUN</span>
            </span>
          </button>
        </div>
        {scopedJob && (
          <div
            className="progress"
            role="progressbar"
            aria-label="Collections completed"
            aria-valuenow={finished}
            aria-valuemin={0}
            aria-valuemax={scopedJob.rows.length}
          >
            <span
              style={{ width: `${(finished / scopedJob.rows.length) * 100}%` }}
            />
          </div>
        )}
      </section>
      {!cap?.canRun && cap && (
        <div className="notice">
          Postman execution capability has not been confirmed by ChatGPT.
          Workspace inspection may still be available.
        </div>
      )}
      {confirm && (
        <section
          className="confirm"
          role="region"
          aria-label="Confirm test run"
        >
          <div>
            <strong>
              {`Run ${selected.length} collections against ${env !== "none" ? environments.find((e) => e.id === env)?.name : "their configured URLs"}?`}
            </strong>
            <p>
              These collections send real API requests and may change data in
              the selected environment.
            </p>
          </div>
          <button onClick={() => setConfirm(false)}>Cancel</button>
          <button className="run" onClick={() => void run()}>
            Start run
          </button>
        </section>
      )}
      {data && layout.details && (
        <section className="source-details" aria-label="Collection details">
          <div className="section-heading">
            <h3>{sourceName} · details</h3>
            <button onClick={() => setLayout({ ...layout, details: false })}>
              Hide details
            </button>
          </div>
          {collections.map((c) => (
            <details key={c.id}>
              <summary>
                {c.name}
                <span>
                  {c.requests ?? "—"} requests ·{" "}
                  {c.spec === null
                    ? "Spec unknown"
                    : c.spec
                      ? "OpenAPI linked"
                      : "No linked spec"}
                </span>
              </summary>
              <p>
                {c.error ??
                  `${c.pre ?? "Unknown"} requests with pre-request scripts · ${c.tests ?? "Unknown"} with post-response tests`}
              </p>
              {cap?.connected && (
                <a
                  href={`https://go.postman.co/collection/${encodeURIComponent(c.id)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Postman ↗
                </a>
              )}
            </details>
          ))}
        </section>
      )}
      <footer>
        <span>
          POSTMOD <b> / </b> By{" "}
          <a
            href="https://quintonwall.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            @quintonwall
          </a>
        </span>
        <span>
          {data
            ? "Updated " + new Date(data.updatedAt).toLocaleTimeString()
            : "Awaiting connection"}
          <span className="footer-dot">●</span>v0.1
        </span>
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Panel />);
