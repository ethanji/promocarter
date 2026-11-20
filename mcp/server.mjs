#!/usr/bin/env node
// PromoCarter MCP server (stdio). Talks to a running PromoCarter app over its HTTP API,
// so the app stays the single source of truth (and its scheduler does the publishing).
//   PROMOCARTER_URL  base URL of the app (default http://localhost:3100)
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.PROMOCARTER_URL || "http://localhost:3100").replace(/\/$/, "");
const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", pdf: "application/pdf" };

async function api(method, p, body) {
  let res;
  try {
    res = await fetch(BASE + p, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error(`Cannot reach PromoCarter at ${BASE}. Start it with: cd ~/Projects/promocarter && npm run dev`);
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
  return j;
}
const ok = (data) => ({ content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] });
const wrap = (fn) => async (args) => { try { return ok(await fn(args)); } catch (e) { return { isError: true, content: [{ type: "text", text: String(e.message || e) }] }; } };

const slimPost = (p) => ({
  id: p.id, status: p.status, content: p.content, scheduled_at: p.scheduled_at, published_at: p.published_at,
  accounts: p.targets.map((t) => ({ account_id: t.account_id, network: t.network, handle: t.handle, format: t.type, text_override: t.content, options: t.options, status: t.status, error: t.error })),
  media: p.media.map((m) => ({ id: m.id, name: m.name, kind: m.kind })),
});

const server = new McpServer({ name: "promocarter", version: "0.3.0" });
const RO = { readOnlyHint: true }, WR = { readOnlyHint: false, destructiveHint: false }, DEL = { readOnlyHint: false, destructiveHint: true };

// ---------- accounts & rules ----------
server.registerTool("list_accounts", { description: "List connected social accounts (ids are used as accountIds when creating posts).", inputSchema: {}, annotations: RO },
  wrap(() => api("GET", "/api/accounts")));

server.registerTool("get_network_rules", {
  description: "Supported networks and their post FORMATS (e.g. instagram: post/carousel/reel/story; youtube: video/short; x: post/thread; linkedin: post/document/poll). For each format: media rules (count, kinds, sizes), text limit, and extra option fields (title, visibility, privacy, poll options, thread posts…). Call this before create_post to know what each network needs.",
  inputSchema: { network: z.string().optional().describe("Limit to one network key, e.g. youtube") }, annotations: RO,
}, wrap(async ({ network }) => { const all = await api("GET", "/api/networks"); if (!network) return all; if (!all[network]) throw new Error(`Unknown network. Options: ${Object.keys(all).join(", ")}`); return all[network]; }));

// ---------- media library ----------
server.registerTool("list_assets", {
  description: "List media library assets (images/videos). Returns id, name, kind, size, alt text and how many posts use each.",
  inputSchema: { kind: z.enum(["image", "video", "document"]).optional(), query: z.string().optional().describe("Search file name / alt text") }, annotations: RO,
}, wrap(({ kind, query }) => api("GET", `/api/assets?kind=${kind ?? ""}&q=${encodeURIComponent(query ?? "")}`)));

server.registerTool("get_asset", { description: "Get one asset's details, including which posts use it.", inputSchema: { id: z.number().int() }, annotations: RO },
  wrap(({ id }) => api("GET", `/api/assets/${id}`)));

server.registerTool("upload_asset", {
  description: "Add an image or video to the media library from a local file path or an http(s) URL. Supported: JPG, PNG, GIF, WebP, MP4, MOV, WebM, PDF (max 1 GB). Returns the new asset (use its id in create_post.mediaIds).",
  inputSchema: { path: z.string().optional().describe("Absolute path of a local file"), url: z.string().url().optional().describe("http(s) URL to download from"), name: z.string().optional().describe("Override the file name"), alt: z.string().optional().describe("Alt text to set") },
  annotations: WR,
}, wrap(async ({ path: p, url, name, alt }) => {
  if (!!p === !!url) throw new Error("Provide exactly one of `path` or `url`.");
  let body, type, fname;
  if (p) {
    if (!path.isAbsolute(p)) throw new Error("`path` must be absolute.");
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) throw new Error(`File not found: ${p}`);
    fname = path.basename(p); type = MIME[fname.split(".").pop().toLowerCase()];
    body = Readable.toWeb(fs.createReadStream(p));
  } else {
    if (!/^https?:\/\//i.test(url)) throw new Error("Only http(s) URLs are supported.");
    const r = await fetch(url);
    if (!r.ok || !r.body) throw new Error(`Download failed: HTTP ${r.status}`);
    fname = decodeURIComponent(new URL(url).pathname.split("/").pop() || "download");
    type = (r.headers.get("content-type") || "").split(";")[0] || MIME[fname.split(".").pop().toLowerCase()];
    body = r.body;
  }
  const res = await fetch(`${BASE}/api/assets?name=${encodeURIComponent(name || fname)}`, { method: "POST", headers: { "Content-Type": type || "application/octet-stream" }, body, duplex: "half" })
    .catch(() => { throw new Error(`Cannot reach PromoCarter at ${BASE}.`); });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Upload failed (HTTP ${res.status})`);
  return alt ? api("PATCH", `/api/assets/${j.id}`, { alt }) : j;
}));

server.registerTool("update_asset", { description: "Rename an asset or set its alt text.", inputSchema: { id: z.number().int(), name: z.string().optional(), alt: z.string().optional() }, annotations: WR },
  wrap(({ id, ...b }) => api("PATCH", `/api/assets/${id}`, b)));

server.registerTool("delete_asset", {
  description: "Permanently delete an asset and its file. Refuses if a draft/scheduled post uses it unless force=true (which detaches it from those posts). Confirm with the user first.",
  inputSchema: { id: z.number().int(), force: z.boolean().optional() }, annotations: DEL,
}, wrap(({ id, force }) => api("DELETE", `/api/assets/${id}${force ? "?force=1" : ""}`)));

// ---------- posts ----------
server.registerTool("list_posts", {
  description: "List posts, optionally by date range (ISO) and/or status. Statuses: draft, scheduled, publishing, published, failed.",
  inputSchema: { from: z.string().optional().describe("ISO start (inclusive), needs `to`"), to: z.string().optional().describe("ISO end (exclusive)"), status: z.enum(["draft", "scheduled", "publishing", "published", "failed"]).optional() }, annotations: RO,
}, wrap(async ({ from, to, status }) => {
  const qs = new URLSearchParams(); if (from && to) { qs.set("from", from); qs.set("to", to); } if (status) qs.set("status", status);
  return (await api("GET", `/api/posts?${qs}`)).map(slimPost);
}));

server.registerTool("get_post", { description: "Get one post with per-account publish status and errors.", inputSchema: { id: z.number().int() }, annotations: RO },
  wrap(async ({ id }) => slimPost(await api("GET", `/api/posts/${id}`))));

const targetShape = z.object({
  accountId: z.number().int().describe("Account id from list_accounts"),
  type: z.string().optional().describe("Format key for that network, e.g. reel, story, carousel, short, thread, document, poll, pin, event. Default: the network's first format. See get_network_rules."),
  content: z.string().optional().describe("Optional text just for this network (overrides the shared content)"),
  options: z.record(z.string(), z.any()).optional().describe("Format fields, e.g. {title, visibility, tags, privacy, thread:[...], pollOptions:[...], pollDuration, board, link, firstComment, thumbnail:<assetId>}"),
});
const postShape = {
  content: z.string().describe("Shared post text (caption / description / first post of a thread / poll question)"),
  targets: z.array(targetShape).optional().describe("Per-network settings. Preferred."),
  accountIds: z.array(z.number().int()).optional().describe("Shortcut: accounts using each network's default format and the shared text"),
  mediaIds: z.array(z.number().int()).optional().describe("Asset ids in display order (shared by all targets)"),
  action: z.enum(["draft", "schedule", "publish_now"]).describe("draft = save only; schedule = publish at scheduledAt; publish_now = publish immediately"),
  scheduledAt: z.string().optional().describe("ISO 8601 date-time with timezone, e.g. 2026-12-01T15:00:00Z. Required for schedule."),
};
server.registerTool("create_post", {
  description: "Create a post for one or more networks, each with its own format (post/reel/story/short/thread/…) and options. Validates every target against that format's rules and returns all problems at once. NOTE: `schedule` and `publish_now` cause real publishing once real network connectors are configured — confirm with the user before using them. Prefer `draft` when unsure.",
  inputSchema: postShape, annotations: WR,
}, wrap(async (b) => slimPost(await api("POST", "/api/posts", b))));

server.registerTool("update_post", {
  description: "Edit an existing post. Only provide fields you want to change; the rest are kept (including each network's format/options). Providing `targets` replaces the whole target list.",
  inputSchema: { id: z.number().int(), content: postShape.content.optional(), targets: postShape.targets, accountIds: postShape.accountIds, mediaIds: postShape.mediaIds, action: postShape.action.optional(), scheduledAt: postShape.scheduledAt }, annotations: WR,
}, wrap(async ({ id, ...ch }) => {
  const cur = await api("GET", `/api/posts/${id}`);
  const curT = cur.targets.map((t) => ({ accountId: t.account_id, type: t.type, content: t.content ?? undefined, options: t.options }));
  const targets = ch.targets ?? (ch.accountIds ? ch.accountIds.map((a) => curT.find((t) => t.accountId === a) ?? { accountId: a }) : curT);
  const b = {
    content: ch.content ?? cur.content, targets,
    mediaIds: ch.mediaIds ?? cur.media.map((m) => m.id),
    action: ch.action ?? (cur.status === "draft" ? "draft" : "schedule"),
    scheduledAt: ch.scheduledAt ?? cur.scheduled_at ?? undefined,
  };
  return slimPost(await api("PUT", `/api/posts/${id}`, b));
}));

server.registerTool("reschedule_post", { description: "Move a post to a new date/time.", inputSchema: { id: z.number().int(), scheduledAt: z.string().describe("ISO 8601 with timezone") }, annotations: WR },
  wrap(async ({ id, scheduledAt }) => slimPost(await api("PATCH", `/api/posts/${id}`, { scheduledAt }))));

server.registerTool("publish_post_now", { description: "Publish an existing post immediately to its accounts (retries failed accounts). Confirm with the user first.", inputSchema: { id: z.number().int() }, annotations: WR },
  wrap(async ({ id }) => {
    const cur = await api("GET", `/api/posts/${id}`);
    return slimPost(await api("PUT", `/api/posts/${id}`, { content: cur.content, targets: cur.targets.map((t) => ({ accountId: t.account_id, type: t.type, content: t.content ?? undefined, options: t.options })), mediaIds: cur.media.map((m) => m.id), action: "publish_now" }));
  }));

server.registerTool("delete_post", { description: "Permanently delete a post (media stays in the library). Confirm with the user first.", inputSchema: { id: z.number().int() }, annotations: DEL },
  wrap(({ id }) => api("DELETE", `/api/posts/${id}`)));

await server.connect(new StdioServerTransport());
