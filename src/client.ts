// Setting up moment-timezone
import Logger from "@classes/Logger";
import moment from "moment-timezone";
import { ActivityType, GatewayIntentBits, Colors } from "discord.js";

// Getting and validating .env file
import EnvLoader from "@classes/EnvLoader";

EnvLoader.load();

import DiscordClient from "@structures/DiscordClient";

moment.locale("en");
moment.tz.setDefault("America/New_York");
Logger.log("INFO", "Starting up in " + (process.env.npm_lifecycle_event == "start" ? "🛠️ production" : "💻 development") + "...");

const client = new DiscordClient(
    {
        presence: {
            activities: [{ type: ActivityType.Watching, name: "buildergroop.com" }],
            status: "online",
        },
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildBans,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildMessages,
        ],
    },
    {
        token: process.env.npm_lifecycle_event == "start" ? process.env["TOKEN"] : process.env["TEST_TOKEN"],
        owners: ["823984033179893840", "916505894953574490", "297504183282565130"],
    }
);

client.load();

export default client;
