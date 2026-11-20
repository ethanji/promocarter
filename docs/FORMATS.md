# Networks & post formats

Every selected network gets its **own format** in the composer (post, reel, story, short, thread, document, poll…), its own optional text, and its own extra fields. Everything below is enforced by the app before a post can be scheduled or published, and is available from the API/MCP as `GET /api/networks`.

> **These limits are approximations** based on each platform's general behavior and public descriptions of which formats exist. Platforms change rules often — verify against current platform documentation before going live, and edit `lib/networks.ts` to adjust. `*` = required field. I'm not aware of a public upload API for Rumble, so a real Rumble connector may need partner access or another approach.

| Network | Format (`key`) | Media | Text | Extra fields |
|---|---|---|---|---|
| Instagram | `post` 🖼 Post | 1 image/video<br>img 8 MB, video 300 MB | Caption ≤2200 | Collaborators, First comment |
| Instagram | `carousel` 🗂 Carousel | 2–10 image/video, mixing OK<br>img 8 MB, video 300 MB | Caption ≤2200 | Collaborators, First comment |
| Instagram | `reel` 🎬 Reel | 1 video<br>video 300 MB | Caption ≤2200 | Collaborators, Trial reel, Also share to feed, First comment |
| Instagram | `story` ⏱ Story | 1 image/video<br>img 8 MB, video 100 MB | no caption | — |
| Facebook | `post` 📝 Post | 0–10 image/video (max 1 video)<br>img 10 MB, video 1024 MB | Text ≤63206 | First comment |
| Facebook | `carousel` 🗂 Carousel | 2–10 image<br>img 10 MB | Text ≤63206 | First comment |
| Facebook | `reel` 🎬 Reel | 1 video<br>video 1024 MB | Caption ≤2200 | — |
| Facebook | `story` ⏱ Story | 1 image/video<br>img 10 MB, video 1024 MB | no caption | — |
| TikTok | `video` 🎬 Video | 1 video<br>video 1024 MB | Caption ≤2200 | Who can watch, Allow comments, Allow duets, Allow stitches |
| TikTok | `photo` 🗂 Photo carousel | 1–35 image<br>img 20 MB | Caption ≤2200 | Title, Who can watch, Allow comments |
| YouTube | `video` ▶️ Video | 1 video<br>video 1024 MB | Description ≤5000 | Title*, Visibility, Tags, Custom thumbnail, Made for kids |
| YouTube | `short` 📱 Short | 1 video<br>video 1024 MB | Description ≤5000 | Title*, Visibility, Tags |
| Rumble | `video` ▶️ Video | 1 video<br>video 1024 MB | Description ≤5000 | Title*, Visibility, Tags, Custom thumbnail |
| X | `post` 📝 Post | 0–4 image/video (max 1 video)<br>img 5 MB, video 512 MB | Text ≤280 | — |
| X | `thread` 🧵 Thread | 0–4 image/video (max 1 video)<br>img 5 MB, video 512 MB | First post ≤280 | Next posts in the thread* |
| LinkedIn | `post` 📝 Post | 0–9 image/video (max 1 video)<br>img 8 MB, video 512 MB | Text ≤3000 | First comment |
| LinkedIn | `document` 📄 Document | 1 document<br>PDF 100 MB | Text ≤3000 | Document title* |
| LinkedIn | `poll` 📊 Poll | none | Question ≤140 (required) | Options*, Duration |
| Threads | `post` 📝 Post | 0–20 image/video, mixing OK<br>img 8 MB, video 300 MB | Text ≤500 | — |
| Pinterest | `pin` 📌 Pin | 1 image/video<br>img 20 MB, video 2048 MB | Description ≤500 | Title*, Destination link, Board* |
| Google Business | `update` 📣 Update | 0–1 image<br>img 5 MB | Text ≤1500 | Button, Button link |
| Google Business | `event` 📅 Event | 0–1 image<br>img 5 MB | Details ≤1500 | Event title*, Starts*, Ends* |
| Google Business | `offer` 🏷 Offer | 0–1 image<br>img 5 MB | Details ≤1500 | Offer title*, Starts*, Ends*, Coupon code, Redeem link |
| Bluesky | `post` 📝 Post | 0–4 image/video (max 1 video)<br>img 1 MB, video 100 MB | Text ≤300 | — |
| Mastodon | `post` 📝 Post | 0–4 image/video (max 1 video)<br>img 16 MB, video 99 MB | Text ≤500 | — |

## Rules that apply everywhere
- Media is attached once per post and shared by every selected network; each network's format checks it independently. If two networks need different media (e.g. a 9:16 reel and a 16:9 video), make two posts.
- One account takes one format per post.
- If a format needs a video and you attach an image (or the reverse), the composer shows exactly what's wrong and blocks Schedule / Publish now. Drafts are never blocked.
- *Text override*: any network can use different text than the shared text ("Write different caption for …").
- Thumbnails are chosen from the library (images only).
- `[fail]` anywhere in the text or title makes the mock connector fail that network — handy for testing.
