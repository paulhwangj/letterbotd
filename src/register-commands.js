// Runs to actually register what commands the bot will have
require("dotenv").config();
const { REST, Routes, ApplicationCommandOptionType } = require("discord.js");

const commands = [
  // EXAMPLE: command with options
  {
    name: "add",
    description: "adds two numbers",
    options: [
      {
        name: "first-number",
        description: "the first number",
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
      {
        name: "second-number",
        description: "the secopnd number",
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
    ],
  },
  // {
  //   name: "fav-movies",
  //   description: "gets your favorite movies",
  //   options: [
  //     {
  //       name: "",
  //     },
  //   ],
  // },
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
