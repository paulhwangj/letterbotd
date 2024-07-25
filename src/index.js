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
  try {
    console.log(`getting movies from ${username}'s watchlist`);

    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate the page to a URL.
    await page.goto(`https://letterboxd.com/${username}/watchlist/`, {
      waitUntil: "domcontentloaded",
    });

    // Get page data
    const movies = await page.evaluate(() => {
      // Fetch the first element with class "quote"
      const movie = document.querySelector(".poster-container");

      return { movie };
    });

    console.log(movies);

    await page.evaluate(() => {
      let movies = document.getElementsByClassName("poster-container");
      console.log(movies);
      for (i = 0; i < movies.length; i++) {
        console.log(movies[i]);
      }
    });

    // TODO: Go through all the pages that a user may have for their wishlist
    // await page.locator('.devsite-result-item-link').click();
  } catch (error) {
    console.log(
      `something went wrong when trying to get ${username}'s movies: ${error}`
    );
  }
}

client.login(process.env.LETTERBOTD_TOKEN);
