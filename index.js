import express from "express";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.aopfsxd.mongodb.net/?appName=Cluster0`;
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
  res.send("Server is ok");
});

async function run() {
  try {
    // await client.connect();

    const db = client.db("homenest");
    const usersCollection = db.collection("users");
    const ratingsCollection = db.collection("ratings");
    const propertiesCollection = db.collection("properties");
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
      const email = req.query.email;
      // console.log(email);
      const query = {};
      if (email) {
        query.userEmail = email;
      }

      const cursor = propertiesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/featured", async (req, res) => {
      const cursor = propertiesCollection.find();
      const result = await cursor.sort({ inserted_at: -1 }).limit(6).toArray();
      res.send(result);
    });

    app.get("/property/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.findOne(query);
      res.send(result);
    });

    app.post("/add-property", async (req, res) => {
      const property = req.body;
      const result = await propertiesCollection.insertOne(property);
      return res.send(result);
    });

    app.patch("/update-property/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        const {
          propertyName,
          shortDescription,
          category,
          propertyPrice,
          location,
          image,
        } = req.body;

        const updateFields = {};
        if (propertyName) updateFields.propertyName = propertyName;
        if (shortDescription) updateFields.shortDescription = shortDescription;
        if (category) updateFields.category = category;
        if (propertyPrice) updateFields.propertyPrice = Number(propertyPrice);
        if (location) updateFields.location = location;
        if (image) updateFields.image = image;

        updateFields.updatedAt = new Date();

        const updateDoc = { $set: updateFields };

        const result = await propertiesCollection.updateOne(query, updateDoc);

        if (result.modifiedCount > 0) {
          const updatedProperty = await propertiesCollection.findOne(query);
          return res.send({
            success: true,
            message: "Property updated successfully",
            updatedProperty,
          });
        } else {
          return res.status(404).send({
            success: false,
            message: "Property not found or no changes detected",
          });
        }
      } catch (err) {
        console.error(err);
        res.status(500).send({
          success: false,
          message: "Failed to update property",
        });
      }
    });

    app.delete("/delete-property/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const existProperty = await propertiesCollection.findOne(query);

      if (!existProperty) {
        res.send({ message: "The property not found" });
      } else {
        const result = await propertiesCollection.deleteOne(query);
        res.send(result);
      }
    });

    app.get("/ratings", async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const cursor = ratingsCollection.find(query);

      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/ratings", async (req, res) => {
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
