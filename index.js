import express, { json } from "express";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";
import admin from "firebase-admin";

dotenv.config();

const serviceAccount = JSON.parse(
  fs.readFileSync("./firebase-admin-sdk.json", "utf-8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization.split(" ")[1];

  if (!token || !authorization) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(402).send({ message: "Forbidden" });
  }
};

const app = express();
const port = process.env.PORT || 3000;

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Get request was successful" });
});

async function run() {
  try {
    await client.connect();
    console.log("Successfully connected to mongoDB");

    const db = client.db("northern");
    const usersCollection = db.collection("users");
  } finally {
    // No need to edit this
  }
}

run().catch(console.dir);

app.listen(3000, () => {
  console.log("Server is running on port: ", port);
});
