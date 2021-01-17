const passport = require("passport");
module.exports = (app, db) => {
    app.route("/").get((req, res) => {
        res.redirect("/books");
    });
    app.get("/books", (req, res) => {
        res.render("home.ejs");
    });
    app.get("/requests", (req, res) => {
        res.render("requests.ejs");
    });
    app.get("/requests/new", (req, res) => {
        res.render("createrequest.ejs");
    });
    app.get("/trades", (req, res) => {
        res.render("trades.ejs");
    });
    app.get("/users", (req, res) => {
        res.render("users.ejs");
    });
    app.get("/books/my", (req, res) => {
        res.render("newbook.ejs");
    });
    app.get("/login", (req, res) => {
        res.render("login.ejs");
    });
    app.route("/auth/github").get(passport.authenticate("github"));
    app
        .route("/auth/github/callback")
        .get(
            passport.authenticate("github", { failureRedirect: "/" }),
            (req, res) => {
                req.session.user_id = req.user.id;
                res.redirect("/users");
            }
        );
};