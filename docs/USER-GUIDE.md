# User guide

> **Demo mode:** publishing is simulated. "Published" means the mock connector accepted it; nothing leaves your machine.

## Concepts
- **Connection (account)** — a connected profile: network + handle. Currently simulated.
- **Post** — shared text + optional media + one or more **targets** + a time.
- **Target** — one account in a post, with its own **format** (reel, story, short, thread…), optional own text, and extra fields. Each target is published and reported separately.
- **Asset** — an image, video or PDF in the media library. Posts reference assets; deleting a post never deletes its media.
- **Status** — `draft` → `scheduled` → `publishing` → `published` (all targets OK) or `failed` (at least one target failed).

## Layout
Left sidebar: **＋ Create post**, **Planner**, **Media library**, **Connections**.

## Connections
Pick a network tile (each shows the formats it supports), type the handle or channel name, **Connect**. Networks: Instagram, Facebook, TikTok, YouTube, Rumble, X, LinkedIn, Threads, Pinterest, Google Business, Bluesky, Mastodon. **Remove** disconnects an account (it's dropped from posts' targets). Real OAuth is not implemented — see DEVELOPMENT.md.

## Planner
- **Month / Week / List** views (top right). Your choice is remembered.
- **Network chips** filter by network; **status buttons** filter by draft/scheduled/published/failed. Filters apply to every view.
- Each post card shows network badges, time, 📎 media count, any non-default formats (🎬 Reel, 📱 Short, 🧵 Thread, 📊 Poll…) and the text. Left border: green published, red failed, dashed draft, blue scheduled.
- **Click** a card to edit. **Hover a day → ＋** to start a post on that day. **Drag** a card to another day to reschedule (time kept).
- Refreshes itself every 10 s so you can watch scheduled posts publish.

## Create / edit a post
The composer has four steps and a live preview on the right.

1. **Choose networks** — click connection tiles (✓ = selected).
2. **Write & customise**
   - Type the shared text once.
   - Tabs below: **All networks** shows each selected network with a quick **format** dropdown and a "⚠ n to fix / Settings ›" button. Each network tab has:
     - **format buttons** (e.g. Instagram: Post · Carousel · Reel · Story) and a hint on what it takes,
     - **"Write different … for <network>"** to override the text for just that network (caption/description/question counters are per format),
     - **extra fields** for that format — e.g. YouTube title/visibility/tags/thumbnail, TikTok privacy and comment/duet/stitch toggles, Instagram collaborators/trial reel/first comment, X thread posts, LinkedIn poll options & duration, Pinterest title/board/link, Google Business button/event dates/coupon.
   - A tab shows ✓ when ready or ⚠ n with the number of problems.
3. **Media** — **＋ Add media** opens the picker (choose from the library or upload on the spot; images, videos and PDFs). ← → reorder, ✕ remove. Media is shared by all selected networks; each network's format checks it.
4. **Schedule** — pick date/time (your timezone) or use **In 1 hour / Tomorrow 9:00 / Tomorrow 12:00 / Next Monday 9:00**. Then:
   - **Schedule** — queue for that time
   - **Publish now** — send immediately
   - **Save draft** — keep without scheduling (never validated; fix it later)

**Schedule** and **Publish now** stay disabled while any network has a problem; the problems are listed in plain language with a *fix* link. The server re-checks everything.

Preview: use the network icons above the preview to flip between networks. It shows the format's shape (9:16 for reels/stories/shorts/TikTok, 1:1 for Instagram posts, 16:9 for YouTube/Rumble), the title, text, poll options, thread, link, etc.

Tips: one account takes one format per post — to post both a Reel and a Story to the same account, make two posts. Put `[fail]` in the text or title to see how a failed publish looks.

See **[FORMATS.md](FORMATS.md)** for the exact rules per network and format.

## Media library
**Upload** by the button or by dragging files onto the drop zone (multi-file, with progress). Supported: JPG, PNG, GIF, WebP · MP4, MOV, WebM · PDF; up to 1 GB each.
- Search matches file name and alt text; filter **All / Images / Videos / PDFs**.
- Click a card for details: full preview (video plays, PDF opens), rename, alt text, download, and which posts use it.
- Checkboxes → bulk **Delete**. Deleting a file used by a draft/scheduled post asks first and detaches it from those posts.

## Time & scheduling details
- Times are stored in UTC and shown in your browser's timezone.
- The scheduler checks every 15 s while the server runs. A post publishes within ~15 s of its time. If the server was off, overdue posts publish at the next check after it starts.
- If one target of a post fails, the post is `failed`; open it, read the error under the buttons, fix, and **Publish now** (only unpublished targets are retried).
