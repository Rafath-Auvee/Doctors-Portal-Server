const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.user}:${process.env.password}@cluster0.afkxs.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
  try {
    await client.connect();
    const data = client.db("doctors_portal").collection("service");

    app.get("/service", async(req,res) =>{
      const query = {};
      const cursor = data.find(query)
      const services = await cursor.toArray()
      res.send(services)
    })

  } finally {
    
  }
}


run().catch(console.dir);

app.get('/',(req,res)=>{
  res.send("Server is running")
})

app.listen(port, ()=>{
  console.log(`Server is working ${port}`)
})