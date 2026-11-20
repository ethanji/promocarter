import { tick } from "./lib/publisher";
const g = globalThis as any;
if (!g.__ticker) g.__ticker = setInterval(() => tick().catch(console.error), 15_000);
