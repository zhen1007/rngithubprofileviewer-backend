// server.js
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// MongoDB setup
const mongoURI = "mongodb://localhost:27017";
const dbName = "github_profile_viewer";
const collectionName = "users";

let db;


// GitHub OAuth setup
const clientId = "********************";
const clientSecret = "****************************************";
const appRedirectUri = "com.reactnativegithubprofileviewer://oauthredirect";
const redirectUri = "http://localhost:3000/auth/github/callback";

// Route to initiate GitHub OAuth login flow
app.get("/auth/github", (req, res) => {
  console.log("/auth/github is called");
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user`;
  res.redirect(authUrl);
});

// Route to handle GitHub OAuth callback
app.get("/auth/github/callback", async (req, res) => {
  const code = req.query.code;

  console.log("/auth/github/callback is called ", code);
  try {
    // Exchange OAuth code for access token
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      },
      {
        responseType: 'json'
      }
    );
    console.log("response.data ---------", response.data);
    const params = new URLSearchParams(response.data);
    const accessToken = params.get('access_token');
    console.log("accessToken ---------", accessToken);

    // Fetch user data using access token
    const userDataResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });
    const userData = userDataResponse.data;

    // Save user data to database
    await db.collection(collectionName).insertOne(userData);

    // Redirect back to React Native app
    res.redirect(appRedirectUri);
  } catch (error) {
    console.error("Error handling GitHub OAuth callback:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to register a new user
app.post("/register", async (req, res) => {
  console.log("/auth/register is called");
  const { email, password } = req.body;
  try {
    // Save user data to database
    await db.collection(collectionName).insertOne({ email, password });
    res.status(200).send("User registered successfully");
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to authenticate user login
app.post("/login", async (req, res) => {
  console.log("/auth/login is called");
  const { email, password } = req.body;
  try {
    // Check if user exists in database
    const user = await db
      .collection(collectionName)
      .findOne({ email, password });
    if (user) {
      res.status(200).send("Login successful");
    } else {
      res.status(401).send("Invalid email or password");
    }
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to retrieve user profile
app.get("/profile", async (req, res) => {
  console.log("/auth/profile is called");
  try {
    // Fetch user data from database
    const profile = await db
      .collection(collectionName)
      .findOne({}, { projection: { _id: 0 } });
    res.status(200).json(profile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, async () => {
  const client = new MongoClient(mongoURI);
  await client.connect();
  db = client.db(dbName);

  console.log(`Server is running on http://localhost:${PORT}`);
});
