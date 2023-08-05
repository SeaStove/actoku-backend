import pkg from "pg";
const { Pool } = pkg;
import url from "url";
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

export const getGuesses = (request, response) => {
  pool.query("SELECT * FROM guesses ORDER BY id ASC", (error, results) => {
    if (error) {
      throw error;
    }
    response.status(200).json(results.rows);
  });
};

export const insertGuess = (request, response) => {
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

export const getGuessStats = (request, response) => {
  pool.query(
    `SELECT * FROM guesses`,

    (error, results) => {
      if (error) {
        throw error;
      }
      const totalGuessesPerSquare = {};
      for (let i = 0; i < 9; i++) {
        totalGuessesPerSquare[`square_${i}`] = results.rows.reduce(
          (total, row) =>
            total + (row[`square_${i}`] !== null ? row.number_of_guesses : 0),
          0
        );
      }

      // Create the summary object
      const summary: { average_number_of_guesses } = {
        average_number_of_guesses: 0,
      };
      for (let i = 0; i < 9; i++) {
        const squareKey = `square_${i}`;
        summary[squareKey] = {};
        results.rows
          .filter((row) => row[`square_${i}`] !== null)
          .forEach((row) => {
            const percent =
              (100 * row.number_of_guesses) /
              totalGuessesPerSquare[`square_${i}`];
            summary[squareKey][row.id] = parseFloat(percent.toFixed(2)); // Rounding to 2 decimal places
          });
      }

      // Calculate the average number of guesses
      const totalGuesses = results.rows.reduce(
        (total, row) => total + row.number_of_guesses,
        0
      );
      const averageGuesses = totalGuesses / results.rows.length;
      summary.average_number_of_guesses = averageGuesses;
      response.status(200).json(summary);
    }
  );
};
