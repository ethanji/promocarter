# Install & operate

## 1. Requirements
| | |
|---|---|
| **Node.js** | **22.13 or newer** (uses the built-in `node:sqlite`; it prints an "ExperimentalWarning" — harmless). Developed and tested on Node 26.8. |
| **npm** | Comes with Node (tested with npm 11) |
| **Disk** | ~500 MB for dependencies + space for your media (`data/uploads/`) |
| **Browser** | Any current Chrome, Firefox, Safari or Edge |
| **OS** | Linux (tested), macOS, Windows (WSL recommended). No native modules to compile. |

Install Node if you don't have it:
- Arch Linux: `sudo pacman -S nodejs npm`
- Debian/Ubuntu: use [NodeSource](https://github.com/nodesource/distributions) or `nvm` (the distro package is often too old)
- macOS: `brew install node`
- Any OS: `nvm install --lts` ([nvm](https://github.com/nvm-sh/nvm))

Check: `node -v` → `v22.13.0` or higher.

## 2. Install
### From this folder (already on your machine)
```bash
cd ~/Projects/promocarter
./install.sh
```
### From the release package
```bash
tar xzf ~/Downloads/promocarter-0.3.0.tar.gz -C ~/Projects/
cd ~/Projects/promocarter
./install.sh
```
`install.sh` verifies the Node version, runs `npm install` and `npm run build`.

Manual equivalent: `npm install && npm run build`.

## 3. Run
| Command | Use |
|---|---|
| `./start.sh prod` | Production server (build once, fast). **Recommended.** |
| `./start.sh` | Dev server with hot reload (for changing code) |

Open **http://localhost:3100**. Stop with Ctrl+C.

The background scheduler starts automatically with the server. **Posts only publish while the server is running.** If it was off when a post came due, the post is published at the next check after startup (it is *late*, not skipped).

## 4. Configuration
Environment variables (set inline, e.g. `PORT=4000 ./start.sh prod`):

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3100` | Port to listen on |
| `HOST` | `127.0.0.1` | Interface. Default = this machine only. `0.0.0.0` exposes it to your network — **there is no authentication**, so only do this on a trusted LAN or behind a reverse proxy with auth. |
| `PROMOCARTER_URL` | `http://localhost:3100` | Used by the MCP server to find the app (see [MCP.md](MCP.md)) |

Data location is fixed: `data/` inside the project folder (the app must be started from the project folder, which `start.sh` does).

Limits: upload size 1 GB (`MAX_UPLOAD_MB` in `lib/media.ts`); allowed file types in `ALLOWED` in the same file; scheduler interval 15 s in `instrumentation-node.ts`. Rebuild after changing code: `npm run build`.

## 5. Connect an AI assistant (optional)
See [MCP.md](MCP.md). Short version, for Claude Code:
```bash
claude mcp add promocarter --scope user \
  -e PROMOCARTER_URL=http://localhost:3100 \
  -- node ~/Projects/promocarter/mcp/server.mjs
```
(Use the absolute path to the folder.)

## 6. Start automatically at login (Linux, systemd user service)
*Example — adjust paths; not part of the tested install.*
```ini
# ~/.config/systemd/user/promocarter.service
[Unit]
Description=PromoCarter

[Service]
WorkingDirectory=%h/Projects/promocarter
ExecStart=/usr/bin/npm run start
Restart=on-failure

[Install]
WantedBy=default.target
```
```bash
systemctl --user daemon-reload
systemctl --user enable --now promocarter
systemctl --user status promocarter
journalctl --user -u promocarter -f      # logs
```
Run `npm run build` first. Use `which npm` if it isn't at `/usr/bin/npm`.

## 7. Backup & restore
Everything you create lives in `data/`:
- `promocarter.db` (+ `-wal`, `-shm` files while running) — accounts, posts, media metadata
- `uploads/` — the media files

Backup (stop the server first for a perfectly consistent copy): `cp -a data /path/to/backup/data-$(date +%F)`
Restore: stop the server, replace `data/` with the backup, start again.
Reset to empty: stop the server and delete `data/`.

## 8. Upgrade
1. Back up `data/`.
2. Replace the code (keep `data/`).
3. `./install.sh` (new dependencies + rebuild). Database tables are created/extended automatically at startup.

## 9. Uninstall
Stop the server, remove the systemd service if you made one, remove the MCP entry (`claude mcp remove promocarter`), then delete the project folder.

## 10. Troubleshooting
| Symptom | Fix |
|---|---|
| `Node … is too old` / `Cannot find module 'node:sqlite'` | Upgrade to Node 22.13+ |
| `EADDRINUSE` / port already in use | Another process uses 3100: `PORT=3101 ./start.sh prod`, or stop the other one (`fuser -k 3100/tcp`) |
| Page loads but nothing saves / API errors | Check the terminal running the server for the stack trace |
| Scheduled post didn't go out | Server must be running at the scheduled time; check its status in the calendar (red = failed, open it to see the error). Time is shown in your browser's timezone. |
| Upload fails "Unsupported file type" | Only JPG/PNG/GIF/WebP/MP4/MOV/WebM/PDF. Rename files with the right extension if the type is unknown. |
| Upload fails "over 1024 MB" | Raise `MAX_UPLOAD_MB` in `lib/media.ts`, rebuild. |
| Video won't play in the browser | Browsers play H.264/AAC MP4 and WebM best. Some `.mov` files (e.g. HEVC) won't preview, though the file is stored fine. Re-encode: `ffmpeg -i in.mov -c:v libx264 -c:a aac out.mp4` |
| MCP tools fail: "Cannot reach PromoCarter" | Start the app first, and check `PROMOCARTER_URL`/port |
| MCP server not listed in Claude Code | Restart Claude Code in the project folder (for `.mcp.json`) or re-run `claude mcp add …`; `claude mcp list` to verify |
| Port is open to the network unexpectedly | You set `HOST=0.0.0.0`; unset it. |
