import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "🚀 App Router API is working!",
    method: "GET",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
}

export async function POST(request: Request) {
  let body = null;
  try {
    body = await request.json();
  } catch {
    // Body might not be JSON
  }

  return NextResponse.json({
    status: "ok",
    message: "✅ POST endpoint is working!",
    method: "POST",
    timestamp: new Date().toISOString(),
    headers: {
      "content-type": request.headers.get("content-type"),
      "stripe-signature": request.headers.get("stripe-signature") || "not-present",
    },
    bodyReceived: body ? "yes" : "no",
    body: body,
  });
}
