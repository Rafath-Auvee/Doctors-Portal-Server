const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.user}:${process.env.password}@cluster0.afkxs.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});


function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized access.' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const data = client.db("doctors_portal").collection("service");
    const appointment = client.db("doctors_portal").collection("bookings");
    const userData = client.db("doctors_portal").collection("user");


    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userData.find().toArray();
      res.send(users);
    });

    app.get('/admin/:email', async(req, res) =>{
      const email = req.params.email;
      const user = await userData.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
    })


    app.put('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userData.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: 'admin' },
        };
        const result = await userData.updateOne(filter, updateDoc);
        res.send(result);
      }
      else{
        res.status(403).send({message: 'forbidden'});
      }

    })

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userData.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.SECRET, { expiresIn: '1h' })
      res.send({ result, token });
    })

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = data.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // app.post("/booking", async (req, res) => {
    //   const booking = req.body;
    //   const query = {
    //     treatment: booking.treatment,
    //     date: booking.date,
    //     patient: booking.patient,
    //   };
    //   const exists = await appointment.findOne(query);
    //   if (exists) {
    //     return res.send({ success: false, booking: exists });
    //   }
    //   const result = await appointment.insertOne(booking);
    //   return res.send({ success: true, result });
    // });

    app.get("/available", async (req, res) => {
      const date = req.query.date;

      // step 1:  get all services
      const services = await data.find().toArray();

      // step 2: get the booking of that day. output: [{}, {}, {}, {}, {}, {}]
      const query = { date: date };
      const bookings = await appointment.find(query).toArray();

      // step 3: for each service
      services.forEach((service) => {
        // step 4: find bookings for that service. output: [{}, {}, {}, {}]
        const serviceBookings = bookings.filter(
          (book) => book.treatment === service.name
        );
        // step 5: select slots for the service Bookings: ['', '', '', '']
        const bookedSlots = serviceBookings.map((book) => book.slot);
        // step 6: select those slots that are not in bookedSlots
        const available = service.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        //step 7: set available to slots to make it easier
        service.slots = available;
      });

      res.send(services);
    });

    app.get('/booking', verifyJWT, async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = { patient: patient };
        const bookings = await appointment.find(query).toArray();
        return res.send(bookings);
      }
      else {
        return res.status(403).send({ message: 'forbidden access' });
      }
    })

    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
      const exists = await appointment.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists })
      }
      const result = await appointment.insertOne(booking);
      return res.send({ success: true, result });
    })
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server is working ${port}`);
});
