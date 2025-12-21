// import { log } from "console";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

type ConnectObject = {
  isConnected?: number; // This should be a boolean if you're checking connection state
};

const connection: ConnectObject = {};

async function dbConnect(): Promise<void> {
  if (connection.isConnected === 1) {
    console.log("Already Connected to Database");
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI || "", {
      retryWrites: true, // Ensure retryWrites is explicitly set
      w: "majority", // Ensure write concern is set appropriately
    });

    connection.isConnected = db.connections[0].readyState;

    console.log("DB Connected Successfully: dbConnect.ts");
  } catch (err) {
    console.error("DB Connection Failed: dbConnect.ts", err);
    process.exit(1);
  }
}

export default dbConnect;
