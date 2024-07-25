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
client.on('ready', (c) => {
    console.log(`${c.user.username} is ready!`)
});

client.on('messageCreate', (message) => {
    console.log(message)
})

client.login(process.env.LETTERBOTD_TOKEN);
