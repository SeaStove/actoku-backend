CREATE TABLE guesses (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    square_0 INT,
    square_1 INT,
    square_2 INT,
    square_3 INT,
    square_4 INT,
    square_5 INT,
    square_6 INT,
    square_7 INT,
    square_8 INT,
    number_of_guesses INT
);

CREATE TABLE most_popular_guesses (
    square INT,
    movie_id INT,
    poster_url VARCHAR(255),
    title VARCHAR(255),
    popularity_percentage DECIMAL(5,2)
);