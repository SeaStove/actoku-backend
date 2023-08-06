import "dotenv/config";
import needle from "needle";
import async from "async";

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
  
    const requestUrl = `${API_BASE_URL}${subroute}?${params}&${query}`;
    console.log(requestUrl)
    const apiRes = await needle("get", requestUrl);
    const data = apiRes.body;
  
    return data;
}

class MovieInfo {
    movieId: number
    movieName: string
    moviePoster: string

    constructor(movieId: number, movieName: string, moviePoster: string) {
        this.movieId = movieId
        this.movieName = movieName
        this.moviePoster = moviePoster
    }
}

class Actor {
    numMovies: number
    actorName: string
    movieInfo: MovieInfo[]
    actorPoster: string
    actorId: number

    constructor(numMovies: number, actorName: string, movieInfo: MovieInfo[], actorPoster: string, actorId: number) {
        this.numMovies = numMovies
        this.actorName = actorName
        this.movieInfo = movieInfo
        this.actorPoster = actorPoster
        this.actorId = actorId
    }
}

/*
Function called to start grid generation

- Grid generation will start with one specific actor (check)
- Grid generation will get list of all movies specific actor is in (check)
- Grid generation will check the cast of each movie and add them to a map
of {actorId: How often actor appears with specfic actor} (check)
- Grid generation will select three actors from list of most popular actors (check)
- Grid generation should pull three actors movies and see if they have intersection actors
*/
async function generateGrid() {
    
    let initialActorMovieCollection = new Map<number, Actor>();
    let actorId = 1892

    //Get initial actors movie collection
    await getMovieCollectionForActor(actorId, initialActorMovieCollection)

    //Get hash table values and choose three actors the initial actor has worked a lot with
    const onlyPopularMoviePeople = [...initialActorMovieCollection.values()].filter((item: Actor) => item.numMovies > 3)
    let rowChoices = chooseThreeRandomPeople(onlyPopularMoviePeople)

    let actorMaps: Map<number, Actor>[] = [
        new Map<number, Actor>(),
        new Map<number, Actor>(),
        new Map<number, Actor>()
    ]

    await getMovieCollectionForActor(rowChoices[0].actorId, actorMaps[0])
    await getMovieCollectionForActor(rowChoices[1].actorId, actorMaps[1])
    await getMovieCollectionForActor(rowChoices[2].actorId, actorMaps[2])
}

async function createActorPromises(actorId: number, actorMap: Map<number, Actor>) {
    return new Promise(async (resolve, reject) => {
        await getMovieCollectionForActor(actorId, actorMap)
        resolve("done")
    })
}

/* 
Gets all the movies that the actor has appeared in
and puts them into a hash map of actor id -> Actor information and movies they have both appeared in
*/
async function getMovieCollectionForActor(actorId: number, movieCollection: Map<number, Actor>) {
    let listOfMovies = await commonGet(`/person/${actorId}/movie_credits`, "")
    let movieList = getMovies(listOfMovies)

    console.time("start")
    const callsList = []
    for await (const movie of movieList) {
        callsList.push(new Promise(async (resolve, reject) => {
            let movieCredits = await commonGet(`/movie/${movie.movieId}/credits`, "")
            populateMovieCollectionMap(movieCredits.cast, movie, movieCollection)
            resolve("done")
        }))
    }
    await Promise.all(callsList)
    console.timeEnd("start")
}

// Function used for creating movie collection hash map
function populateMovieCollectionMap(movieCredits, movieInfo: MovieInfo, movieCollection: Map<number, Actor>) {
    const actorOnlyList = movieCredits.filter(crewMember => {
        return crewMember.known_for_department == "Acting" && crewMember.id !== 1892
    })

    for(const actor of actorOnlyList) {
        let actorInfo = movieCollection.get(actor.id)
        if (actorInfo || actorInfo !== undefined) {
            actorInfo.numMovies = actorInfo.numMovies + 1
            actorInfo.movieInfo.push(movieInfo)
            movieCollection.set(actor.id, actorInfo)
        } else {
            movieCollection.set(actor.id , new Actor(1, actor.name, [movieInfo], actor.profile_path, actor.id))
        }
    }
}

//Helper function to choose three random actors from the initial actor array
function chooseThreeRandomPeople(moviePopularityChoices: Actor[]) {
    const threeRandomActors: Actor[] = []
    
    threeRandomActors.push(popRandomIndexInArray(moviePopularityChoices))
    threeRandomActors.push(popRandomIndexInArray(moviePopularityChoices))
    threeRandomActors.push(popRandomIndexInArray(moviePopularityChoices))
    return threeRandomActors
}

//Helper function for getting random actor from array
function popRandomIndexInArray(array: any[]) {
    let randomIndex = Math.floor(Math.random() * array.length)
    let item = array[randomIndex]
    array.splice(randomIndex,1)
    return item
}

//Put initial movie object into slimmed down object that we care about mainly
function getMovies(movieList) {

    let movieIds: MovieInfo[] = []
    movieList.cast.forEach(movie => {
        movieIds.push(new MovieInfo(movie.id, movie.title, movie.poster_path))
    })
    return movieIds
}

await generateGrid()