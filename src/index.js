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
    let nextUrl;

    do {
      // determines if there will be more pages to traverse
      // areMorePages = true means there are
      ({ areMorePages, nextUrl } = await determineAreMorePages(
        page,
        areMorePages,
        nextUrl
      ));
      console.log(`areMorePages: ${areMorePages}`);
      console.log(`nextUrl: ${nextUrl}`);

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
    console.log(`your chosen movie is:`); // TODO: Delete
    console.log(chosenMovie); // TODO: Delete
    console.log("succesfully acquired a movie");
    return chosenMovie;
  } catch (error) {
    throw new Error(error);
  }
}

async function determineAreMorePages(page, areMorePages, nextUrl) {
  let paginationPagesDiv = await page.$(".paginate-pages");
  console.log(`paginationPagesDiv: ${paginationPagesDiv}`); // TODO: delete
  if (paginationPagesDiv != null) {
    console.log("there are more pages to traverse!");
    areMorePages = await page.evaluate((el) => {
      let ul = el.querySelector("ul");
      console.log(`ul: ${ul}`);

      // this should really only be one li and should always exist if a pagination exists
      let lis = ul.getElementsByClassName("paginate-current");
      let currentPageLi = lis[0];
      console.log(`currentPageLi: ${currentPageLi}`);
      if (currentPageLi) {
        let nextPageLi = currentPageLi.nextElementSibling;
        if (nextPageLi && nextPageLi.querySelector("a")) {
          nextUrl = nextPageLi.querySelector("a").getAttribute("href");
          return true;
        } else {
          // there is no sibling to the li
          return false;
        }
      }
      throw new Error(
        "There was no li with the class 'paginate-current' when there should have been"
      );
    }, paginationPagesDiv);
  } else {
    areMorePages = false;
    nextUrl = null;
  }
  return { areMorePages, nextUrl };
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
