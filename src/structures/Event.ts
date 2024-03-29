import { ClientEvents, Colors } from "discord.js";

import DiscordClient from "@structures/DiscordClient";

export default abstract class Event {
    /**
     * Discord client.
     */
    readonly client: DiscordClient;

    /**
     * Name of the event.
     */
    readonly name: keyof ClientEvents;

    /**
     * Log Category of the event
     */
    readonly logCategory: string | false;

    constructor(client: DiscordClient, name: keyof ClientEvents, logCategory: string | false) {
        this.client = client;
        this.name = name;
        this.logCategory = logCategory;
    }

    /**
     * Runs the event.
     * @param params Event parameters from [discord.js.org](https://discord.js.org/#/docs/main/stable/class/Client)
     */
    abstract run(...params: any | undefined): Promise<any>;
}
