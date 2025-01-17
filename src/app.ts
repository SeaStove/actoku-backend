import "dotenv/config";
import express from "express";
import needle from "needle";
import cors from "cors";
import url from "url";
import bodyParser from "body-parser";
import { getGuessStats, getGuesses, getTodaysGame, insertGuess } from "./db/queries.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());

app.get("/health", (req, res) => res.send("OK"));
const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY_NAME = process.env.API_KEY_NAME;
const API_KEY_VALUE = process.env.API_KEY_VALUE;

async function commonGet(subroute, req) {
  if (!API_BASE_URL || !API_KEY_NAME || !API_KEY_VALUE) {
    throw new Error("Missing API_BASE_URL, API_KEY_NAME, or API_KEY_VALUE");
  }
  const params = new URLSearchParams({
    ...url.parse(req.url, true).query,
    [API_KEY_NAME]: API_KEY_VALUE,
  } as any);

  const requestUrl = `${API_BASE_URL}${subroute}?${params}`;
  const apiRes = await needle("get", requestUrl);
  const data = apiRes.body;

  return data;
}

const allowedOrigins = [
  "https://api.actoku.com",
  "http://localhost:5173",
  "https://www.actoku.com",
  "http://127.0.0.1:5173",
];

// CORS options to only allow specific origins
const corsOptions = {
  origin: function (origin, callback) {
    console.log(origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No Siree"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// TODO: Uncomment this when we release the app
// if (process.env.NODE_ENV !== "production") {
app.use(cors(corsOptions));
// }

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

app.get("/guesses", getGuesses);
app.get("/guesses/stats", getGuessStats);
app.get("/game", getTodaysGame);
app.post("/guesses", insertGuess);

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`Local URL to hit: http://localhost:${port}`);
  }
});

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
