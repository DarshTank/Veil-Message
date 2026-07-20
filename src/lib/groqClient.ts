import Groq from "groq-sdk";

const primaryKey = process.env.GROQ_API_KEY;
const backupKey = process.env.GROQ_BACKUP_API_KEY;

const groqPrimary = primaryKey ? new Groq({ apiKey: primaryKey }) : null;
const groqBackup = backupKey ? new Groq({ apiKey: backupKey }) : null;

/**
 * Executes a Groq chat completion request with instant failover to the backup API key.
 */
export async function createGroqChatCompletion(
  params: Parameters<Groq["chat"]["completions"]["create"]>[0]
): Promise<Groq.Chat.ChatCompletion> {
  // 1. Primary Attempt
  if (groqPrimary) {
    try {
      return (await groqPrimary.chat.completions.create(params)) as Groq.Chat.ChatCompletion;
    } catch (primaryErr) {
      console.warn(
        "Primary Groq API key failed or rate-limited. Auto-switching to backup Groq key...",
        primaryErr
      );
    }
  }

  // 2. Backup Failover Attempt
  if (groqBackup) {
    try {
      return (await groqBackup.chat.completions.create(params)) as Groq.Chat.ChatCompletion;
    } catch (backupErr) {
      console.warn("Backup Groq API key also failed:", backupErr);
      throw backupErr;
    }
  }

  throw new Error("No Groq API keys configured.");
}
