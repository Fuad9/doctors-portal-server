const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const MongoClient = require("mongodb").MongoClient;
const { ObjectID } = require("mongodb");
require("dotenv").config();
const admin = require("firebase-admin");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y0wvq.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static("doctors"));
app.use(fileUpload());

const port = 5000;

app.get("/", (req, res) => {
    res.send("hello from db it's working working");
});

var serviceAccount = require("./doctors-portal-ce75a-firebase-adminsdk-p264c-ddcad2881f.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://doctors-portal-ce75a.firebaseio.com",
});

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
client.connect((err) => {
    const appointmentCollection = client.db("doctorsPortal").collection("appointments");
    const doctorCollection = client.db("doctorsPortal").collection("doctors");
    const bookingsCollection = client.db("doctorsPortal").collection("bookings");
    const prescriptionsCollection = client.db("doctorsPortal").collection("prescriptions");

    // to add appointments
    app.post("/addAppointment", (req, res) => {
        const appointment = req.body;
        appointmentCollection.insertOne({ appointment, status: "Pending" }).then((result) => {
            res.send(result.insertedCount > 0);
        });
    });

    // to check appointments by date
    app.post("/appointmentsByDate", (req, res) => {
        const date = req.body;
        const email = req.body.email;
        doctorCollection.find({ email: email }).toArray((err, doctors) => {
            const filter = { date: date.date };
            if (doctors.length === 0) {
                filter.email = email;
            }
            appointmentCollection.find(filter).toArray((err, documents) => {
                console.log(email, date.date, doctors, documents);
                res.send(documents);
            });
        });
    });

    // to add prescriptions
    app.post("/addPrescriptions", (req, res) => {
        const prescription = req.body;
        prescriptionsCollection.insertOne(prescription).then((result) => {
            res.send(result.insertedCount > 0);
        });
    });

    // to add doctor
    app.post("/addADoctor", (req, res) => {
        const file = req.files.file;
        const name = req.body.name;
        const email = req.body.email;
        const newImg = file.data;
        const encImg = newImg.toString("base64");

        var image = {
            contentType: file.mimetype,
            size: file.size,
            img: Buffer.from(encImg, "base64"),
        };

        doctorCollection.insertOne({ name, email, image }).then((result) => {
            res.send(result.insertedCount > 0);
            console.log(result);
        });
    });

    // to show booking lists
    app.get("/showBookings", (req, res) => {
        bookingsCollection.find({}).toArray((err, documents) => {
            res.send(documents);
        });
    });

    // to show all appointments
    app.get("/appointments", (req, res) => {
        appointmentCollection.find({}).toArray((err, documents) => {
            res.send(documents);
        });
    });

    // to show all doctors
    app.get("/doctors", (req, res) => {
        doctorCollection.find({}).toArray((err, documents) => {
            res.send(documents);
        });
    });

    // to check whether a doctor
    app.post("/isDoctor", (req, res) => {
        const email = req.body.email;
        doctorCollection.find({ email: email }).toArray((err, doctors) => {
            res.send(doctors.length > 0); //true or false
        });
    });

    // to show prescriptionsShortList for specific patient
    app.get("/showPrescriptions", (req, res) => {
        prescriptionsCollection.find({}).toArray((err, documents) => {
            res.send(documents);
        });
    });

    // to update patient appointment status
    app.patch("/statusUpdate", (req, res) => {
        console.log(req.body.status);
        appointmentCollection
            .updateOne(
                { _id: ObjectID(req.body.id) },
                {
                    $set: { status: req.body.status },
                }
            )
            .then((result) => {
                res.send(result);
                console.log(result);
            })
            .catch((err) => console.log(err));
    });
});

app.listen(process.env.PORT || port, console.log("server listening at ", port));
