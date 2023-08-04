require("dotenv").config();
const express = require("express");
const needle = require("needle");
const cors = require("cors");
const url = require("url");

const app = express();
const db = require("./db/queries");
var bodyParser = require("body-parser");
const port = process.env.PORT || 5000;

app.use(bodyParser.json());

app.get("/health", (req, res) => res.send("OK"));
const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY_NAME = process.env.API_KEY_NAME;
const API_KEY_VALUE = process.env.API_KEY_VALUE;

async function commonGet(subroute, req) {
  const params = new URLSearchParams({
    ...url.parse(req.url, true).query,
    [API_KEY_NAME]: API_KEY_VALUE,
  });

  const requestUrl = `${API_BASE_URL}${subroute}?${params}`;
  const apiRes = await needle("get", requestUrl);
  const data = apiRes.body;

  return data;
}

if (process.env.NODE_ENV !== "production") {
  app.use(cors());
}

app.get("/search/movie", async (req, res, next) => {
  try {
    const data = await commonGet("/search/movie", req);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

app.get("/movie/:movieId/credits", async (req, res, next) => {
  try {
    const data = await commonGet(`/movie/${req.params.movieId}/credits`, req);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

app.get("/guesses", db.getGuesses);
app.get("/guesses/stats", db.getGuessStats);
app.post("/guesses", db.insertGuess);

const server = app.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
