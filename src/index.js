const { Client, IntentsBitField } = require("discord.js");

// added to read the .env file
const dotenv = require("dotenv");
dotenv.config();

// Client = our bot, this is what we initialize
const client = new Client({
  intents: [
    // Intents = set of permissions that our bot can use in order to get access to a set of events
    // Guild = a server
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.login(process.env.LETTERBOTD_TOKEN);
