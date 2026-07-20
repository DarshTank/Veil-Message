import { get } from "@vercel/blob";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return Response.json({ error: "Missing BLOB_READ_WRITE_TOKEN" }, { status: 500 });
  }

  try {
    const result = await get(url, {
      access: "private",
      token,
    });

    if (!result) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "audio/wav",
        ...(result.blob.size != null && { "Content-Length": result.blob.size.toString() }),
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error: any) {
    console.error("Audio proxy error:", error);
    return Response.json({ error: error.message || "Failed to proxy audio file" }, { status: 500 });
  }
}
