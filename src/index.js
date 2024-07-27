require("dotenv").config();
const { Client, IntentsBitField } = require("discord.js");
const puppeteer = require("puppeteer");

// Client = our bot, this is what we initialize
const client = new Client({
  intents: [
    // Intents = set of permissions that our bot can use in order to get access to a set of events
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

let browser;

// event listener -- when bot is ready
client.on("ready", async (c) => {
  console.log(`${c.user.username} is ready!`);
  browser = await puppeteer.launch({ headless: true });
});

client.on("interactionCreate", async (interaction) => {
  try {
    // If it's not a slash command interaction, bot does nothing
    if (!interaction.isChatInputCommand) return;

    // if browser is not set, set it
    if (!browser) browser = await puppeteer.launch({ headless: true });

    console.log(`responding to interaction: ${interaction.commandName}`);
    if (interaction.commandName == "choose-movie-for-me") {
      var letterboxdUsername = interaction.options.get(
        "letterboxd-username"
      ).value;
      let chosenMovie = await getWatchListMovies(letterboxdUsername);
      interaction.reply(`You should watch: ${chosenMovie.name}`);
    }
  } catch (error) {
    console.error(`Error handling interaction: ${error.message}`);
    interaction.reply(`${error.message}`);
  }
});

async function getWatchListMovies(username) {
  try {
    let allMoviesInWatchlist = [];
    // TODO: Loop through all the pages that make up the whole watchlist
    console.log(`getting movies from ${username}'s watchlist`);

    // open a new page in the browser
    const page = await browser.newPage();

    // Navigate the page to a URL.
    await page.goto(`https://letterboxd.com/${username}/watchlist/`, {
      waitUntil: "domcontentloaded",
    });

    // Check if the page was letterboxd's default error page
    const isError = await page.evaluate(() => {
      return document.body.classList.contains("error");
    });
    if (isError) {
      throw new Error(
        "Nothing pulled up... Make sure you typed in your username correctly!"
      );
    }

    // Scroll to bottom of page
    await autoScroll(page);

    // Get all the elements with the class "poster-container"
    let movies = await page.$$(".poster-container");

    // movies will at most have 28 films in it
    for (let liOfMovie of movies) {
      // let attributeValue = await liOfMovie.evaluate((domElement) => {
      //   domElement.getElementsByClassName("poster");
      // });

      let movieDetails = await page.evaluate((el) => {
        // Find the child elements with class "poster" within the current element
        let poster = el.getElementsByClassName("film-poster")[0];

      // movies will at most have 28 films in it
      for (let liOfMovie of movies) {
        let movieDetails = await page.evaluate((el) => {
          // Find the child elements with class "poster" within the current element
          let poster = el.getElementsByClassName("film-poster")[0];
          let imgElement = poster.getElementsByTagName("img")[0]; // Assuming there's at least one img
          let a = poster.getElementsByTagName("a")[0]; // Assuming there's at least one a under this div

          // return custom "movie" object
          return {
            name: poster.textContent.trim(),
            posterSrc: imgElement ? imgElement.getAttribute("srcset") : null,
            urlToFilmPage: a ? a.getAttribute("href") : null,
          };
        }, liOfMovie);
        allMoviesInWatchlist.push(movieDetails);
      }

      // navigate to the next page if there are more pages
      if (areMorePages) {
        console.log(`nextUrl: ${nextUrl}`);
        if (nextUrl) {
          await page.goto(nextUrl, {
            waitUntil: "domcontentloaded",
          });
        } else {
          areMorePages = false;
        }
      }
    } while (areMorePages);

    // choose the movie
    // pick a random movie from the list
    const random = Math.floor(Math.random() * allMoviesInWatchlist.length);
    const chosenMovie =
      allMoviesInWatchlist[
        random
        // Math.floor(Math.random() * allMoviesInWatchlist.length)
      ];

    console.log(random);
    console.log(allMoviesInWatchlist.length);
    console.log(chosenMovie);
    console.log(`your chosen movie is \n ${chosenMovie.name}`); // TODO: Delete
    // console.log(allMoviesInWatchlist); // TODO: Delete

    // TODO: Go through all the pages that a user may have for their wishlist
    console.log("succesfully acquired a movie");

    return chosenMovie;
  } catch (error) {
    throw new Error(error);
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

client.login(process.env.LETTERBOTD_TOKEN);
