# Development notes

## Stack
Next.js 15 (App Router) + React 19 + TypeScript · SQLite via Node's built-in `node:sqlite` · plain CSS · MCP SDK + zod for the MCP server. No ORM, no native modules.

## Layout
```
app/page.tsx                 planner (month/week/list)
app/compose/Composer.tsx     composer (uses MediaPicker)
app/media/page.tsx           media library
app/accounts/page.tsx        connections
app/components/              NetBadge, Sidebar, FieldInput, PostPreview, MediaThumb, MediaPicker, Uploader
app/api/…                    route handlers (accounts, assets, posts, networks, scheduler)
lib/db.ts                    schema + query helpers
lib/networks.ts              networks, FORMATS, per-format rules + validateTarget()  (shared by UI and server)
lib/media.ts                 allowed types, upload limit
lib/posts.ts                 create/update logic + validation
lib/connectors.ts            connector interface + mock
lib/publisher.ts             publishPost(), tick()
lib/client.ts                browser upload helper (XHR with progress)
instrumentation*.ts          starts the 15 s scheduler timer when the server boots
mcp/server.mjs               MCP server
```

## Data model (SQLite, `data/promocarter.db`)
- `accounts(id, network, handle, created_at)`
- `posts(id, content, status, scheduled_at, published_at, created_at)`
- `post_targets(post_id, account_id, status, external_id, error, type, options, content)` — one row per account per post; `type` = format key, `options` = JSON of the format's fields, `content` = per-network text override (NULL = shared text)
- `assets(id, name, mime, kind, size, file, alt, created_at)` — `file` is the stored name in `data/uploads/` (UUID + extension; the display name is separate)
- `post_media(post_id, asset_id, position)` — ordered attachments; cascades on delete

Tables are created on first start (`CREATE TABLE IF NOT EXISTS`); `lib/db.ts` also adds the `type/options/content` columns to databases created by earlier versions. There is no general migration system yet: when changing the schema, add columns the same way.

## How publishing works
1. `instrumentation-node.ts` sets an interval (15 s) calling `tick()` (guards against overlap).
2. `tick()` selects posts with `status='scheduled' AND scheduled_at <= now` and calls `publishPost(id)`.
3. `publishPost` marks `publishing`, loops over the post's pending/failed targets, calls `connectorFor(network).publish(account, {content, type, options, media})` (`content` already has the per-network override applied), records `external_id` or `error` per target, and sets the post `published` (all OK) or `failed`.
4. `publish_now` does steps 2–3 immediately, inline with the API request.

Single process, single instance assumed. Running two servers on one database could publish a post twice.

## Writing a real connector
Implement `Connector` in `lib/connectors.ts` and register it:
```ts
import fs from "node:fs";
const bluesky: Connector = {
  async publish(account, post) {
    // account.handle, post.content (this network's text)
    // post.type    = format key: 'reel' | 'story' | 'short' | 'thread' | 'poll' | 'document' | 'pin' | …
    // post.options = the format's fields: { title, visibility, thread: [...], pollOptions: [...], board, link, … }
    // post.media: [{id, kind:'image'|'video', mime, name, size, alt, path}]  ← read bytes from path
    const bytes = fs.readFileSync(post.media[0].path);
    // …upload blobs, create the record, using credentials for this account…
    return { externalId: "<id from the network>" };   // throw new Error("reason") to fail this account
  },
};
const registry: Partial<Record<Network, Connector>> = { bluesky };
```
What a real integration still needs (not built):
- **Credentials**: add columns to `accounts` (e.g. `access_token`, `refresh_token`, `expires_at`) and an OAuth/app-password flow on the Accounts page. Store secrets encrypted or at least with strict file permissions on `data/`.
- **Token refresh** and error classification (retry vs. permanent failure).
- **Rate limits / retries**: today a failed account stays `failed` until you retry manually.
- Platform specifics: video processing/polling (Instagram, LinkedIn), required app review for Meta/LinkedIn/X API access, alt text field mapping (`media[].alt`).
Easiest to start with: Bluesky (app password) and Mastodon (access token) — no app review.

## Adding a network or format
Everything is data in `NETWORKS` (`lib/networks.ts`): a network has `formats[]`; each format declares its media rule (min/max count, allowed kinds, sizes, mixing), text limit/label, and `fields[]` (type text/url/select/toggle/list/datetime/thumbnail). The composer's tabs, field inputs, preview, server validation, `/api/networks`, the MCP tool and the Connections page all derive from it — add an entry (and add its key to the `Network` union) and it appears everywhere. Then regenerate `docs/FORMATS.md` content if you want the doc to match. Platform limits change; verify against current platform docs.

## Commands
```bash
npm run dev      # dev server, hot reload
npm run build    # production build
npm run start    # production server
npm run mcp      # run MCP server on stdio
npx tsc --noEmit # type-check
```

## Known limitations
- **No authentication / multi-user.** Anyone who can reach the port has full control. Binds to 127.0.0.1 by default.
- **Publishing is mocked.** No OAuth, no real network calls.
- No analytics, inbox, competitor tracking, link-in-bio, reports, approvals, autolists, CSV bulk import, best-time-to-post (none of these are built yet).
- Media is shared across a post's targets (no per-network media sets), and one account takes one format per post.
- Formats/limits are approximations, not verified against each platform's current API.
- Rumble: no known public upload API, so a real connector may be hard.
- Video thumbnails come from the browser (first frame); files the browser can't decode show a blank preview but are stored and served normally.
- No transcoding/resizing: media is posted exactly as uploaded.
- No schema migrations; no automated tests.
- Next.js dev mode keeps a DB handle open across hot reloads (`globalThis.__db`); restart the server after schema changes.
- Timezone handling is browser-local; there is no per-account timezone or "best time to post" feature.
