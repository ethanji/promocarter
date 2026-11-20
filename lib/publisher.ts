import { all, get, run, postsWhere } from "./db";
import { connectorFor, assetPath } from "./connectors";
import type { Network } from "./networks";

/** Publish one post to all of its pending/failed targets and roll up the status. */
export async function publishPost(id: number) {
  const post = postsWhere("id=?", id)[0];
  if (!post) return;
  const media = post.media.map((m: any) => ({ ...m, path: assetPath(m._file) }));
  run("UPDATE posts SET status='publishing' WHERE id=?", id);
  const targets = all(
    `SELECT t.account_id, a.network, a.handle FROM post_targets t JOIN accounts a ON a.id=t.account_id
     WHERE t.post_id=? AND t.status != 'published'`, id);
  const byAcct = new Map<number, any>(post.targets.map((t: any) => [t.account_id, t]));
  for (const t of targets) {
    try {
      const r = await connectorFor(t.network as Network).publish(
        { id: t.account_id, handle: t.handle },
        { content: byAcct.get(t.account_id)?.content || post.content, type: byAcct.get(t.account_id)?.type, options: byAcct.get(t.account_id)?.options ?? {}, media });
      run("UPDATE post_targets SET status='published', external_id=?, error=NULL WHERE post_id=? AND account_id=?",
        r.externalId, id, t.account_id);
    } catch (e: any) {
      run("UPDATE post_targets SET status='failed', error=? WHERE post_id=? AND account_id=?",
        String(e?.message ?? e), id, t.account_id);
    }
  }
  const failed = get("SELECT COUNT(*) n FROM post_targets WHERE post_id=? AND status!='published'", id)!.n;
  run("UPDATE posts SET status=?, published_at=? WHERE id=?",
    failed ? "failed" : "published", new Date().toISOString(), id);
}

let busy = false;
/** Publish everything that's due. Safe to call repeatedly. */
export async function tick() {
  if (busy) return 0;
  busy = true;
  try {
    const due = all("SELECT id FROM posts WHERE status='scheduled' AND scheduled_at <= ?", new Date().toISOString());
    for (const p of due) await publishPost(p.id);
    return due.length;
  } finally { busy = false; }
}

export { postsWhere };
