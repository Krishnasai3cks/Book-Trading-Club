require("dotenv").config();

const routes = require("./routes.js");
const auth = require("./auth.js");
const express = require("express");
const app = express();

let passport = require("passport");

app.use(passport.initialize());
app.use(passport.session());
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", "./views");

const MongoClient = require("mongodb").MongoClient;

MongoClient.connect(
    process.env.DB, { useUnifiedTopology: true },
    (err, data) => {
        if (err) console.log(err);

        let db = data.db("BookTrading");
        routes(app, db);
        auth(app, db);
    }
);

app.listen(3000, (err, data) => {
    if (err) console.log(err);
    else {
        console.log("app listening on port", 3000);
    }
});