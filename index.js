const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;
module.exports = app;


// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.usnrx4f.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("sportsPro");
    const userCollection = database.collection("users");
    const classesCollection = database.collection("classes");
    const selectedClassesCollection = database.collection("selectedClasses");
    const paymentCollection = database.collection("payments");
    const reviewCollection = database.collection("reviews");

    // Users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "account already exist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/get-user", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/get-reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    app.get("/get-instructors", async (req, res) => {
      const query = { role: "instructor" };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/isAdmin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      if (result.role === "admin") {
        res.send(true);
      } else {
        res.send(false);
      }
    });
    app.get("/isInstructor/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      if (result.role === "instructor") {
        res.send(true);
      } else {
        res.send(false);
      }
    });
    app.get("/isStudent/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      if (result.role === "student") {
        res.send(true);
      } else {
        res.send(false);
      }
    });

    app.get("/get-user-role/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.put("/update-user-role/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: body.role,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // classes
    app.post("/add-class", async (req, res) => {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    });

    app.put("/update-admin-feedback/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: body.feedback,
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/get-instructor-classes/:email", async (req, res) => {
      const email = req.params.email;
      const query = { instructorEmail: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/get-approve-classes", async (req, res) => {
      const query = { status: "approve" };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/get-classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    app.delete("/dlt-selected-classes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassesCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/update-status/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: body.status,
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // selected calss by student
    app.post("/selected-classitem", async (req, res) => {
      const selectedClassItem = req.body;
      const query = { classItemId: selectedClassItem.classItemId };
      const existingitem = await selectedClassesCollection.findOne(query);
      if (existingitem) {
        return res.send({ message: "allready adden in dashboard" });
      }
      const result = await selectedClassesCollection.insertOne(
        selectedClassItem
      );
      res.send(result);
    });

    app.get("/get-selected-classes/:email", async (req, res) => {
      const email = req.params.email;
      const query = { selectedBy: email };
      const result = await selectedClassesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/get-payed-classes/:email", async (req, res) => {
      const email = req.params.email;
      const query = { user: email };

      const result = await paymentCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment related api
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const insertresult = await paymentCollection.insertOne(payment);
      const querydlt = { _id: new ObjectId(payment.selectedClassId) };
      const filter = { _id: new ObjectId(payment.classItemId) };
      const deleteResult = await selectedClassesCollection.deleteOne(querydlt);

      const updateDoc = {
        $set: {
          totalEnrolledStudent: payment.totalEnrolledStudent + 1,
          availableSeats: payment.availableSeats - 1,
        },
      };

      const updateResult = await classesCollection.updateOne(filter, updateDoc);
      res.send({ insertresult, deleteResult, updateDoc });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("sports pro academy is running");
});

app.listen(port, () => {
  console.log(`sports pro academy is running  ${port}`);
});
