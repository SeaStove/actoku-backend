-- INSERT GUESSES
INSERT INTO guesses (square_0, square_1, square_2, square_3, square_4, square_5, square_6, square_7, square_8, number_of_guesses)
VALUES
(10, 20, NULL, 30, NULL, 40, 50, 60, NULL, 5),
(NULL, NULL, 15, 25, 35, 45, NULL, 55, 65, 3),
(5, NULL, 12, 22, 32, 42, 52, NULL, 62, 8);


-- INSERT A BUNCH OF GAMES INTO GAMES
WITH date_series AS (
    SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        INTERVAL '1 day'
    )::TIMESTAMP AS game_date
)
INSERT INTO games (json_data, game_date)
SELECT 
    '{
        "column": [
            {
                "name": "Brad Pitt",
                "id": 287,
                "imageUrl": "/1k9MVNS9M3Y4KejBHusNdbGJwRw.jpg"
            },
            {
                "name": "Matt Damon",
                "id": 1892,
                "imageUrl": "/aCvBXTAR9B1qRjIRzMBYhhbm1fR.jpg"
            },
            {
                "id": 18277,
                "known_for_department": "Acting",
                "name": "Sandra Bullock",
                "original_name": "Sandra Bullock",
                "popularity": 33.454,
                "imageUrl": "/u2tnZ0L2dwrzFKevVANYT5Pb1nE.jpg"
            }
        ],
        "row": [
            {
                "name": "George Clooney",
                "id": 1461,
                "imageUrl": "/4s3wI0bqOP7K3hhcmKqV6m3GYiQ.jpg"
            },
            {
                "adult": false,
                "gender": 2,
                "id": 1896,
                "known_for_department": "Acting",
                "name": "Don Cheadle",
                "original_name": "Don Cheadle",
                "popularity": 19.122,
                "imageUrl": "/b1EVJWdFn7a75qVYJgwO87W2TJU.jpg"
            },
            {
                "id": 112,
                "known_for_department": "Acting",
                "name": "Cate Blanchett",
                "original_name": "Cate Blanchett",
                "popularity": 14.381,
                "imageUrl": "/A3nZcGx0qUhbb9fpNK65oPgCJtC.jpg"
            }
        ]
    }'::JSONB AS json_data,
    ds.game_date AS game_date
FROM date_series ds;