# PromoCarter

A self-hosted social media planner: plan posts on a calendar, attach images, video and PDFs from a media library, publish to many networks at once — each with its own format (reel, story, short, thread, poll…) — and let an AI assistant manage it all through MCP.

> **Status: working prototype.** Publishing is **simulated** (a mock connector). Nothing is sent to X, Instagram, etc. until you implement real connectors — see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). There is **no login**: run it on a machine you trust (it binds to `127.0.0.1` by default).

## Features
- **12 networks**: Instagram, Facebook, TikTok, YouTube, Rumble, X, LinkedIn, Threads, Pinterest, Google Business, Bluesky, Mastodon
- **Per-network formats**: Instagram post/carousel/reel/story · Facebook post/carousel/reel/story · TikTok video/photo carousel · YouTube video/short · Rumble video · X post/thread · LinkedIn post/document(PDF)/poll · Pinterest pin · Google Business update/event/offer … ([full table](docs/FORMATS.md))
- **Planner** with Month, Week and List views, network and status filters, drag-and-drop rescheduling
- **Composer**: pick networks → write once → customise per network (format, own text, titles, privacy, poll options, thread posts, thumbnails…) → live per-network preview → schedule (quick-time buttons) or publish now
- **Media library**: images, videos and PDFs (up to 1 GB), search, preview/playback, alt text, usage tracking, bulk delete
- **Validation before scheduling**: every network/format is checked (media kind and count, sizes, text length, required fields) with plain-language errors
- **Background scheduler** publishes due posts automatically (checks every 15 s)
- **MCP server**: 14 tools so Claude (or any MCP client) can upload media and create/schedule/edit posts in any format
- **JSON HTTP API** for everything the UI does

## Quick start
```bash
cd ~/Projects/promocarter
./install.sh          # checks Node, installs dependencies, builds
./start.sh prod       # → http://localhost:3100
```
Needs **Node.js 22.13+**. Full steps for every OS: [docs/INSTALL.md](docs/INSTALL.md).

## Documentation
| Doc | What's in it |
|---|---|
| [docs/INSTALL.md](docs/INSTALL.md) | Requirements, install, run, configuration, auto-start, backup, upgrade, uninstall, troubleshooting |
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | Using the planner, composer, media library, connections; statuses |
| [docs/FORMATS.md](docs/FORMATS.md) | Every network × format: media rules, text limits, extra fields |
| [docs/MCP.md](docs/MCP.md) | Connecting an AI assistant; every tool with parameters; example prompts; safety |
| [docs/API.md](docs/API.md) | HTTP API reference with curl examples |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Architecture, data model, writing real network connectors, limitations |

A single-page offline version of all docs: `docs/index.html`.

## Project layout
```
app/            Next.js pages (planner, compose, media, connections) and API routes
lib/            database, network rules, connectors, publisher, post logic
mcp/server.mjs  MCP server (stdio)
instrumentation*.ts  starts the background scheduler
data/           created at runtime: promocarter.db + uploads/   (back this up)
```

## License / notes
Personal project; no license has been chosen. Tested on Node 26 / Linux. Platform names and trademarks belong to their owners; this project is not affiliated with any of them.
