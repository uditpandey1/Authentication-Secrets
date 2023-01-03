const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
require('dotenv').config()
const MongoStore = require('connect-mongo')(session)

const app = express();

app.use(express.static("public"));

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));

//session

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({ mongooseConnection: mongoose.connection })
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set('strictQuery', false);

//connection to database

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
}

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// used to serialize the user for the session
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//google auth

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

//home page

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

//auth redirect page

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

//login page

app.get("/login", function (req, res) {
  if (req.isAuthenticated()) {
    res.redirect("/secrets");
} else {
    res.render("login");
}
});

//register page

app.get("/register", function (req, res) {
  res.render("register");
});

//secrets page

app.get("/secrets", function(req, res){
  User.find({ "secret": { $ne: null } }, function (err, foundUsers) {
    if (err) {
        console.log(err);
    } else {
        if (foundUsers) {
            res.render("secrets", { usersWithSecrets: foundUsers });
        }
    }
});
});

//logout

app.get("/logout", function (req, res) {
  req.logout(function (err) {
      if (err) {
          res.send(err);
      }
      res.redirect('/');
  });
});

//submit page

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
      res.render("submit");
  } else {
      res.redirect("/login");
  }
});

//adding new user

app.post("/register", function (req, res) {

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

//log in the user

app.post("/login", function (req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

//submit new secret

app.post("/submit", function (req, res) {

  const submittedSecret = req.body.secret;
  console.log(req.user.id);
  User.findById(req.user._id, function (err, foundUser) {
      if (err) {
          console.log(err);
      } else {
          if (foundUser) {
              foundUser.secret = submittedSecret;
              foundUser.save(function () {
                  res.redirect("/secrets");
              });
          }
      }
  });
});

//start server

app.listen(3000, function () {
  console.log("Server started on port 3000.");
});
