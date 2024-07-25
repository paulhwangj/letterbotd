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

      let attributeValue = await page.evaluate((el) => {
        // Find the child elements with class "poster" within the current element
        let posterElements = el.getElementsByClassName("poster");
        // Convert HTMLCollection to an array and return the length or any other relevant information
        return Array.from(posterElements).map((poster) => poster.textContent);
      }, liOfMovie);
      console.log(attributeValue);    // TODO: Delete
    }

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

// TODO: remove?
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

// TODO: remove?
// async function scrollToBottom(page) {
//   const distance = 100; // should be less than or equal to window.innerHeight
//   const delay = 100;
//   while (
//     await page.evaluate(
//       () =>
//         document.scrollingElement.scrollTop + window.innerHeight <
//         document.scrollingElement.scrollHeight
//     )
//   ) {
//     await page.evaluate((y) => {
//       document.scrollingElement.scrollBy(0, y);
//     }, distance);
//     await page.waitFor(delay);
//   }
// }

client.login(process.env.LETTERBOTD_TOKEN);
