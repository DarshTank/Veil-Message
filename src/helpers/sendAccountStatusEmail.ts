import { resend } from "@/lib/resend";
import AccountSuspendedEmail from "../../emails/AccountSuspendedEmail";
import AccountBannedEmail from "../../emails/AccountBannedEmail";
import { ApiResponse } from "@/types/ApiResponse";

export async function sendAccountSuspendedEmail(
  email: string,
  username: string,
  reason: string,
  durationText: string,
  suspendedUntilDate: string
): Promise<ApiResponse> {
  try {
    const response = await resend.emails.send({
      from: "no-reply@thedarshtank.dev",
      to: email,
      subject: "Veil: Account Suspension Notice",
      react: AccountSuspendedEmail({
        username,
        reason,
        durationText,
        suspendedUntilDate,
      }),
    });

    if (response.error) {
      console.error("Resend API suspension email error:", response.error);
      return {
        success: false,
        Success: false,
        message: response.error.message || "Failed to send suspension email.",
        aitext: "",
      };
    }

    return {
      success: true,
      Success: true,
      message: "Suspension email sent successfully.",
      aitext: "",
    };
  } catch (error) {
    console.error("Error sending suspension email:", error);
    return {
      success: false,
      Success: false,
      message: "Failed to send suspension email.",
      aitext: "",
    };
  }
}

export async function sendAccountBannedEmail(
  email: string,
  username: string,
  reason: string
): Promise<ApiResponse> {
  try {
    const response = await resend.emails.send({
      from: "no-reply@thedarshtank.dev",
      to: email,
      subject: "Veil: Permanent Account Ban Notice",
      react: AccountBannedEmail({
        username,
        reason,
      }),
    });

    if (response.error) {
      console.error("Resend API ban email error:", response.error);
      return {
        success: false,
        Success: false,
        message: response.error.message || "Failed to send ban email.",
        aitext: "",
      };
    }

    return {
      success: true,
      Success: true,
      message: "Ban email sent successfully.",
      aitext: "",
    };
  } catch (error) {
    console.error("Error sending ban email:", error);
    return {
      success: false,
      Success: false,
      message: "Failed to send ban email.",
      aitext: "",
    };
  }
}
