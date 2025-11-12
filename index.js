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

async function run() {
  try {
    await client.connect();

    const db = client.db("homenest");
    const usersCollection = db.collection("users");
    const propertiesCollection = db.collection("properties");
    const ratingsCollection = db.collection("ratings");
    const citiesCollection = db.collection("cities");

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

    app.get("/cities", async (req, res) => {
      const cursor = citiesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/properties", async (req, res) => {
      const cursor = propertiesCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/latest-properties", async (req, res) => {
      const cursor = propertiesCollection.find();
      const result = await cursor.sort({ inserted_at: -1 }).limit(6).toArray();
      res.send(result);
    });

    app.post("/add-property", verifyToken, async (req, res) => {
      const property = req.body;
      try {
        if (req.token_email === property.email) {
          const result = await propertiesCollection.insertOne(property);
          return res.send(result);
        } else {
          return res.send({ message: "Unauthorized access" });
        }
      } catch (error) {
        console.log(error.message);
      }
    });

    app.get("/property/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.findOne({ query });
      res.send(result);
    });

    app.post("/property/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: req.body,
      };
      const options = {};
      const result = await propertiesCollection.updateOne(
        query,
        update,
        options
      );
      res.send(result);
    });

    app.post("/delete-property/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { email } = req.body;
      const existProperty = await propertiesCollection.findOne(query);

      if (req.token_email !== email) {
        return res.send({ message: "Unauthorized access" });
      }

      if (!existProperty) {
        res.send({ message: "The property not found" });
      } else {
        const result = await propertiesCollection.deleteOne(query);
        res.send(result);
      }
    });

    app.get("/ratings", verifyToken, async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = { email };
      const cursor = ratingsCollection.find(query);
      if (req.token_email !== email) {
        return res.status(403).send({ message: "Forbidden" });
      }

      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/ratings", verifyToken, async (req, res) => {
      if (req.token_email !== email) {
        return res.status(403).send({ message: "Forbidden" });
      }

      const data = req.body;
      const result = await ratingsCollection.insertOne(data);
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
