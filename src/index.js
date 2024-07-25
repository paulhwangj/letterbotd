// TODO: Delete?
// Need both import and require, followed: https://stackoverflow.com/a/61947868/22395752
// import { createRequire } from 'module'
// const require = createRequire(import.meta.url);

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

// event listener -- when bot is ready
client.on("ready", (c) => {
  console.log(`${c.user.username} is ready!`);
});

client.on("interactionCreate", async (interaction) => {
  // If it's not a slash command interaction, bot does nothing
  if (!interaction.isChatInputCommand) return;

  console.log(`responding to interaction: ${interaction.commandName}`);
  if (interaction.commandName == "choose-movie-for-me") {
    var letterboxdUsername = interaction.options.get(
      "letterboxd-username"
    ).value;
    await getWatchListMovies(letterboxdUsername);
  }
});

async function getWatchListMovies(username) {
  var browser;
  try {
    let allMoviesInWatchlist = [];
    // TODO: Loop through all the pages that make up the whole watchlist
    console.log(`getting movies from ${username}'s watchlist`);

    // Launch the browser and open a new blank page
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    // Navigate the page to a URL.
    await page.goto(`https://letterboxd.com/${username}/watchlist/`, {
      waitUntil: "domcontentloaded",
    });

    // // Scroll to the bottom of the page so that all the content loads
    // await autoScroll(page);

    // checks to see that html is actually
    // console.log(await page.content());

    // Get all the elements with the class "poster-container"
    let movies = await page.$$(".poster-container");
    // movies will at most have 28 films in it
    for (let liOfMovie of movies) {
      // let attributeValue = await liOfMovie.evaluate((domElement) => {
      //   domElement.getElementsByClassName("poster");
      // });

      let movieDetails = await page.evaluate((el) => {
        // Find the child elements with class "poster" within the current element
        let poster = el.getElementsByClassName("poster")[0];

        // create custom object
        let imgElement = poster.getElementsByTagName("img")[0]; // Assuming there's at least one img
        return {
          name: poster.textContent.trim(), // Extract the text content and trim whitespace
          posterSrc: imgElement ? imgElement.getAttribute("srcset") : null, // Extract the src of the first img or null if not present
        };
      }, liOfMovie);
      allMoviesInWatchlist.push(movieDetails);
    }

    // pick a random movie from the list
    // const random = Math.floor(Math.random() * allMoviesInWatchlist.length);
    const random = 3;
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
  } catch (error) {
    console.log(
      `something went wrong when trying to get ${username}'s movies: ${error}`
    );

    if (browser != null) {
      console.log("closing browser");
      await browser.close();
    }
  }
}

client.login(process.env.LETTERBOTD_TOKEN);
