require("dotenv").config();
const bodyParser = require('body-parser');
const routes = require("./routes.js");
const auth = require("./auth.js");
const express = require("express");
const app = express();

let session = require('express-session');
let passport = require("passport");


app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
app.use(session({secret:process.env.SESSION_SECRET,
resave:true,
saveUninitialized:true}))
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next) {
  res.locals.user = req.session.user;
  next();
});

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