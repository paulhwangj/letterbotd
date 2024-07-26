// Runs to actually register what commands the bot will have
require("dotenv").config();
const { REST, Routes, ApplicationCommandOptionType } = require("discord.js");

const commands = [
  {
    name: "choose-movie-for-me",
    description: "chooses a random movie that's currently on your watchlist",
    options: [
      {
        name: "letterboxd-username",
        description: "your letterboxd username",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.LETTERBOTD_TOKEN);

(async () => {
  try {
    console.log("Registering slash commands");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      {
        body: commands,
      }
    );
  } catch (error) {
    console.log(`there was an error: ${error}`);
  }

  console.log("Slash commands are registered");
})();
