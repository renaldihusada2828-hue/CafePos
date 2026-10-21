import { createClient } from "@/lib/supabase/server";
import { formatDateTimeJakarta } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (profile?.role !== "admin") {
    return (
      <>
        <div className="topbar"><div><h1>Audit Log</h1></div></div>
        <div className="alert alert-error">Akses ditolak. Halaman ini hanya untuk admin.</div>
      </>
    );
  }

  const { data: logs } = await supabase
    .from("audit_log")
    .select(`
      id, action, entity, entity_id, detail, created_at,
      profiles!actor_id ( display_name, login_id )
    `)
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <>
      <div className="topbar">
        <div><h1>Audit Log</h1><p className="sub">300 entri terakhir. Read-only — tidak dapat diubah atau dihapus.</p></div>
      </div>

      <div className="card">
        {(!logs || logs.length === 0) ? (
          <div className="empty-state"><p>Belum ada entri audit log.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Waktu</th><th>Aktor</th><th>Aksi</th><th>Entitas</th><th>ID</th><th>Detail</th></tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actor = (log.profiles as unknown) as { display_name: string; login_id: string } | null;
                  return (
                    <tr key={log.id}>
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDateTimeJakarta(log.created_at)}</td>
                      <td>
                        <strong>{actor?.display_name ?? "—"}</strong>
                        {actor?.login_id && <div className="muted" style={{ fontSize: 11 }}>{actor.login_id}</div>}
                      </td>
                      <td>
                        <span className="badge badge-blue">{log.action}</span>
                      </td>
                      <td>{log.entity}</td>
                      <td className="muted" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", fontSize: 11 }}>
                        {log.entity_id ?? "—"}
                      </td>
                      <td>
                        {log.detail ? (
                          <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", maxWidth: 280, margin: 0, color: "#555" }}>
                            {JSON.stringify(log.detail, null, 2)}
                          </pre>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
