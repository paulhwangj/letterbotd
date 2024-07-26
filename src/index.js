require("dotenv").config();
const { Client, IntentsBitField, EmbedBuilder } = require("discord.js");
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
  console.log("starting up puppeteer browser");
  browser = await puppeteer.launch({ headless: true });
});

client.on("interactionCreate", async (interaction) => {
  try {
    // If it's not a slash command interaction, bot does nothing
    if (!interaction.isChatInputCommand) return;

    // if browser is not set, set it
    if (!browser) browser = await puppeteer.launch({ headless: true });

    console.log(`responding to interaction: ${interaction.commandName}`);
    if (interaction.commandName == "cmfm") {
      // needed if bot takes > 3 seconds to acknowledge to discord that bot received interaction
      await interaction.deferReply();
      var letterboxdUsername = interaction.options.get(
        "letterboxd-username"
      ).value;

      let chosenMovie = await getWatchListMovies(letterboxdUsername);
      console.log(`randomly chosen movie is:`);
      console.log(chosenMovie);

      // noticed that url could be malformed, had to remove the '2x' that appears at the end
      // ex: https://a.ltrbxd.com/resized/sm/upload/dr/hr/pz/ez/ehLb2SQ3djlA1FrQKbP2WO3VH09-0-250-0-375-crop.jpg?v=6489920a92 2x
      let fixedPosterSrcString = chosenMovie.posterSrc.substring(
        0,
        chosenMovie.posterSrc.length - 3
      );
      console.log(`fixedPosterSrcString: ${fixedPosterSrcString}`);   // TODO: Delete
      chosenMovie.posterSrc = fixedPosterSrcString;
      // begin creating the embed
      const embed = new EmbedBuilder()
        .setTitle(chosenMovie.name)
        .setImage(chosenMovie.posterSrc);

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    console.error(`Error handling interaction: ${error.message}`);
    interaction.reply(`${error.message}`);
  }
});

async function getWatchListMovies(username) {
  try {
    const urlPrefix = "https://letterboxd.com/";
    let allMoviesInWatchlist = [];
    console.log(`getting movies from ${username}'s watchlist`);

    // open a new page in the browser
    const page = await browser.newPage();

    // Navigate the page to a URL.
    let route = `${urlPrefix}${username}/watchlist/`;
    await page.goto(route, {
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

    let areMorePages = false;
    let nextUrl = null;

    do {
      // determines if there will be more pages to traverse
      let values = await determineAreMorePages(page, areMorePages, nextUrl);
      areMorePages = values.areMorePages;
      nextUrl = values.nextUrl;

      // Scroll to bottom of page
      await autoScroll(page);

      // Get all the elements with the class "poster-container"
      let movies = await page.$$(".poster-container");

      // movies will at most have 28 films in it
      for (let liOfMovie of movies) {
        let movieDetails = await page.evaluate((el) => {
          // Find the child elements with class "poster" within the current element
          let poster = el.getElementsByClassName("film-poster")[0];

          // create custom object
          let imgElement = poster.getElementsByTagName("img")[0]; // Assuming there's at least one img
          return {
            name: poster.textContent.trim(), // Extract the text content and trim whitespace
            posterSrc: imgElement ? imgElement.getAttribute("srcset") : null, // Extract the src of the first img or null if not present
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

    console.log(`random int chosen: ${random}`);
    console.log(`total movies gathered: ${allMoviesInWatchlist.length}`);
    console.log("succesfully acquired a movie");
    return chosenMovie;
  } catch (error) {
    throw new Error(error);
  }
}

async function determineAreMorePages(page, areMorePages, nextUrl) {
  let values = { areMorePages: false, nextUrl: null };
  let paginationPagesDiv = await page.$(".paginate-pages");
  if (paginationPagesDiv != null) {
    values = await page.evaluate((el) => {
      // this should really only be one li and should always exist if a pagination exists
      let currentPageLi = el.getElementsByClassName("paginate-current")[0];
      if (currentPageLi) {
        let nextPageLi = currentPageLi.nextElementSibling;
        if (nextPageLi && nextPageLi.querySelector("a")) {
          return {
            areMorePages: true,
            nextUrl: nextPageLi.querySelector("a").href,
          };
        } else {
          return {
            areMorePages: false,
            nextUrl: null,
          };
        }
      }
    }, paginationPagesDiv);
  }
  return values;
}

// scrolls to the bottom of the page to ensure that everything is loaded
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

client.login(process.env.LETTERBOTD_TOKEN);
