import { resend } from "@/lib/resend";
import VerificationEmail from "../../emails/VerificationEmail";
import { ApiResponse } from "@/types/ApiResponse";

export async function sendVerificationEmail(
  email: string,
  username: string,
  verifyCode: string
): Promise<ApiResponse> {
  try {
    const response = await resend.emails.send({
      from: "no-reply@thedarshtank.dev",
      to: email,
      subject: "Veil : Verification Email",
      react: VerificationEmail({ username, otp: verifyCode }),
    });

    if (response.error) {
      console.error("Resend API error:", response.error);
      return {
        success: false,
        Success: false,
        message: response.error.message || "Failed to send verification email.",
        aitext: "",
      };
    }

    return {
      success: true,
      Success: true,
      message: "Verification Email sent Sucessfully",
      aitext: "",
    };
  } catch (emailError) {
    console.error(
      "Error sending verification email : sendVerificationEmail.ts",
      emailError
    );
    return {
      success: false,
      Success: false,
      message: "Failed to send Verification Email",
      aitext: "",
    };
  }
}
