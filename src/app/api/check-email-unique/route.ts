import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { z } from "zod";
import { hashForLookup } from "@/lib/encryption";

const EmailQuerySchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const result = EmailQuerySchema.safeParse({ email: searchParams.get("email") });

    if (!result.success) {
      return Response.json(
        { success: false, message: result.error.format().email?._errors.join(", ") ?? "Invalid email" },
        { status: 400 }
      );
    }

    const emailHash = hashForLookup(result.data.email);
    const existingUser = await UserModel.findOne({ emailHash, isVerified: true });

    if (existingUser) {
      return Response.json(
        { success: false, message: "Email is already taken" },
        { status: 400 }
      );
    }

    return Response.json({ success: true, message: "Email is unique" }, { status: 200 });
  } catch (error) {
    console.error("Check email unique error:", error);
    return Response.json({ success: false, message: "Error checking email" }, { status: 500 });
  }
}
