// init-db.mjs
import { createClient } from "@libsql/client";

const client = createClient({
  // ⬇️ replace these with the exact values from your .env
  url: "libsql://turso-db-create-my-events-db-nialler.aws-eu-west-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjQxMjM0ODQsImlkIjoiODU3OGU4YTQtZDQ3ZS00OTZmLWEyNjktNzJkZmVkOGY4YTg0IiwicmlkIjoiMGFjZmNjNzItNDFlNC00Zjc3LTg2ZjgtNDg0OGM4Zjk5MTQ2In0.IJ_IC5fcHo1V60M3nH1uQYRblFLXp-jjkOkcFxh5AqsR7bVzSHOnIV6rQyDFWc69EwwRbNnnh6SmBJaJYIsdAA",
});

async function main() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    console.log("✅ events table created or already exists");
  } catch (err) {
    console.error("❌ SQL Error:", err);
  }
}

main();
