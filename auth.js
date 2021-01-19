const ObjectID = require("mongodb").ObjectID;
const passport = require("passport");
const GithubStrategy = require("passport-github").Strategy;
require("dotenv").config();
module.exports = (app, db) => {
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });
    passport.deserializeUser((id, done) => {
        db.collection('users').findOne({ _id: new ObjectID(id) }, (err, doc) => {
            done(null, doc);
        });
    });

    passport.use(
        new GithubStrategy({
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: "https://Book-Trading-Club.krishnasai4.repl.co/auth/github/callback",
            },
            (accessToken, refreshToken, profile, cb) => {
                let {name,email,location,id,login} = profile._json;
                db.collection('users').findOneAndUpdate(
                    {id:profile.id},
                    {
                        $setOnInsert:{
                            id:profile.id,
                            name:name || "default name",
                            email:email,
                            created_on:new Date(),
                            provider:profile.provider,
                            location:location,
                            username:login,
                        },
                        $set:{
                            last_login:new Date()
                        },
                        $inc:{
                            login_count:1
                        },
                    },
                    {
                        upsert:true,
                        new:true
                    },
                    (err,doc)=>{
                        if(err) console.log(err);
                        return cb(null,doc.value);
                    }
                )
            }
        )
    );
};