import "dotenv/config"
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

const insertPossibleAnswer = (data) => {
  try {
    const { square, movie_id, poster_url, title, popularity_percentage } = data;

    const sql =
      "INSERT INTO possible_answers (square, movie_id, poster_url, title, popularity_percentage) VALUES (?, ?, ?, ?, ?)";
    const values = [square, movie_id, poster_url, title, popularity_percentage];

    pool.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
      } else {
        console.log("Data inserted successfully!");
      }
    });
  } catch (error) {
    console.log(error);
  }
};

const getAllGuesses = async () => {
  try {
    const sql = "SELECT * FROM guesses";
    const result = await pool.query(sql);
    return result.rows;
  } catch (error) {
    console.log(error);
  }
};

// Loop through all the guesses
// update possible_answers table with the popularity data

const updatePossibleAnswers = async () => {
  try {
    const guesses = await getAllGuesses();
    guesses.forEach((guess) => {
      const {
        square_0,
        square_1,
        square_2,
        square_3,
        square_4,
        square_5,
        square_6,
        square_7,
        square_8,
      } = guess;
      const squares = [
        square_0,
        square_1,
        square_2,
        square_3,
        square_4,
        square_5,
        square_6,
        square_7,
        square_8,
      ];
      squares.forEach((square) => {
        if (square !== null) {
          const sql = "SELECT * FROM possible_answers WHERE square = ?";
          const values = [square];
          pool.query(sql, values, (err, result) => {
            if (err) {
              console.error("Error updating data:", err);
            } else {
              const { movie_id, poster_url, title } = result.rows[0];
              const popularity_percentage = guess.number_of_guesses / 100;
              const data = {
                square,
                movie_id,
                poster_url,
                title,
                popularity_percentage,
              };
              insertPossibleAnswer(data);
            }
          });
        }
      });
    });
  } catch (error) {
    console.log(error);
  }
};

updatePossibleAnswers();