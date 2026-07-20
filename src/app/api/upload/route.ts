import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { success: false, message: "Vercel Blob token is missing. Please set BLOB_READ_WRITE_TOKEN in your environment." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Limit to audio uploads for anonymous messages
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { success: false, message: "Invalid file type. Only audio uploads are allowed." },
        { status: 400 }
      );
    }

    // Generate a unique filename using a timestamp to prevent overwrites
    const filename = `voice-note-${Date.now()}.wav`;

    // Upload to Vercel Blob (private store)
    // blob.url will be the full private URL — store it and serve via /api/audio-proxy
    const blob = await put(filename, file, {
      access: "private",
      allowOverwrite: false,
      addRandomSuffix: true,
    });

    return NextResponse.json({
      success: true,
      // Store the full private blob URL; /api/audio-proxy converts it to a signed URL on playback
      url: blob.url,
    });
  } catch (error: any) {
    console.error("Vercel Blob upload error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to upload file to Vercel Blob" },
      { status: 500 }
    );
  }
}
