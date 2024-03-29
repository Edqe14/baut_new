import { ChatInputCommandInteraction, Colors, PermissionsBitField } from "discord.js";

import { SlashCommandBuilder } from "@discordjs/builders";

import Logger from "@classes/Logger";
import Command from "@structures/Command";
import DiscordClient from "@structures/DiscordClient";

export default class BanCommand extends Command {
    constructor(client: DiscordClient) {
        super(
            client,
            {
                group: "Moderation",
                require: {
                    permissions: [PermissionsBitField.Flags.BanMembers],
                },
            },
            new SlashCommandBuilder()
                .setName("bans")
                .setDescription("Manage server bans.")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("ban")
                        .setDescription("Bans a member")
                        .addUserOption(option => option.setName("user").setDescription("The user to ban").setRequired(true))
                        .addStringOption(option => option.setName("reason").setDescription("The reason for the ban").setRequired(false))
                        .addIntegerOption(option => option.setName("days").setDescription("The amount of days to delete messages for").setRequired(false))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("unban")
                        .setDescription("Unbans a member")
                        .addStringOption(option => option.setName("user_id").setDescription("The id of the user to unban").setRequired(true))
                )
        );
    }

    private async ban(command: ChatInputCommandInteraction) {
        const user = command.options.getUser("user");
        const reason = command.options.getString("reason");
        const days = command.options.getInteger("days");

        const member = await command.guild.members.fetch(user);

        await member.ban({ reason, deleteMessageDays: days });

        await command.editReply({
            embeds: [
                {
                    color: Colors.Green,
                    description: `${command.user.toString()}, ${member.toString()} has been banned.`,
                },
            ],
        });
    }

    private async unban(command: ChatInputCommandInteraction) {
        const user = command.options.getString("user_id");

        const member = await command.guild.members.unban(user);

        await command.editReply({
            embeds: [
                {
                    color: Colors.Green,
                    description: `${command.user.toString()}, ${member?.toString() ?? "N/A"} has been unbanned.`,
                },
            ],
        });
    }

    async run(command: ChatInputCommandInteraction) {
        const subcommand = command.options.getSubcommand();
        switch (subcommand) {
            case "ban":
                await this.ban(command);
                break;
            case "unban":
                await this.unban(command);
                break;
        }
    }
}
