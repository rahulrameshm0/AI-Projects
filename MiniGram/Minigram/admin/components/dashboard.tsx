"use client";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api, type Id } from "../convex-api";
import { useState } from "react";
const explain = (e: unknown) =>
  e && typeof e === "object" && "data" in e && typeof e.data === "string"
    ? e.data
    : e instanceof Error
      ? e.message
      : "Unable to complete this action.";
export function Dashboard() {
  const [tab, setTab] = useState("Reports"),
    stats = useQuery(api.admin.dashboard, {});
  return (
    <div className="shell">
      <aside>
        <p className="nav-title">COMMUNITY</p>
        {["Reports", "People", "Invitations", "Controls", "Audit log"].map(
          (t) => (
            <button
              className={tab === t ? "selected" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
              {t === "Reports" && !!stats?.openReports && (
                <b>{stats.openReports}</b>
              )}
            </button>
          ),
        )}
        <div className="beta">
          <strong>Invite-only beta</strong>
          <p>{stats?.settings?.admitted || 0} / 100 accounts</p>
          <div className="meter">
            <i style={{ width: `${stats?.settings?.admitted || 0}%` }} />
          </div>
        </div>
      </aside>
      <main>
        <div className="page-title">
          <div>
            <p>MiniGram operations</p>
            <h1>{tab}</h1>
          </div>
          <span className="status">Development</span>
        </div>
        {tab === "Reports" ? (
          <Reports />
        ) : tab === "People" ? (
          <People />
        ) : tab === "Invitations" ? (
          <Invitations />
        ) : tab === "Controls" ? (
          <Controls />
        ) : (
          <Audit />
        )}
      </main>
    </div>
  );
}
function Reports() {
  const [status, setStatus] = useState<"open" | "resolved">("open"),
    {
      results,
      status: pageStatus,
      loadMore,
    } = usePaginatedQuery(
      api.admin.reports,
      { status },
      { initialNumItems: 20 },
    ),
    resolve = useMutation(api.admin.resolve),
    { getToken } = useAuth(),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState(""),
    [evidence, setEvidence] = useState<{ url: string; type: string } | null>(
      null,
    );
  const act = async (id: Id<"reports">, action: "dismiss" | "remove") => {
    const reason = prompt(
      action === "remove"
        ? "Reason for removing content or suspending the reported account:"
        : "Reason for dismissing this report:",
    );
    if (!reason?.trim()) return;
    setBusy(id);
    setError("");
    try {
      await resolve({ id, action, reason });
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(null);
    }
  };
  const open = async (id: Id<"reports">) => {
    try {
      setError("");
      const token = await getToken({ template: "convex" }),
        base = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
      if (!base) throw new Error("The media server is not configured.");
      const response = await fetch(`${base}/evidence?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Evidence is unavailable or expired.");
      const blob = await response.blob();
      setEvidence({ url: URL.createObjectURL(blob), type: blob.type });
    } catch (e) {
      setError(explain(e));
    }
  };
  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          {(["open", "resolved"] as const).map((s) => (
            <button
              className={status === s ? "active" : ""}
              key={s}
              onClick={() => setStatus(s)}
            >
              {s === "open" ? "Needs review" : "Resolved"}
            </button>
          ))}
        </div>
        <p>Evidence expires after 30 days</p>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="cards">
        {results.map((r) => (
          <article key={r._id}>
            <div className="card-top">
              <span className="tag">{r.targetType}</span>
              <time>{new Date(r._creationTime).toLocaleString("en-IN")}</time>
            </div>
            <h2>{r.reason}</h2>
            <p className="subtle">Target: {r.targetId}</p>
            <details>
              <summary>View captured content</summary>
              <pre>{r.evidence || "Evidence has expired."}</pre>
            </details>
            {r.evidenceStorage && r.expiresAt > Date.now() && (
              <button className="secondary" onClick={() => void open(r._id)}>
                View reported media
              </button>
            )}
            {r.status === "open" ? (
              <div className="actions">
                <button
                  disabled={!!busy}
                  onClick={() => void act(r._id, "dismiss")}
                >
                  Dismiss report
                </button>
                <button
                  disabled={!!busy}
                  className="danger"
                  onClick={() => void act(r._id, "remove")}
                >
                  {r.targetType === "user"
                    ? "Suspend account"
                    : "Remove content"}
                </button>
              </div>
            ) : (
              <p className="resolution">Resolved: {r.resolution}</p>
            )}
          </article>
        ))}
      </div>
      {!results.length && (
        <Empty
          title={
            pageStatus === "LoadingFirstPage"
              ? "Loading reports…"
              : "No reports here"
          }
          description="Reports submitted by the community will appear here for review."
        />
      )}
      <More status={pageStatus} load={() => loadMore(20)} />
      {evidence && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Reported media"
        >
          <div className="modal">
            <button
              className="close"
              onClick={() => {
                URL.revokeObjectURL(evidence.url);
                setEvidence(null);
              }}
            >
              Close
            </button>
            {evidence.type.startsWith("video/") ? (
              <video src={evidence.url} controls />
            ) : (
              <img src={evidence.url} alt="Reported content" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
function People() {
  const { results, status, loadMore } = usePaginatedQuery(
      api.admin.users,
      {},
      { initialNumItems: 30 },
    ),
    suspend = useMutation(api.admin.suspend),
    [term, setTerm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const act = async (id: Id<"users">, suspended: boolean) => {
    const reason = prompt(
      suspended
        ? "Reason for suspension:"
        : "Reason for restoring this account:",
    );
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      setError("");
      await suspend({ id, suspended, reason });
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="toolbar">
        <input
          aria-label="Filter loaded accounts"
          placeholder="Filter loaded accounts…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <p>Account restrictions are enforced by the backend</p>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Status</th>
              <th>Privacy</th>
              <th>Joined</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {results
              .filter((u) =>
                `${u.username} ${u.displayName}`
                  .toLowerCase()
                  .includes(term.toLowerCase()),
              )
              .map((u) => (
                <tr key={u._id}>
                  <td>
                    <strong>{u.displayName || "Profile incomplete"}</strong>
                    <small>
                      @{u.username || "—"}
                      {u.admin ? " · Admin" : ""}
                    </small>
                  </td>
                  <td>
                    <span className={`tag ${u.status}`}>{u.status}</span>
                  </td>
                  <td>{u.privacy}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                  <td>
                    {u.admitted && !u.admin && u.status !== "deleting" && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          void act(u._id, u.status !== "suspended")
                        }
                      >
                        {u.status === "suspended" ? "Restore" : "Suspend"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <More status={status} load={() => loadMore(30)} />
    </>
  );
}
function Invitations() {
  const { results, status, loadMore } = usePaginatedQuery(
      api.admin.invites,
      {},
      { initialNumItems: 30 },
    ),
    create = useMutation(api.admin.createInvite),
    revoke = useMutation(api.admin.revokeInvite),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <div className="toolbar">
        <p>Single-use codes expire after seven days</p>
        <button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError("");
            create({})
              .then((r) => setCode(r.code))
              .catch((e) => setError(explain(e)))
              .finally(() => setBusy(false));
          }}
        >
          Create invitation
        </button>
      </div>
      {code && (
        <div className="invite">
          <div>
            <strong>Save this code now. It’s shown only once.</strong>
            <code>{code}</code>
          </div>
          <button
            className="secondary"
            onClick={() => navigator.clipboard.writeText(code)}
          >
            Copy code
          </button>
          <button className="secondary" onClick={() => setCode("")}>
            Dismiss
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code ending</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {results.map((i) => (
              <tr key={i._id}>
                <td>
                  <code>••••••{i.hint}</code>
                </td>
                <td>{new Date(i._creationTime).toLocaleDateString("en-IN")}</td>
                <td>{new Date(i.expiresAt).toLocaleDateString("en-IN")}</td>
                <td>
                  {i.redeemedBy
                    ? "Used"
                    : i.revoked
                      ? "Revoked"
                      : i.expiresAt < Date.now()
                        ? "Expired"
                        : "Available"}
                </td>
                <td>
                  {!i.redeemedBy && !i.revoked && i.expiresAt > Date.now() && (
                    <button
                      className="secondary"
                      onClick={() => {
                        if (confirm("Revoke this unused invitation?"))
                          revoke({ id: i._id }).catch((e) =>
                            setError(explain(e)),
                          );
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!results.length && (
        <Empty
          title="No invitations yet"
          description="Create a code to invite someone into the beta."
        />
      )}
      <More status={status} load={() => loadMore(30)} />
    </>
  );
}
function Controls() {
  const data = useQuery(api.admin.dashboard, {}),
    update = useMutation(api.admin.controls),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!data?.settings)
    return <Empty title="Loading beta controls…" description="" />;
  const s = data.settings;
  const change = (uploadsEnabled: boolean, admissionsEnabled: boolean) => {
    setBusy(true);
    setError("");
    update({ uploadsEnabled, admissionsEnabled })
      .catch((e) => setError(explain(e)))
      .finally(() => setBusy(false));
  };
  return (
    <>
      <div className="stats">
        <article>
          <p>Admitted accounts</p>
          <strong>
            {s.admitted}
            <span> / 100</span>
          </strong>
        </article>
        <article>
          <p>Managed storage</p>
          <strong>
            {(s.storedBytes / 1024 ** 3).toFixed(2)}
            <span> / {(s.maxStoredBytes / 1024 ** 3).toFixed(0)} GB</span>
          </strong>
        </article>
      </div>
      {error && <p className="error">{error}</p>}
      <article>
        <h2>Operational limits</h2>
        <p>
          Uploads stop automatically at the storage cap. Text messaging and
          existing content remain available when uploads are paused.
        </p>
        <div className="control">
          <div>
            <strong>New uploads</strong>
            <p>Photos and videos in posts, messages, and profiles</p>
          </div>
          <button
            disabled={busy}
            className={s.uploadsEnabled ? "secondary" : "danger"}
            onClick={() => change(!s.uploadsEnabled, s.admissionsEnabled)}
          >
            {s.uploadsEnabled ? "Pause uploads" : "Resume uploads"}
          </button>
        </div>
        <div className="control">
          <div>
            <strong>New admissions</strong>
            <p>Invitation redemption, capped at 100 accounts</p>
          </div>
          <button
            disabled={busy}
            className="secondary"
            onClick={() => change(s.uploadsEnabled, !s.admissionsEnabled)}
          >
            {s.admissionsEnabled ? "Pause admissions" : "Resume admissions"}
          </button>
        </div>
      </article>
      <article>
        <h2>Beta defaults</h2>
        <p>
          20 posts, 40 uploads, 20 new message requests, and 500 messages per
          account per day. Images: 10 MB. Videos: 60 seconds and 50 MB. Content
          is available only to admitted members.
        </p>
        <p>
          Storage usage includes retained evidence. Provider billing alerts and
          monthly spend must also be monitored in the Clerk and Convex
          dashboards.
        </p>
      </article>
    </>
  );
}
function Audit() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.audit,
    {},
    { initialNumItems: 30 },
  );
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Target</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r._id}>
                <td>{new Date(r._creationTime).toLocaleString("en-IN")}</td>
                <td>{r.action.replaceAll("_", " ")}</td>
                <td>
                  <code>{r.target}</code>
                </td>
                <td>{r.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <More status={status} load={() => loadMore(30)} />
    </>
  );
}
function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
function More({ status, load }: { status: string; load: () => void }) {
  return (
    <div className="more">
      {status === "CanLoadMore" ? (
        <button className="secondary" onClick={load}>
          Load more
        </button>
      ) : status === "LoadingMore" ? (
        <p>Loading…</p>
      ) : null}
    </div>
  );
}
