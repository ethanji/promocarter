import type { Asset, Kind } from "./media";

export type Network = "instagram" | "facebook" | "tiktok" | "youtube" | "rumble" | "x" | "linkedin" | "threads" | "pinterest" | "google" | "bluesky" | "mastodon";

/** Extra per-format input (title, privacy, poll options…). Values are stored in post_targets.options. */
export interface Field {
  key: string; label: string;
  type: "text" | "url" | "select" | "toggle" | "list" | "datetime" | "thumbnail";
  required?: boolean; max?: number; default?: any; help?: string; placeholder?: string;
  options?: { value: string; label: string }[];
  minItems?: number; maxItems?: number;               // list only
}
export interface MediaRule {
  min: number; max: number; maxVideos: number; kinds: Kind[]; mix: boolean;
  imageMB: number; videoMB: number; docMB: number;
}
export interface Format {
  key: string; label: string; icon: string; hint: string;
  media: MediaRule; usesText: boolean; textRequired: boolean; textMax: number; textLabel: string;
  fields: Field[]; shape: "square" | "tall" | "wide" | "free";
}
export interface NetworkDef { label: string; short: string; color: string; formats: Format[] }

// ---- helpers -------------------------------------------------------------
const media = (min: number, max: number, kinds: Kind[], o: Partial<MediaRule> = {}): MediaRule =>
  ({ min, max, maxVideos: max, kinds, mix: false, imageMB: 8, videoMB: 512, docMB: 100, ...o });
const fmt = (key: string, label: string, icon: string, hint: string, m: MediaRule, textMax: number, o: Partial<Format> = {}): Format =>
  ({ key, label, icon, hint, media: m, usesText: true, textRequired: false, textMax, textLabel: "Caption", fields: [], shape: "free", ...o });
const opts = (...p: [string, string][]) => p.map(([value, label]) => ({ value, label }));

const firstComment: Field = { key: "firstComment", label: "First comment", type: "text", max: 2200, help: "Posted as the first comment right after publishing." };
const visibility = (def = "public"): Field => ({ key: "visibility", label: "Visibility", type: "select", options: opts(["public", "Public"], ["unlisted", "Unlisted"], ["private", "Private"]), default: def });
const tags: Field = { key: "tags", label: "Tags", type: "text", max: 500, placeholder: "comma, separated, tags" };
const thumb: Field = { key: "thumbnail", label: "Custom thumbnail", type: "thumbnail", help: "Optional image from your library (max 2 MB)." };
const title = (max: number, label = "Title"): Field => ({ key: "title", label, type: "text", required: true, max });
const collab: Field = { key: "collaborators", label: "Collaborators", type: "text", help: "Up to 5 @handles, comma-separated.", placeholder: "@friend, @brand" };

// ---- networks (limits are approximations; check each platform's current rules) ----
export const NETWORKS: Record<Network, NetworkDef> = {
  instagram: { label: "Instagram", short: "IG", color: "#d6249f", formats: [
    fmt("post", "Post", "🖼", "One image or video in the feed.", media(1, 1, ["image", "video"], { videoMB: 300 }), 2200, { fields: [collab, firstComment], shape: "square" }),
    fmt("carousel", "Carousel", "🗂", "2–10 images and/or videos swipeable in one post.", media(2, 10, ["image", "video"], { mix: true, videoMB: 300 }), 2200, { fields: [collab, firstComment], shape: "square" }),
    fmt("reel", "Reel", "🎬", "Vertical video (9:16).", media(1, 1, ["video"], { videoMB: 300 }), 2200,
      { shape: "tall", fields: [collab, { key: "trial", label: "Trial reel", type: "toggle", default: false, help: "Shown to non-followers first." }, { key: "shareToFeed", label: "Also share to feed", type: "toggle", default: true }, firstComment] }),
    fmt("story", "Story", "⏱", "One image or video, 24 hours. Stories don't use captions.", media(1, 1, ["image", "video"], { videoMB: 100 }), 0, { usesText: false, shape: "tall" }),
  ]},
  facebook: { label: "Facebook", short: "f", color: "#1877f2", formats: [
    fmt("post", "Post", "📝", "Text, up to 10 images, or one video.", media(0, 10, ["image", "video"], { maxVideos: 1, imageMB: 10, videoMB: 1024 }), 63206, { textLabel: "Text", fields: [firstComment] }),
    fmt("carousel", "Carousel", "🗂", "2–10 images.", media(2, 10, ["image"], { imageMB: 10 }), 63206, { textLabel: "Text", fields: [firstComment], shape: "square" }),
    fmt("reel", "Reel", "🎬", "Vertical video (9:16).", media(1, 1, ["video"], { videoMB: 1024 }), 2200, { shape: "tall" }),
    fmt("story", "Story", "⏱", "One image or video, 24 hours. Stories don't use captions.", media(1, 1, ["image", "video"], { imageMB: 10, videoMB: 1024 }), 0, { usesText: false, shape: "tall" }),
  ]},
  tiktok: { label: "TikTok", short: "TT", color: "#010101", formats: [
    fmt("video", "Video", "🎬", "One vertical video.", media(1, 1, ["video"], { videoMB: 1024 }), 2200, { shape: "tall",
      fields: [{ key: "privacy", label: "Who can watch", type: "select", options: opts(["public", "Everyone"], ["friends", "Friends"], ["private", "Only me"]), default: "public" },
        { key: "allowComments", label: "Allow comments", type: "toggle", default: true }, { key: "allowDuet", label: "Allow duets", type: "toggle", default: true }, { key: "allowStitch", label: "Allow stitches", type: "toggle", default: true }] }),
    fmt("photo", "Photo carousel", "🗂", "1–35 images.", media(1, 35, ["image"], { imageMB: 20 }), 2200, { shape: "tall",
      fields: [{ key: "title", label: "Title", type: "text", max: 90 }, { key: "privacy", label: "Who can watch", type: "select", options: opts(["public", "Everyone"], ["friends", "Friends"], ["private", "Only me"]), default: "public" }, { key: "allowComments", label: "Allow comments", type: "toggle", default: true }] }),
  ]},
  youtube: { label: "YouTube", short: "YT", color: "#ff0000", formats: [
    fmt("video", "Video", "▶️", "Standard video. The shared text becomes the description.", media(1, 1, ["video"], { videoMB: 1024 }), 5000, { textLabel: "Description", shape: "wide", fields: [title(100), visibility(), tags, thumb, { key: "madeForKids", label: "Made for kids", type: "toggle", default: false }] }),
    fmt("short", "Short", "📱", "Vertical or square video up to 3 minutes.", media(1, 1, ["video"], { videoMB: 1024 }), 5000, { textLabel: "Description", shape: "tall", fields: [title(100), visibility(), tags] }),
  ]},
  rumble: { label: "Rumble", short: "Ru", color: "#85c742", formats: [
    fmt("video", "Video", "▶️", "One video. The shared text becomes the description.", media(1, 1, ["video"], { videoMB: 1024 }), 5000, { textLabel: "Description", shape: "wide", fields: [title(100), visibility(), tags, thumb] }),
  ]},
  x: { label: "X", short: "X", color: "#111111", formats: [
    fmt("post", "Post", "📝", "Text with up to 4 images or 1 video.", media(0, 4, ["image", "video"], { maxVideos: 1, imageMB: 5 }), 280, { textLabel: "Text" }),
    fmt("thread", "Thread", "🧵", "A chain of posts. Media attaches to the first one.", media(0, 4, ["image", "video"], { maxVideos: 1, imageMB: 5 }), 280,
      { textLabel: "First post", fields: [{ key: "thread", label: "Next posts in the thread", type: "list", minItems: 1, maxItems: 24, max: 280, required: true, placeholder: "Next post…" }] }),
  ]},
  linkedin: { label: "LinkedIn", short: "in", color: "#0a66c2", formats: [
    fmt("post", "Post", "📝", "Text with up to 9 images or 1 video.", media(0, 9, ["image", "video"], { maxVideos: 1 }), 3000, { textLabel: "Text", fields: [firstComment] }),
    fmt("document", "Document", "📄", "A PDF shown as a swipeable document.", media(1, 1, ["document"], { docMB: 100 }), 3000, { textLabel: "Text", fields: [title(100, "Document title")] }),
    fmt("poll", "Poll", "📊", "A question with 2–4 options.", media(0, 0, []), 140, { textLabel: "Question", textRequired: true,
      fields: [{ key: "pollOptions", label: "Options", type: "list", required: true, minItems: 2, maxItems: 4, max: 30, placeholder: "Option" },
        { key: "pollDuration", label: "Duration", type: "select", options: opts(["1", "1 day"], ["3", "3 days"], ["7", "1 week"], ["14", "2 weeks"]), default: "3" }] }),
  ]},
  threads: { label: "Threads", short: "@", color: "#1c1c1c", formats: [
    fmt("post", "Post", "📝", "Text with up to 20 images/videos.", media(0, 20, ["image", "video"], { mix: true, videoMB: 300 }), 500, { textLabel: "Text" }),
  ]},
  pinterest: { label: "Pinterest", short: "P", color: "#e60023", formats: [
    fmt("pin", "Pin", "📌", "One image or video pin.", media(1, 1, ["image", "video"], { imageMB: 20, videoMB: 2048 }), 500, { textLabel: "Description", shape: "tall",
      fields: [title(100), { key: "link", label: "Destination link", type: "url" }, { key: "board", label: "Board", type: "text", required: true, max: 50 }] }),
  ]},
  google: { label: "Google Business", short: "G", color: "#34a853", formats: [
    fmt("update", "Update", "📣", "Text with an optional photo and button.", media(0, 1, ["image"], { imageMB: 5 }), 1500, { textLabel: "Text", shape: "wide",
      fields: [{ key: "button", label: "Button", type: "select", options: opts(["none", "None"], ["book", "Book"], ["order", "Order online"], ["buy", "Buy"], ["learn_more", "Learn more"], ["sign_up", "Sign up"], ["call", "Call now"]), default: "none" },
        { key: "link", label: "Button link", type: "url" }] }),
    fmt("event", "Event", "📅", "An event with a title and dates.", media(0, 1, ["image"], { imageMB: 5 }), 1500, { textLabel: "Details", shape: "wide",
      fields: [title(58, "Event title"), { key: "start", label: "Starts", type: "datetime", required: true }, { key: "end", label: "Ends", type: "datetime", required: true }] }),
    fmt("offer", "Offer", "🏷", "A promotion with title, dates and optional coupon.", media(0, 1, ["image"], { imageMB: 5 }), 1500, { textLabel: "Details", shape: "wide",
      fields: [title(58, "Offer title"), { key: "start", label: "Starts", type: "datetime", required: true }, { key: "end", label: "Ends", type: "datetime", required: true },
        { key: "couponCode", label: "Coupon code", type: "text", max: 58 }, { key: "link", label: "Redeem link", type: "url" }] }),
  ]},
  bluesky: { label: "Bluesky", short: "Bs", color: "#1185fe", formats: [
    fmt("post", "Post", "📝", "Text with up to 4 images or 1 video.", media(0, 4, ["image", "video"], { maxVideos: 1, imageMB: 1, videoMB: 100 }), 300, { textLabel: "Text" }),
  ]},
  mastodon: { label: "Mastodon", short: "M", color: "#6364ff", formats: [
    fmt("post", "Post", "📝", "Text with up to 4 images or 1 video.", media(0, 4, ["image", "video"], { maxVideos: 1, imageMB: 16, videoMB: 99 }), 500, { textLabel: "Text" }),
  ]},
};
export const NETWORK_KEYS = Object.keys(NETWORKS) as Network[];
export const formatOf = (n: Network, key?: string | null) => NETWORKS[n].formats.find((f) => f.key === key) ?? NETWORKS[n].formats[0];

type M = Pick<Asset, "kind" | "size" | "name">;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** Every problem that would stop this target (network + format + text + media + options) from being published. */
export function validateTarget(network: Network, formatKey: string | null | undefined, text: string, media: M[], options: Record<string, any> = {}): string[] {
  const nw = NETWORKS[network], f = formatOf(network, formatKey), r = f.media, errs: string[] = [];
  const P = `${nw.label} ${f.label}`;
  const bad = (s: string) => errs.push(`${P}: ${s}`);
  const vids = media.filter((m) => m.kind === "video"), imgs = media.filter((m) => m.kind === "image"), docs = media.filter((m) => m.kind === "document");

  for (const m of media) if (r.max > 0 && !r.kinds.includes(m.kind)) bad(`"${m.name}" is ${m.kind === "image" ? "an" : "a"} ${m.kind}; this format accepts ${r.kinds.length ? r.kinds.join(" / ") : "no media"}.`);
  if (media.length < r.min) bad(`needs ${r.min === r.max ? `exactly ${plural(r.min, "file")}` : `at least ${plural(r.min, "file")}`} (${r.kinds.join(" / ")}).`);
  if (media.length > r.max) bad(r.max === 0 ? "doesn't take media." : `allows at most ${plural(r.max, "file")}.`);
  if (vids.length > r.maxVideos && r.maxVideos < r.max) bad(`allows at most ${plural(r.maxVideos, "video")}.`);
  if (!r.mix && imgs.length && vids.length) bad("can't mix images and video.");
  for (const m of imgs) if (m.size > r.imageMB * 1024 ** 2) bad(`"${m.name}" is over the ${r.imageMB} MB image limit.`);
  for (const m of vids) if (m.size > r.videoMB * 1024 ** 2) bad(`"${m.name}" is over the ${r.videoMB} MB video limit.`);
  for (const m of docs) if (m.size > r.docMB * 1024 ** 2) bad(`"${m.name}" is over the ${r.docMB} MB document limit.`);

  if (f.usesText) {
    if (f.textRequired && !text.trim()) bad(`${f.textLabel.toLowerCase()} is required.`);
    if (text.length > f.textMax) bad(`${f.textLabel.toLowerCase()} is ${text.length}/${f.textMax} characters.`);
    const hasRequiredField = f.fields.some((x) => x.required);
    if (!f.textRequired && r.min === 0 && !text.trim() && !media.length && !hasRequiredField) bad("add some text or media.");
  }
  for (const fld of f.fields) {
    const v = options[fld.key];
    if (fld.type === "list") {
      const items: string[] = (Array.isArray(v) ? v : []).map((s: any) => String(s).trim()).filter(Boolean);
      if ((fld.required || items.length) && items.length < (fld.minItems ?? 1)) bad(`${fld.label.toLowerCase()}: add at least ${plural(fld.minItems ?? 1, "item")}.`);
      if (items.length > (fld.maxItems ?? 99)) bad(`${fld.label.toLowerCase()}: at most ${fld.maxItems} items.`);
      if (fld.max) items.forEach((s, i) => s.length > fld.max! && bad(`${fld.label.toLowerCase()} #${i + 1} is over ${fld.max} characters.`));
    } else if (fld.type === "toggle") { /* always valid */ }
    else if (fld.type === "thumbnail") { /* existence checked server-side */ }
    else {
      const s = v == null ? "" : String(v).trim();
      if (fld.required && !s) { bad(`${fld.label.toLowerCase()} is required.`); continue; }
      if (!s) continue;
      if (fld.max && s.length > fld.max) bad(`${fld.label.toLowerCase()} is over ${fld.max} characters.`);
      if (fld.type === "url" && !/^https?:\/\/\S+$/i.test(s)) bad(`${fld.label.toLowerCase()} must be a full http(s) link.`);
      if (fld.type === "datetime" && isNaN(Date.parse(s))) bad(`${fld.label.toLowerCase()} must be a valid date/time.`);
      if (fld.type === "select" && fld.options && !fld.options.some((o) => o.value === s)) bad(`${fld.label.toLowerCase()} has an invalid value.`);
    }
  }
  if (f.fields.some((x) => x.key === "start") && f.fields.some((x) => x.key === "end") && options.start && options.end && Date.parse(options.end) <= Date.parse(options.start)) bad("the end must be after the start.");
  if (f.key === "post" && network === "instagram" && options.collaborators && String(options.collaborators).split(",").filter((s) => s.trim()).length > 5) bad("at most 5 collaborators.");
  if (network === "google" && f.key === "update" && options.button && options.button !== "none" && !options.link) bad("a button needs a link.");
  return errs;
}
