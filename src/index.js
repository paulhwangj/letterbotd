require("dotenv").config();
const { Client, IntentsBitField } = require("discord.js");

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

client.on("interactionCreate", (interaction) => {
  // If it's not a slash command interaction, bot does nothing
  if (!interaction.isChatInputCommand) return;

  if (interaction.commandName == "add") {
    const num1 = interaction.options.get("first-number").value;
    const num2 = interaction.options.get("first-number").value;

    interaction.reply(`The sum is ${num1 + num2}`);
  }
});

client.login(process.env.LETTERBOTD_TOKEN);
