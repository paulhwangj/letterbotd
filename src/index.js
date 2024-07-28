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

// constants
const botIconUrl =
  "https://opengameart.org/sites/default/files/robot-preview.png";

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
      console.log(`fixedPosterSrcString: ${fixedPosterSrcString}`); // TODO: Delete
      chosenMovie.posterSrc = fixedPosterSrcString;
      // begin creating the embed
      const embed = new EmbedBuilder()
        .setTitle(chosenMovie.name)
        .setURL(chosenMovie.url)
        .setAuthor({
          name: `${interaction.user.tag}'s random movie!`,
          iconURL: botIconUrl,
          url: chosenMovie.url,
        })
        .setDescription(chosenMovie.synopsis)
        .setImage(chosenMovie.posterSrc)
        .setTimestamp()
        .setFooter({
          text: "...now watch it!",
          iconURL: botIconUrl,
        });

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    console.error(`Error handling interaction: ${error.message}`);
    await interaction.editReply(`${error.message}`);
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
        `Nothing pulled up at ${route}... Make sure you typed in your username correctly!`
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
          let imgElement = poster.getElementsByTagName("img")[0]; // Assuming there's at least one img
          let a = poster.getElementsByTagName("a")[0]; // Assuming there's at least one a under this div

          // return custom "movie" object
          return {
            name: poster.textContent.trim(),
            posterSrc: imgElement
              ? imgElement.getAttribute("srcset")
              : `https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/6fd01a38-ce7a-4b53-9198-a172af440836/df4vmox-6977063a-8759-4022-9df9-6552496416fd.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzZmZDAxYTM4LWNlN2EtNGI1My05MTk4LWExNzJhZjQ0MDgzNlwvZGY0dm1veC02OTc3MDYzYS04NzU5LTQwMjItOWRmOS02NTUyNDk2NDE2ZmQucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.QdYou4QSNGeThGcHjEH_qVWUtHgJ4MeHhSPhdyQu0Cc`,
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

    // if there are no movies, throw an error
    console.log("checking to see if there are no movies in their watchlist..."); // TODO: Remove
    if (allMoviesInWatchlist.length == 0) {
      throw new Error(`There are no movies in your watchlist...`);
    }

    // pick a random movie from the list
    const chosenMovie = chooseRandomMovie(allMoviesInWatchlist);

    // navigate to the film's page on letterboxd and get info
    await page.goto(`${urlPrefix}${chosenMovie.urlToFilmPage}`, {
      waitUntil: "domcontentloaded",
    });
    await autoScroll(page);
    let values = {
      synopsis: null,
    };
    let parentDiv = await page.$(".review");
    console.log(`parentDiv: ${JSON.stringify(parentDiv, null, 4)}`); // TODO: Delete
    if (parentDiv != null) {
      values = await page.evaluate((el) => {
        let synopsis = el
          .getElementsByTagName("div")[0]
          .getElementsByTagName("p")[0].innerText;

        return {
          synopsis: synopsis,
        };
      }, parentDiv);
    }

    const movie = {
      name: chosenMovie.name,
      posterSrc: chosenMovie.posterSrc,
      url: `${urlPrefix}${chosenMovie.urlToFilmPage}`,
      synopsis: values.synopsis,
    };

    return movie;
  } catch (error) {
    throw error;
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

function chooseRandomMovie(allMoviesInWatchlist) {
  console.log("starting to choose a random movie...");
  const random = Math.floor(Math.random() * allMoviesInWatchlist.length);
  const chosenMovie =
    allMoviesInWatchlist[
      random
      // Math.floor(Math.random() * allMoviesInWatchlist.length)
    ];

  console.log(`random int chosen: ${random}`);
  console.log(`total movies gathered: ${allMoviesInWatchlist.length}`);
  return chosenMovie;
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
