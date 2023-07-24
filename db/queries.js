const Pool = require("pg").Pool;
const url = require("url");

const params = url.parse(process.env.DATABASE_URL);
const auth = params.auth.split(":");
const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split("/")[1],
  ssl: true,
};

const pool = new Pool(config);

const getGuesses = (request, response) => {
  pool.query("SELECT * FROM guesses ORDER BY id ASC", (error, results) => {
    if (error) {
      throw error;
    }
    response.status(200).json(results.rows);
  });
};

const insertGuess = (request, response) => {
  console.log(request.body);
  try {
    const { squares, guesses } = request.body;

    // Prepare the values part of the INSERT statement
    const values = squares
      .map((square) => (square !== null ? square : "NULL"))
      .join(", ");

    // Construct the full INSERT statement using template literals
    const insertStatement = `INSERT INTO guesses (square_0, square_1, square_2, square_3, square_4, square_5, square_6, square_7, square_8, number_of_guesses)
      VALUES ( ${values}, ${guesses}) returning id;`;

    // Execute the INSERT statement
    pool.query(insertStatement, (error, results) => {
      console.log(results);
      if (error) {
        throw error;
      }
      const insertId = results?.rows?.[0]?.id;
      response.status(201).send(`Guess added with ID: ${insertId}`);
    });
  } catch (error) {
    console.log(error);
    response.status(500).send(`Error adding guess: ${error}`);
  }
};

const getGuessStats = (request, response) => {
  // TODO: write this query
  pool.query(`SELECT * from guesses`, (error, results) => {
    if (error) {
      throw error;
    }
    response.status(200).json(results);
  });
};

module.exports = {
  getGuesses,
  insertGuess,
  getGuessStats,
};
