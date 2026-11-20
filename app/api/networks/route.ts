import { NextResponse } from "next/server";
import { NETWORKS } from "@/lib/networks";
export const GET = () => NextResponse.json(NETWORKS);
