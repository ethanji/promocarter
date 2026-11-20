# HTTP API

Base URL `http://localhost:3100`. JSON in/out unless noted. **No authentication** — keep the server on localhost. Errors: `{ "error": "message" }` with a 4xx status. Dates are ISO 8601; the server stores UTC.

The web UI and the MCP server both use only this API.

## Accounts
| Method & path | Body / query | Result |
|---|---|---|
| `GET /api/accounts` | – | `[ {id, network, handle, created_at} ]` |
| `POST /api/accounts` | `{network, handle}` — network ∈ x, instagram, facebook, linkedin, bluesky, mastodon | the account |
| `DELETE /api/accounts?id=1` | – | `{ok:true}` (removes it from posts' targets) |

## Network rules
`GET /api/networks` → `{ "<network>": { label, short, color, formats: [ { key, label, icon, hint, usesText, textRequired, textMax, textLabel, shape, media: {min,max,maxVideos,kinds,mix,imageMB,videoMB,docMB}, fields: [ {key,label,type,required,max,options,default,minItems,maxItems} ] } ] } }`

Network keys: `instagram facebook tiktok youtube rumble x linkedin threads pinterest google bluesky mastodon`. Human-readable table: [FORMATS.md](FORMATS.md). Field `type`: text, url, select, toggle, list (array of strings), datetime, thumbnail (asset id of an image).

## Assets (media library)
### List
`GET /api/assets?kind=image|video|document&q=text` →
```json
[{"id":3,"name":"a.png","mime":"image/png","kind":"image","size":589,"alt":null,"created_at":"2026-11-19T03:35:56.986Z","used":0}]
```
### Upload
`POST /api/assets?name=<filename>` — body is the **raw file bytes** (not multipart); `Content-Type` is the file's MIME type (if it's missing/generic, the type is inferred from the extension in `name`). Streams to disk.
```bash
curl -X POST "http://localhost:3100/api/assets?name=photo.jpg" \
     -H "Content-Type: image/jpeg" --data-binary @photo.jpg
```
→ `201` + asset. `415` unsupported type, `413` over 1 GB, `400` empty/failed.

### One asset
- `GET /api/assets/{id}` → asset + `usedBy: [{id,status,content,scheduled_at}]`
- `PATCH /api/assets/{id}` `{name?, alt?}` → asset
- `DELETE /api/assets/{id}[?force=1]` → `{ok:true}`; `409` with `usedBy` if a draft/scheduled post uses it and `force` not set
- `GET /api/assets/{id}/file[?download=1]` → the original bytes, with HTTP `Range` support (video seeking)

## Posts
Post object:
```json
{ "id": 7, "content": "shared text", "status": "scheduled",
  "scheduled_at": "2026-12-01T15:00:00.000Z", "published_at": null,
  "targets": [{"account_id":1,"network":"youtube","handle":"@me","type":"short",
               "content":null,"options":{"title":"Hi","visibility":"public"},
               "status":"pending","external_id":null,"error":null}],
  "media":   [{"id":3,"name":"clip.mp4","mime":"video/mp4","kind":"video","size":11508,"alt":null}] }
```
`status`: draft | scheduled | publishing | published | failed. Target `status`: pending | published | failed. `target.content` is the per-network text override (null = use shared `content`). `target.type` is the format key.

| Method & path | Body / query | Notes |
|---|---|---|
| `GET /api/posts` | optional `from`,`to` (ISO; both) and/or `status` | all posts if no filters |
| `POST /api/posts` | create body (below) | `publish_now` publishes before responding |
| `GET /api/posts/{id}` | – | |
| `PUT /api/posts/{id}` | create body — **full replace** of content/targets/media/time | |
| `PATCH /api/posts/{id}` | `{scheduledAt}` | reschedule only |
| `DELETE /api/posts/{id}` | – | media stays in library |

Create body:
```json
{ "content": "Launch day!",
  "targets": [
    { "accountId": 1, "type": "reel" },
    { "accountId": 2, "type": "short", "options": { "title": "Launch day", "visibility": "public" } },
    { "accountId": 3, "type": "post", "content": "Shorter text just for X" }
  ],
  "mediaIds": [3],
  "action": "draft | schedule | publish_now", "scheduledAt": "2026-12-01T15:00:00Z" }
```
- `targets[].type` defaults to the network's first format; `content` optional override; `options` = the format's fields (see `/api/networks`).
- Shortcut: `"accountIds": [1,2]` (instead of `targets`) = default format, shared text, no options.
- `draft`: saved, no validation. `schedule`: needs `scheduledAt`. `schedule` and `publish_now` validate **every target** (media kind/count/size, text length, required fields) and return **all** problems in one `400` message. One account may appear only once per post.

Examples:
```bash
# Instagram Reel + YouTube Short from one video asset (id 3)
curl -X POST localhost:3100/api/posts -d '{"content":"Hi","mediaIds":[3],"action":"schedule","scheduledAt":"2030-01-01T09:00:00Z",
  "targets":[{"accountId":1,"type":"reel"},{"accountId":2,"type":"short","options":{"title":"Hi"}}]}'
# LinkedIn poll
curl -X POST localhost:3100/api/posts -d '{"content":"Which feature next?","action":"draft",
  "targets":[{"accountId":4,"type":"poll","options":{"pollOptions":["Analytics","Inbox"],"pollDuration":"7"}}]}'
```

## Scheduler
`POST /api/scheduler` → `{published: n}` — runs the "publish everything due" pass now (also runs automatically every 15 s).
