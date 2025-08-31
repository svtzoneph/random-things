import express from "express";
import cors from "cors";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import fs from "fs";

// Load Firebase Admin SDK private key
const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://tvnstream-b4497-default-rtdb.firebaseio.com"
});

const app = express();
app.use(cors());
const auth = getAuth();
const db = getDatabase();

// Endpoint: Get all users + active sessions
app.get("/users", async (req, res) => {
  try {
    // Fetch all users
    const users = [];
    let result = await auth.listUsers(1000);
    users.push(...result.users);
    while (result.pageToken) {
      result = await auth.listUsers(1000, result.pageToken);
      users.push(...result.users);
    }

    // Fetch active sessions
    const snap = await db.ref("activeSessions").once("value");
    const sessions = snap.val() || {};

    // Combine results
    const resultData = users.map(user => {
      const uid = user.uid;
      const userSessions = sessions[uid] || {};
      return {
        uid,
        email: user.email,
        deviceCount: Object.keys(userSessions).length,
        sessions: Object.values(userSessions)
      };
    });

    res.json(resultData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Start server
app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
