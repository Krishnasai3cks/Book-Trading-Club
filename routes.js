const passport = require("passport");
const ObjectID = require("mongodb").ObjectID;
let session;
let called = false;
module.exports = (app, db) => {
    const ensureAuthenticated = (req, res, next) => {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect("/login");
    };
    app.use(function(req, res, next) {
        res.locals.activerequests = [];
        next();
    });
    app.route("/").get((req, res) => {
        if (!called) {
            session = req.session;
            called = true;
        }
        res.redirect("/books");
    });
    app.get("/books", (req, res) => {
        db.collection("books")
            .find({})
            .toArray((err, data) => {
                if (typeof session !== "undefined") {
                    session["activerequests"] = [];
                }
                data.forEach((book) => {
                    if (
                        req.user &&
                        req.user.id == book.created_by &&
                        book.requests.length > 0
                    ) {
                        session["activerequests"].push(book);
                    }
                });
                if (
                    typeof session !== "undefined" &&
                    typeof session["activerequests"] !== "undefined"
                ) {
                    res.locals.activerequests = session["activerequests"];
                }
                res.render("home.ejs", {
                    ...req.user,
                    books: data,
                    calledfrom: "books",
                });
            });
    });
    app.route("/requests").get((req, res) => {
        if (!called) {
            session = req.session;
            called = true;
        }
        db.collection("books")
            .find({})
            .toArray((err, data) => {
                if (err) console.log(err);
                else {
                    let liverequests = {};
                    data.forEach((book) => {
                        book.requests.forEach((req) => {
                            if (!liverequests.hasOwnProperty(req._id)) {
                                liverequests[req._id] = [req];
                            }
                            liverequests[req._id].push(book);
                        });
                    });
                    session["liverequests"] = liverequests;
                    res.render("requests.ejs", {
                        ...req.user,
                        liverequests,
                        calledfrom: "All-Requests",
                    });
                }
            });
    });
    app.get("/cancelrequest/:id", ensureAuthenticated, (req, res) => {
        let { id } = req.params;
        let bookIDArray = [];
        let bookToBeRemoved;
        session["liverequests"][id].forEach((book) => {
            if (book === session["liverequests"][id][0]) {
                bookToBeRemoved = book;
            } else {
                bookIDArray.push(new ObjectID(book._id));
            }
        });
        db.collection("books").updateMany({
                _id: {
                    $in: bookIDArray,
                },
            }, {
                $pull: {
                    requests: {
                        _id: new ObjectID(bookToBeRemoved._id),
                    },
                },
            },
            (err, data) => {
                if (err) console.log(err);
                else {
                    res.redirect("/requests");
                }
            }
        );
    });
    app
        .route("/requests/new")
        .get(ensureAuthenticated, (req, res) => {
            res.render("createrequest.ejs", {
                ...req.user,
                calledfrom: "New-Requests",
                toGive: session["toGive"],
                toTake: session["toTake"],
            });
        })
        .post(ensureAuthenticated, (req, res) => {
            let { selectbooks } = req.body;
            let bookIDArray = [];
            if (typeof selectbooks == "undefined") {
                selectbooks = [];
            }
            if (typeof selectbooks == "string") {
                selectbooks = [selectbooks];
            }
            selectbooks.forEach((string) => {
                bookIDArray.push(new ObjectID(string));
            });
            db.collection("books")
                .find({
                    _id: {
                        $in: bookIDArray,
                    },
                })
                .toArray((err, data) => {
                    let toGive = [];
                    let toTake = [];
                    data.forEach((val) => {
                        if (val.created_by == req.user.id) {
                            toGive.push(val);
                        } else {
                            toTake.push(val);
                        }
                        session.toGive = toGive;
                        session.toTake = toTake;
                    });
                });
            res.redirect("/requests/new");
        });
    app.route("/submitrequest").get(ensureAuthenticated, (req, res) => {
        let objArray = [];
        session.toTake.forEach((val) => {
            objArray.push(new ObjectID(val._id));
        });
        db.collection("books").updateMany({
                _id: {
                    $in: objArray,
                },
            }, {
                $push: { requests: { $each: session.toGive } },
            },
            (err, doc) => {
                if (err) console.log(err);
                else res.redirect("/");
            }
        );
    });
    app.route("/liverequests").get(ensureAuthenticated, (req, res) => {
        res.render("liverequests.ejs", {
            activerequests: session["activerequests"],
        });
    });
    app.route("/acceptrequest").post(ensureAuthenticated, (req, res) => {
        let { selectbooks } = req.body;
        if (!selectbooks) {
            res.redirect("/liverequests");
        } else if (typeof selectbooks == "string") {
            selectbooks = [selectbooks];
        }
        let givenBookIDArray = [];
        let gottenBooksIDArray = [];
        selectbooks.forEach((bookID) => {
            givenBookIDArray.push(new ObjectID(bookID));
        });
        db.collection("books")
            .find({
                _id: {
                    $in: givenBookIDArray,
                },
            })
            .toArray((err, books) => {
                let givenBooks = [];
                let gottenBooks = [];
                books.forEach((data) => {
                    givenBooks.push(data);
                    gottenBooks = data.requests;
                    gottenBooks.forEach((book) => {
                        gottenBooksIDArray.push(new ObjectID(book._id));
                    });
                });
                db.collection("trades").insertOne({
                        traded_on: new Date(),
                        trades: [givenBooks, gottenBooks],
                    },
                    (err, data) => {
                        if (err) console.log(err);
                        else {
                            db.collection("books").deleteMany({
                                _id: {
                                    $in: [...givenBookIDArray, ...gottenBooksIDArray],
                                },
                            });
                            res.redirect("/trades");
                        }
                    }
                );
            });
    });
    app.get("/trades", (req, res) => {
        db.collection("trades")
            .find({})
            .toArray((err, trades) => {
                res.render("trades.ejs", {...req.user, trades, calledfrom: "Trades" });
            });
    });
    app.get("/users", (req, res) => {
        db.collection("users")
            .find({})
            .toArray((err, data) => {
                res.render("users", {...req.user, data, calledfrom: "Users" });
            });
    });
    app.route("/users/edit").get(ensureAuthenticated, (req, res) => {
        res.render("editprofile.ejs", {...req.user });
    });
    app.route("/users/:username").get((req, res) => {
        let { username } = req.params;
        db.collection("users")
            .find({ username: username })
            .toArray((err, data) => {
                data = data[0];
                res.render("profile.ejs", { user: data, ...req.user });
            });
    });
    app.route("/update").post(ensureAuthenticated, (req, res) => {
        let { name, username, location } = req.body;
        db.collection("users").findOneAndUpdate({ username: username }, {
                $set: {
                    name: name,
                    username: username,
                    location: location,
                },
            }, { returnOriginal: false },
            (err, doc) => {
                if (err) console.log("error");
                else res.redirect("/users/edit");
            }
        );
    });
    app.route("/books/my").get(ensureAuthenticated, (req, res) => {
        db.collection("books")
            .find({ created_by: req.user.id })
            .toArray((err, data) => {
                res.render("newbook.ejs", {...req.user, data });
            });
    });
    app.route("/newbook").post(ensureAuthenticated, (req, res) => {
        let { title, desc } = req.body;
        let response = {
            title,
            desc,
            created_by: req.user.id,
            username: req.user.username,
            location: req.user.location,
            requests: [],
        };
        db.collection("books").insertOne(response, (err, data) => {
            if (err) console.log("cannot Insert");
            else res.redirect("/books/my");
        });
    });
    app.route("/deletebook").get(ensureAuthenticated, (req, res) => {
        let { id } = req.query;
        db.collection("books").findOneAndDelete({ _id: new ObjectID(id) },
            (err, data) => {
                if (err) console.log("err couldn't delete");
                else {
                    res.redirect("/books/my");
                }
            }
        );
    });
    app.get("/login", (req, res) => {
        session = req.session;
        session["toGive"] = [];
        session["toTake"] = [];
        res.render("login.ejs");
    });
    app.route("/logout").get(ensureAuthenticated, (req, res) => {
        req.logout();
        res.redirect("/");
    });
    app.route("/auth/github").get(passport.authenticate("github"));
    app
        .route("/auth/github/callback")
        .get(
            passport.authenticate("github", { failureRedirect: "/" }),
            (req, res) => {
                req.session.user_id = req.user.id;
                res.redirect("/");
            }
        );
};