import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

let databaseConnection;

export default async function handler(req, res) {
  databaseConnection ??= connectDB();
  await databaseConnection;
  return app(req, res);
}
