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
    console.log(`getting movies from ${username}'s watchlist`);

    // Launch the browser and open a new blank page
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate the page to a URL.
    await page.goto(`https://letterboxd.com/${username}/watchlist/`, {
      waitUntil: "domcontentloaded",
    });

    // checks to see that html is actually
    // console.log(await page.content());

    // Get all the elements with the class "poster-container"
    // let movies = await page.$(".poster-container");
    // let childDiv = await movies.$("div");
    // console.log(await childDiv.evaluateHandle(el => el.dataset.filmName));

    const dataValues = await page.$$eval(".poster-container", (divs) => {
      divs.map((div) => console.log(div.dataset.filmName));
      console.log(divs);
    });

    console.log(dataValues);

    // await page.evaluate(() => {

    //   for (i = 0; i < movies.length; i++) {

    //   }
    // });
    // const movies = await page.evaluate(() => {
    //   // Fetch the first element with class "quote"
    //   const movie = document.querySelector(".poster-container");

    //   return { movie };
    // });

    // TODO: Go through all the pages that a user may have for their wishlist
    // await page.locator('.devsite-result-item-link').click();
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
