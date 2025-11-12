import express from "express";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
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
    return res.status(403).send({ message: "Unauthorized access" });
  }

  try {
    const decode = await admin.auth().verifyIdToken(token);
    req.token_email = decode.email;
    next();
  } catch (error) {
    res.status(403).send({ message: "Forbidden" });
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

    const db = client.db("homenest");
    const usersCollection = db.collection("users");
    const propertiesCollection = db.collection("properties");

    app.post("/users", async (req, res) => {
      const data = req.body;

      const query = { email: data.email };
      const existedUser = await usersCollection.findOne(query);

      if (existedUser) {
        return res.send({ message: "User already exist" });
      }

      const result = await usersCollection.insertOne(data);
      res.send(result);
    });

    console.log("Successfully connected to mongoDB");
  } finally {
    // It will be empty
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log("Server is running on port: ", port);
});
