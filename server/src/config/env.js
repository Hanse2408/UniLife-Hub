import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 8070,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",
};

// Basic safety check
if (!env.MONGO_URI) {
  throw new Error("❌ Missing MONGO_URI in .env");
}
if (!env.JWT_SECRET) {
  throw new Error("❌ Missing JWT_SECRET in .env");
}