import { NextResponse } from "next/server";
import { rewriteHtml, upstreamHeaders } from "@/lib/player-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return new NextResponse("missing url", { status: 400 });

  let target;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }

  try {
    const upstream = await fetch(target.href, {
      headers: upstreamHeaders(req, target),
      redirect: "follow",
    });

    const html = await upstream.text();

    return new NextResponse(
      rewriteHtml(html, target.href, req.nextUrl.origin),
      {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-frame-options": "ALLOWALL",
        },
      },
    );
  } catch (err) {
    return new NextResponse(`proxy failed: ${err.message}`, { status: 502 });
  }
}
