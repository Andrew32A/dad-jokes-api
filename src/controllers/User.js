require("dotenv").config();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const checkAuth = require("../middleware/checkAuth");

module.exports = (app) => {
  app.get("/", (req, res) => res.json("hello world"));

  // SHOW all
  app.get("/users", checkAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized. Please login.");
      }
      const users = await User.find();
      res.json({ users });
    } catch (err) {
      console.log(`Get users error: ${err}`);
      res.status(500).json({ error: err.message });
    }
  });

  // SHOW one
  app.get("/users/:id", checkAuth, async (req, res) => {
    try {
      if (req.user._id != req.params.id) {
        return res.status(401).send("Unauthorized. Please login.");
      }
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        throw new Error("User not found");
      }
      res.json({ user });
    } catch (err) {
      console.log(`Get user error: ${err}`);
      res.status(404).json({ error: err.message });
    }
  });

  // SIGN UP FORM
  app.get("/sign-up", (req, res) => res.render("sign-up"));

  // SIGN UP POST
  app.post("/sign-up", async (req, res) => {
    try {
      // Create User
      const user = new User(req.body);
      await user.save();

      // Create JWT token
      const token = jwt.sign({ _id: user._id }, process.env.SECRET, {
        expiresIn: "60 days",
      });
      // Set cookie
      res.cookie("nToken", token, { maxAge: 900000, httpOnly: true });
      res.redirect("/");
    } catch (err) {
      if (err.name === "MongoError" && err.code === 11000) {
        // Duplicate key error - username already taken
        return res.status(409).send("Username already taken");
      }
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  });

  // LOGOUT
  app.get("/logout", (req, res) => {
    res.clearCookie("nToken");
    res.redirect("/");
  });

  // LOGIN FORM
  app.get("/login", (req, res) => res.render("login"));

  //LOGIN
  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      // Find this user name
      const user = await User.findOne({ username }, "username password");
      if (!user) {
        // User not found
        return res.status(401).send({ message: "Wrong Username or Password" });
      }

      // check if user is alive
      // if (!user.isAlive) {
      //   return res
      //     .status(409)
      //     .send({
      //       message:
      //         "You have been killed while you were away, better luck next time!",
      //     });
      // }

      // Check the password
      user.comparePassword(password, (err, isMatch) => {
        if (!isMatch) {
          // Password does not match
          return res
            .status(401)
            .send({ message: "Wrong Username or password" });
        }
        // Create a token
        const token = jwt.sign(
          { _id: user._id, username: user.username },
          process.env.SECRET,
          {
            expiresIn: "60 days",
          }
        );
        // Set a cookie and redirect to root
        res.cookie("nToken", token, { maxAge: 900000, httpOnly: true });
        return res.redirect(`/users/${user.id}`);
      });
    } catch (err) {
      console.log(err);
    }
  });

  // probe
  app.get("/probe/:id", async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).send("User not found");
      }
      const defense = user.defense;
      const halfDefense = defense.substr(0, Math.ceil(defense.length / 2));
      return res.send(halfDefense);
    } catch (e) {
      console.error(e);
      res.status(500).send();
    }
  });

  // help, controls, 
  app.get("/help", async (req, res) => { 
    res.json("help")
  })

  // attack
  app.post("/attack/:id", checkAuth, async (req, res) => {
    try {
      const user = await User.findById(req.user._id); // assuming req.user contains the authenticated user's information
      const enemy = await User.findById(req.params.id);
      if (!enemy) {
        return res.status(404).send("Enemy not found");
      }
      const guessedDefense = req.body.defense;
      if (guessedDefense === enemy.defense) {
        await User.deleteOne({ _id: enemy.id });
        return res.send("Enemy eliminated!");
      } else {
        console.log("ENEMY DEFENSE", enemy.defense)
        console.log("GUESSED DEFENSE", guessedDefense)
        return res.send("Incorrect guess, try again.");
      }
    } catch (e) {
      console.error(e);
      res.status(500).send();
    }
  });  
};
