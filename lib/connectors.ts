import fs from "node:fs";
import path from "node:path";
import type { Network } from "./networks";
import { uploadsDir } from "./db";

export interface MediaFile { id: number; kind: "image" | "video" | "document"; mime: string; name: string; size: number; alt: string | null; path: string }
export interface PublishInput {
  content: string;                       // text for THIS network (override applied)
  type: string;                          // format key: post | reel | story | carousel | video | short | thread | document | poll | pin | …
  options: Record<string, any>;          // format fields: title, visibility, thread[], pollOptions[], privacy, …
  media: MediaFile[];
}
export interface PublishResult { externalId: string }

/** Implement this per network to go live. Read files from media[].path. Throw to mark the target failed. */
export interface Connector {
  publish(account: { id: number; handle: string }, post: PublishInput): Promise<PublishResult>;
}

/** Mock connector: pretends to publish. Include "[fail]" in the text to simulate an API error. */
const mock: Connector = {
  async publish(account, post) {
    await new Promise((r) => setTimeout(r, 150));
    for (const m of post.media) if (!fs.existsSync(m.path)) throw new Error(`Media file missing: ${m.name}`);
    if ((post.content.includes("[fail]") || String(post.options?.title ?? "").includes("[fail]"))) throw new Error(`Mock API error for ${account.handle}`);
    return { externalId: `mock_${account.id}_${Date.now().toString(36)}` };
  },
};

const registry: Partial<Record<Network, Connector>> = {};
export const connectorFor = (n: Network): Connector => registry[n] ?? mock;
export const assetPath = (file: string) => path.join(uploadsDir(), file);
