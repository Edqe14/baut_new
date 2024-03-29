import { ChatInputCommandInteraction, Colors, PermissionsBitField } from "discord.js";

import { SlashCommandBuilder } from "@discordjs/builders";

import Command from "@structures/Command";
import DiscordClient from "@structures/DiscordClient";

export default class ThreadChannelsCommand extends Command {
    constructor(client: DiscordClient) {
        super(
            client,
            {
                group: "Admin",
                require: {
                    permissions: [PermissionsBitField.Flags.ManageGuild],
                },
                ephemeral: true,
            },
            new SlashCommandBuilder()
                .setName("thread_channels")
                .setDescription("Alter thread channels")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("add")
                        .setDescription("Add a thread channel")
                        .addChannelOption(option => option.setName("channel").setDescription("The channel to add").setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Remove a thread channel")
                        .addChannelOption(option => option.setName("channel").setDescription("The channel to remove").setRequired(true))
                )
                .addSubcommand(subcommand => subcommand.setName("list").setDescription("List all thread channels"))
        );
    }

    private async addThreadChannel(command: ChatInputCommandInteraction) {
        await this.client.db.threadchannels.create({
            data: {
                channel_id: command.options.getChannel("channel")!.id,
            },
        });
        return command.editReply({
            embeds: [
                {
                    color: Colors.Green,
                    title: "✅ Success",
                    description: `Added thread channel ${command.options.getChannel("channel")!.toString()}`,
                },
            ],
        });
    }

    private async removeThreadChannel(command: ChatInputCommandInteraction) {
        await this.client.db.threadchannels.deleteMany({
            where: {
                channel_id: command.options.getChannel("channel")!.id,
            },
        });
        return command.editReply({
            embeds: [
                {
                    color: Colors.Green,
                    title: "✅ Success",
                    description: `Removed thread channel ${command.options.getChannel("channel")!.toString()}`,
                },
            ],
        });
    }

    private async listThreadChannels(command: ChatInputCommandInteraction) {
        const threadChannels = await this.client.db.threadchannels.findMany({
            select: {
                channel_id: true,
            },
        });
        if (!threadChannels)
            return command.editReply({
                embeds: [
                    {
                        color: Colors.Red,
                        title: "❌ Error",
                        description: "Failed to get thread channels",
                    },
                ],
            });
        const channels = threadChannels.map(threadChannel => this.client.channels.cache.get(threadChannel.channel_id));
        return command.editReply({
            embeds: [
                {
                    color: Colors.Green,
                    title: "📁 Thread Channels",
                    description: channels.length > 0 ? channels.map(channel => channel?.toString()).join("\n") : "No thread channels",
                },
            ],
        });
    }

    async run(command: ChatInputCommandInteraction) {
        switch (command.options.getSubcommand()) {
            case "add":
                await this.addThreadChannel(command);
                break;
            case "remove":
                await this.removeThreadChannel(command);
                break;
            case "list":
                await this.listThreadChannels(command);
                break;
        }
    }
}
