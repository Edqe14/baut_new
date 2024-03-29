import { GuildMember, TextBasedChannel, Colors, EmbedBuilder } from "discord.js";

import Logger from "@classes/Logger";
import DiscordClient from "@structures/DiscordClient";
import Event from "@structures/Event";

export default class GuildMemberAddEvent extends Event {
    constructor(client: DiscordClient) {
        super(client, "guildMemberAdd", "Members");
    }

    async run(member: GuildMember) {
        const embed = {
            author: { name: "Members" },
            color: Colors.DarkPurple,
            title: "Member Joined",
            fields: [
                {
                    name: "Member",
                    value: member.user.toString(),
                    inline: true,
                },
            ],
            timestamp: new Date(),
        };
        Logger.logEvent(this.client, member.guild, "Members", new EmbedBuilder(embed));

        try {
            await member.roles.add(process.env.BUILDER_ROLE);
        } catch (error) {
            Logger.log("ERROR", error.stack);
        }
    }
}
