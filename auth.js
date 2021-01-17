const ObjectID = require("mongodb").ObjectID;
const passport = require("passport");
const GithubStrategy = require("passport-github").Strategy;
require("dotenv").config();
module.exports = (app, db) => {
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });
    passport.deserializeUser((id, done) => {
        db.findOne({ _id: new ObjectID(id) }, (err, doc) => {
            done(null, doc);
        });
    });

    passport.use(
        new GithubStrategy({
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: "http://127.0.0.1/auth/github/callback",
            },
            (accessToken, refreshToken, profile, cb) => {
                console.log(profile);
                // db.findOneAndUpdate(
                //     {id:profile.id},
                //     {
                //         $setOnInsert:{
                //             id:profile.id,
                //             name:profile.displayName || "default name",

                //         }
                //     }
                // )
            }
        )
    );
};