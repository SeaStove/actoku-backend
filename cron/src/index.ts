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
    const totalCount = {0:{},1: {}, 2: {}, 3: {}, 4:{}, 5:{}, 6:{}, 7:{}, 8:{}};
    guesses.forEach((guess) => {
      const {
        number_of_guesses, id, ...squares
      } = guess;

      Object.values(squares).forEach((movie_id, index) => {
        // console.log(movie_id, index);
        if (movie_id !== null) {
          totalCount[index].total = (totalCount[index].total ?? 0) + 1;
          totalCount[index][movie_id] = (totalCount?.[index]?.[movie_id] ?? 0) + 1;
        }
      });
    });
    console.log(totalCount)
    Object.keys(totalCount).forEach(square => {
       //TODO: Update popularity
    })
  } catch (error) {
    console.log(error);
  }
};

updatePossibleAnswers();