import { del } from "@vercel/blob";

/**
 * Safely deletes one or more audio blob files from Vercel Blob storage.
 */
export async function deleteAudioBlobs(urls: (string | undefined | null)[]): Promise<void> {
  const validUrls = urls.filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0
  );
  if (validUrls.length === 0) return;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await del(validUrls);
    }
  } catch (error) {
    console.error("Failed to delete audio blobs from Vercel Blob:", error);
  }
}
