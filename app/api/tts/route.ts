import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuth } from "firebase-admin/auth";
import { initFirebaseAdmin } from "@/lib/firebaseAdmin";

// Initialize Firebase Admin
initFirebaseAdmin();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      const uid = decodedToken.uid;
      console.log(`🎙️ TTS request from user: ${uid}`);
    } catch (error) {
      console.error("Invalid auth token:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get text from request
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Limit text length to prevent abuse (OpenAI has a 4096 char limit anyway)
    const truncatedText = text.slice(0, 4000);
    
    console.log(`🔊 Generating TTS for ${truncatedText.length} characters`);

    // Generate speech using OpenAI TTS
    const response = await openai.audio.speech.create({
      model: "tts-1", // Use "tts-1-hd" for higher quality but slower
      voice: "nova", // Female voice options: "nova", "alloy", "shimmer"
      input: truncatedText,
      response_format: "mp3",
      speed: 1.0, // Speed range: 0.25 to 4.0
    });

    // Convert response to buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    
    console.log(`✅ TTS generated successfully, size: ${audioBuffer.length} bytes`);

    // Return audio file
    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (err: any) {
    console.error("❌ TTS error:", err.message);
    
    // Handle specific OpenAI errors
    if (err.message?.includes("model")) {
      return NextResponse.json({ error: "TTS model not available" }, { status: 503 });
    }
    
    if (err.message?.includes("rate")) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    
    return NextResponse.json({ error: "Failed to generate speech" }, { status: 500 });
  }
}