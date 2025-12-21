import { resend } from "@/lib/resend";
import VerificationEmail from "../../emails/VerificationEmail";
import { ApiResponse } from "@/types/ApiResponse";

export async function sendVerificationEmail(
  email: string,
  username: string,
  verifyCode: string
): Promise<ApiResponse> {
  try {
    await resend.emails.send({
      from: "no-reply@darshtank.me",
      to: email,
      subject: "Veil : Verification Email",
      react: VerificationEmail({ username, otp: verifyCode }),
    });
    return {
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
      Success: false,
      message: "Failed to send Verification Email",
      aitext: "",
    };
  }
}
