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
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is missing in environment variables.");
  }

  try {
    const db = await mongoose.connect(uri, {
      retryWrites: true,
      w: "majority",
    });

    connection.isConnected = db.connections[0].readyState;
  } catch (err) {
    console.error("DB Connection Failed: dbConnect.ts", err);
    throw err;
  }
}

export default dbConnect;
