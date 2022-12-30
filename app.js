const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set('strictQuery', false);

//connection to database

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/userDB');
}

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//home page

app.get("/", function (req, res) {
  res.render("home");
});

//login page

app.get("/login", function (req, res) {
  res.render("login");
});

//register page

app.get("/register", function (req, res) {
  res.render("register");
});

//secrets page

app.get("/secrets", function(req, res){
  if (req.isAuthenticated()){
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
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

//start server

app.listen(3000, function () {
  console.log("Server started on port 3000.");
});
