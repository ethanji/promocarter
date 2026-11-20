import { all, run, postsWhere } from "./db";
import { NETWORKS, Network, formatOf, validateTarget } from "./networks";

export interface TargetInput { accountId: number; type?: string; content?: string | null; options?: Record<string, any> }

/**
 * Shared create/update. `action`: draft | schedule | publish_now.
 * Targets: `targets: [{accountId, type?, content?, options?}]`, or legacy `accountIds: number[]` (default format, shared text).
 */
export function save(id: number | null, b: any): { id: number } | { error: string } {
  const targets: TargetInput[] = Array.isArray(b.targets)
    ? b.targets.map((t: any) => ({ accountId: Number(t.accountId), type: t.type, content: t.content ?? null, options: t.options ?? {} }))
    : (b.accountIds ?? []).map((a: any) => ({ accountId: Number(a), options: {} }));
  if (new Set(targets.map((t) => t.accountId)).size !== targets.length) return { error: "An account is listed twice." };
  const mediaIds: number[] = [...new Set<number>((b.mediaIds ?? []).map(Number))];
  const content = String(b.content ?? "");
  const action = b.action ?? "draft";

  const media = mediaIds.length ? all(`SELECT id,name,kind,size FROM assets WHERE id IN (${mediaIds.map(() => "?").join(",")})`, ...mediaIds) : [];
  if (media.length !== mediaIds.length) return { error: "One or more media assets no longer exist." };
  const ordered = mediaIds.map((i) => media.find((m) => m.id === i)!);
  const ids = targets.map((t) => t.accountId);
  const accts = ids.length ? all(`SELECT id,network,handle FROM accounts WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids) : [];
  if (accts.length !== ids.length) return { error: "One or more accounts no longer exist." };

  // resolve + validate each target
  const resolved = targets.map((t) => {
    const a = accts.find((x) => x.id === t.accountId)!, net = a.network as Network;
    const f = NETWORKS[net].formats.find((x) => x.key === t.type);
    return { ...t, a, net, f, fkey: (f ?? formatOf(net)).key };
  });
  const unknown = resolved.find((t) => t.type && !t.f);
  if (unknown) return { error: `${NETWORKS[unknown.net].label} has no "${unknown.type}" format. Options: ${NETWORKS[unknown.net].formats.map((x) => x.key).join(", ")}.` };

  if (action !== "draft") {
    if (!resolved.length) return { error: "Pick at least one account." };
    const errs: string[] = [];
    for (const t of resolved) {
      const text = t.content?.trim() ? t.content : content;
      errs.push(...validateTarget(t.net, t.fkey, text, ordered as any, t.options ?? {}).map((e) => `${e} (${t.a.handle})`));
      const th = t.options?.thumbnail;
      if (th && !all("SELECT id FROM assets WHERE id=? AND kind='image'", Number(th)).length) errs.push(`${NETWORKS[t.net].label}: thumbnail must be an image from the library.`);
    }
    if (errs.length) return { error: errs.join("  ") };
  }
  if (action === "schedule" && (!b.scheduledAt || isNaN(Date.parse(b.scheduledAt)))) return { error: "Pick a date and time." };

  const status = action === "draft" ? "draft" : "scheduled";
  const at = action === "publish_now" ? new Date().toISOString() : b.scheduledAt ? new Date(b.scheduledAt).toISOString() : null;
  if (id == null) {
    id = Number(run("INSERT INTO posts (content, status, scheduled_at) VALUES (?,?,?)", content, status, at).lastInsertRowid);
  } else {
    run("UPDATE posts SET content=?, status=?, scheduled_at=?, published_at=NULL WHERE id=?", content, status, at, id);
    run("DELETE FROM post_targets WHERE post_id=? AND account_id NOT IN (" + (ids.map(() => "?").join(",") || "NULL") + ")", id, ...ids);
  }
  for (const t of resolved)
    run(`INSERT INTO post_targets (post_id, account_id, type, options, content) VALUES (?,?,?,?,?)
         ON CONFLICT(post_id, account_id) DO UPDATE SET type=excluded.type, options=excluded.options, content=excluded.content`,
      id, t.accountId, t.fkey, JSON.stringify(t.options ?? {}), t.content?.trim() ? t.content : null);
  run("UPDATE post_targets SET status='pending', error=NULL WHERE post_id=? AND status='failed'", id);
  run("DELETE FROM post_media WHERE post_id=?", id);
  mediaIds.forEach((m, i) => run("INSERT INTO post_media (post_id, asset_id, position) VALUES (?,?,?)", id!, m, i));
  return { id };
}

/** Remove internal fields before sending posts to clients. */
export const strip = (posts: any[]) => posts.map((p) => ({ ...p, media: p.media.map(({ _file, ...m }: any) => m) }));
export const one = (id: number) => strip(postsWhere("id=?", id))[0];
