import "dotenv/config";
import needle from "needle";
// import async from "async";
import * as fs from "fs";
// import cache from "./cache.json";

const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY_NAME = process.env.API_KEY_NAME;
const API_KEY_VALUE = process.env.API_KEY_VALUE;

async function commonGet(subroute, query) {
  if (!API_BASE_URL || !API_KEY_NAME || !API_KEY_VALUE) {
    throw new Error("Missing API_BASE_URL, API_KEY_NAME, or API_KEY_VALUE");
  }
  const params = new URLSearchParams({
    [API_KEY_NAME]: API_KEY_VALUE,
  } as any);

  const requestUrl = `${API_BASE_URL}${subroute}?${params}${
    query ? "&" : ""
  }${query}`;
  const apiRes = await needle("get", requestUrl);
  const data = apiRes.body;

  return data;
}

class MovieInfo {
  movieId: number;
  movieName: string;
  moviePoster: string;

  constructor(movieId: number, movieName: string, moviePoster: string) {
    this.movieId = movieId;
    this.movieName = movieName;
    this.moviePoster = moviePoster;
  }
}

class Actor {
  numMovies: number;
  actorName: string;
  movieInfo: MovieInfo[];
  actorPoster: string;
  actorId: number;
  popularity: number;

  constructor(
    numMovies: number,
    actorName: string,
    movieInfo: MovieInfo[],
    actorPoster: string,
    actorId: number,
    popularity: number
  ) {
    this.numMovies = numMovies;
    this.actorName = actorName;
    this.movieInfo = movieInfo;
    this.actorPoster = actorPoster;
    this.actorId = actorId;
    this.popularity = popularity;
  }
}

/*
Function called to start grid generation

- Grid generation will start with one specific actor (check)
- Grid generation will get list of all movies specific actor is in (check)
- Grid generation will check the cast of each movie and add them to a map
of {actorId: How often actor appears with specfic actor} (check)
- Grid generation will select three actors from list of most popular actors (check)
- Grid generation should pull three actors movies and see if they have intersecting actors
*/

function findCommonActors(array1, array2, array3) {
  const commonActors = [];

  array1.forEach((obj1) => {
    const actorId = obj1.actorId;

    if (
      array2.some((obj2) => obj2.actorId === actorId) &&
      array3.some((obj3) => obj3.actorId === actorId)
    ) {
      commonActors.push(obj1);
    }
  });

  return commonActors;
}

async function generateGrid() {
  let games = [];
  let popularCall = await commonGet(`/trending/person/week`, "language=en-US");
  let popular = popularCall.results.filter(
    (actor) =>
      // actor.popularity > 100 &&
      actor.known_for[0].original_language === "en" &&
      (actor.known_for_department === "Acting" ||
        actor.known_for_department === "Directing")
  );
  console.log(`Found ${popular.length} popular actors and directors`);

  popular.sort((a, b) => b.popularity - a.popularity);

  //I have this setup just to do the top result, but once we look at the logic and figure out if this looks good and spits out good games
  //We then can change where i < 1 to be i < popular.length and run it for all the results that were filtered out above.
  //hopefully we get at least 7 good games and can run this on a cron every 6 or 7 days to keep it up to date.

  for (let i = 0; i < Math.max(popular.length, 10); i++) {
    let initialActorMovieCollection = new Map<number, Actor>();
    const randomIndex = getRandomIndex(popular);
    let actorId = popular[randomIndex].id;
    console.log(
      "Starting actor: ",
      popular[randomIndex].name,
      popular[randomIndex].id
    );

    //Get initial actors movie collection
    await getMovieCollectionForActor(actorId, initialActorMovieCollection);

    //Get hash table values and choose three actors the initial actor has worked a lot with
    const onlyPopularMoviePeople = [
      ...initialActorMovieCollection.values(),
    ].filter((item: Actor) => item.numMovies > 3);

    onlyPopularMoviePeople.sort((a, b) => b.numMovies - a.numMovies);

    if (onlyPopularMoviePeople.length < 3) {
      console.log("Not enough actors to generate a game");
      continue;
    }
    //set the top 3 actors as the rows
    let rowChoices = [
      onlyPopularMoviePeople[0],
      onlyPopularMoviePeople[1],
      onlyPopularMoviePeople[2],
    ];
    //use this to make sure we dont add same actors to columns
    let rowActorId = [
      onlyPopularMoviePeople[0].actorId,
      onlyPopularMoviePeople[1].actorId,
      onlyPopularMoviePeople[2].actorId,
      actorId,
    ];

    //holder arr
    let arr = [];
    //only loop through 3 ppl who are the row choices
    for (let i = 0; i < 3; i++) {
      let rowChoice = new Map<number, Actor>();
      let actorId = onlyPopularMoviePeople[i].actorId;
      //do the same search we did above for each of the row ppl
      await getMovieCollectionForActor(actorId, rowChoice);
      const rowChoiceMoviePeople = [...rowChoice.values()].filter(
        (item: Actor) =>
          item.numMovies > 3 && !rowActorId.includes(item.actorId)
      );

      rowChoiceMoviePeople.sort((a, b) => b.numMovies - a.numMovies);
      arr.push(rowChoiceMoviePeople);
    }

    //use the top 3 results from the loop above to find the common denominators in actors
    let commonActors = findCommonActors(arr[0], arr[1], arr[2]);

    //cast the initial actor into an actor class
    let initialActor = new Actor(
      0,
      popular[i].name,
      [],
      popular[i].profile_path,
      popular[i].id,
      popular[i].popularity
    );

    //set col choices based on origin actor, and the top 2 results from cols
    let colChoices = [initialActor, commonActors[0], commonActors[1]];

    //holder arr
    let possibleCorrectAnswers: MovieInfo[][] = [];

    //loop over rows first since that is how we setup our squares to be 1-9 and find movies each pair has in common and push them to the holder array
    for (let i = 0; i < rowChoices.length; i++) {
      for (let j = 0; j < colChoices.length; j++) {
        if (colChoices[j]?.actorId && rowChoices[i]?.actorId) {
          let square = await commonGet(
            `/discover/movie`,
            `include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc&with_cast=${colChoices[j].actorId}%2C${rowChoices[i].actorId}`
          );
          possibleCorrectAnswers.push(square.results);
        }
      }
    }

    //set a breakpoint here to view possible correct answers. Next step is to figure out how to verify if this is a valid game.
    //Meaning there is at least 1 unique movie id for each square.
    // console.log(possibleCorrectAnswers);
    // const stringified = JSON.stringify(possibleCorrectAnswers, null, 2);
    // fs.writeFileSync("./possibleCorrectAnswers.json", stringified);
    await testPossibleAnswers(possibleCorrectAnswers);
  }
  // console.log(games);
}

// async function createActorPromises(
//   actorId: number,
//   actorMap: Map<number, Actor>
// ) {
//   return new Promise(async (resolve, reject) => {
//     await getMovieCollectionForActor(actorId, actorMap);
//     resolve("done");
//   });
// }

/* 
Gets all the movies that the actor has appeared in
and puts them into a hash map of actor id -> Actor information and movies they have both appeared in
*/
async function getMovieCollectionForActor(
  actorId: number,
  movieCollection: Map<number, Actor>
) {
  let listOfMovies = await commonGet(`/person/${actorId}/movie_credits`, "");
  let movieList = getMovies(listOfMovies);

  console.time("start");
  const callsList = [];
  for await (const movie of movieList) {
    callsList.push(
      new Promise(async (resolve, reject) => {
        let movieCredits = await commonGet(
          `/movie/${movie.movieId}/credits`,
          ""
        );
        populateMovieCollectionMap(
          [...movieCredits.cast, ...movieCredits.crew],
          movie,
          movieCollection,
          actorId
        );
        resolve("done");
      })
    );
  }
  await Promise.all(callsList);
  console.timeEnd("start");
}

// Function used for creating movie collection hash map
function populateMovieCollectionMap(
  movieCredits,
  movieInfo: MovieInfo,
  movieCollection: Map<number, Actor>,
  actorId: number
) {
  if (!!movieCredits && movieCredits.length > 0) {
    const actorOnlyList = movieCredits?.filter((crewMember) => {
      return (
        crewMember.known_for_department == "Acting" && crewMember.id !== actorId
      );
    });

    for (const actor of actorOnlyList) {
      let actorInfo = movieCollection.get(actor.id);
      if (actorInfo || actorInfo !== undefined) {
        actorInfo.numMovies = actorInfo.numMovies + 1;
        actorInfo.movieInfo.push(movieInfo);
        movieCollection.set(actor.id, actorInfo);
      } else {
        movieCollection.set(
          actor.id,
          new Actor(
            1,
            actor.name,
            [movieInfo],
            actor.profile_path,
            actor.id,
            actor.popularity
          )
        );
      }
    }
  }
}

//Helper function to choose three random actors from the initial actor array
// function chooseThreeRandomPeople(moviePopularityChoices: Actor[]) {
//   const threeRandomActors: Actor[] = [];

//   threeRandomActors.push(popRandomIndexInArray(moviePopularityChoices));
//   threeRandomActors.push(popRandomIndexInArray(moviePopularityChoices));
//   threeRandomActors.push(popRandomIndexInArray(moviePopularityChoices));
//   return threeRandomActors;
// }

//Helper function for getting random actor from array
function popRandomIndexInArray(array: any[]) {
  let randomIndex = Math.floor(Math.random() * array.length);
  let item = array[randomIndex];
  array.splice(randomIndex, 1);
  return item;
}

//Put initial movie object into slimmed down object that we care about mainly
function getMovies(movieList) {
  let movieIds: MovieInfo[] = [];
  movieList.cast.forEach((movie) => {
    movieIds.push(new MovieInfo(movie.id, movie.title, movie.poster_path));
  });
  return movieIds;
}

function getRandomIndex(array) {
  // console.log(
  //   Math.random(),
  //   array.length,
  //   Math.floor(Math.random() * array.length)
  // );
  return Math.floor(Math.random() * array.length);
}

function readFileAsync(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(JSON.parse(data.toString()));
    });
  });
}

function writeFileAsync(filePath, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(true);
    });
  });
}

async function testPossibleAnswers(
  possibleCorrectAnswers?: any,
  retryCounter = 0
) {
  console.log("Testing possible answers");
  if (!possibleCorrectAnswers)
    possibleCorrectAnswers = await readFileAsync(
      "./possibleCorrectAnswers.json"
    );
  if (!possibleCorrectAnswers) {
    console.error("No possible answers");
    return;
  }
  while (retryCounter < 10) {
    const answerSet = [];
    let validGame = true;
    for (let i = 0; i < possibleCorrectAnswers.length; i++) {
      let added = false;
      const row = possibleCorrectAnswers[i];
      for (let j = 0; j < row.length; j++) {
        const index = getRandomIndex(row);
        const selectedMovieId = row[index].id;
        if (selectedMovieId && !answerSet.includes(selectedMovieId)) {
          answerSet.push(selectedMovieId);
          added = true;
          break;
        } else {
          console.error(
            `Couldn't add ${selectedMovieId} to set, already exists`
          );
        }
      }
      if (!added) {
        console.error("Invalid game");
        validGame = false;
        retryCounter++;
        break;
      }
    }
    if (validGame && answerSet.length === 9) {
      retryCounter = 10;
      console.log("Valid game!");
      for (const index in answerSet) {
        const movieId = answerSet[index];
        const movie = possibleCorrectAnswers[index].find(
          (movie) => movie.id === movieId
        );
        console.log(
          `Square ${index} is ${movie.title} (https://www.themoviedb.org/movie/${movieId})`
        );
      }
      break;
    } else {
      console.error("Invalid game");
      retryCounter++;
    }
  }
}

// testPossibleAnswers();

await generateGrid();
// await testPossibleAnswers();
