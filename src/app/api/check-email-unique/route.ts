import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { z } from "zod";

const EmailQuerySchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const queryParam = {
      email: searchParams.get("email"),
    };
    // validate with zod
    const result = EmailQuerySchema.safeParse(queryParam);
    if (!result.success) {
      const emailErrors = result.error.format().email?._errors || [];
      return Response.json(
        {
          success: false,
          message:
            emailErrors?.length > 0
              ? emailErrors.join(", ")
              : "Invalid query parameters",
        },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const existingUser = await UserModel.findOne({
      email,
      isVerified: true,
    });

    if (existingUser) {
      return Response.json(
        {
          success: false,
          message: "Email is already taken",
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Email is unique",
      },
      { status: 200 }
      );
  } catch (error) {
    console.error("Error checking email", error);
    return Response.json(
      {
        success: false,
        message: "Error checking email",
      },
      { status: 500 }
    );
  }
}
