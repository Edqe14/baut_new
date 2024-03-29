import { MessageOptions } from "child_process";
import {
    HexColorString,
    Interaction,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    MessageComponentInteraction,
    EmbedBuilder,
    SelectMenuBuilder,
    ModalBuilder,
    ModalSubmitInteraction,
    SelectMenuInteraction,
    ModalActionRowComponentBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonStyle,
    SlashCommandBuilder,
    ComponentType,
    ChatInputCommandInteraction,
    ChannelType,
    TextChannel,
    MessageActionRowComponentBuilder,
    PermissionsBitField,
    APIEmbed,
} from "discord.js";

import Logger from "@classes/Logger";
import { IEmbed } from "@utils/interfaces";

import Command from "@structures/Command";
import DiscordClient from "@structures/DiscordClient";

export default class EmbedsCommand extends Command {
    constructor(client: DiscordClient) {
        super(
            client,
            {
                group: "Admin",
                require: { permissions: [PermissionsBitField.Flags.Administrator] },
                ephemeral: true,
            },
            new SlashCommandBuilder()
                .setName("embeds")
                .setDescription("Manage embeds.")

                .addSubcommand(subcommand => subcommand.setName("create").setDescription("Creates an embed."))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("edit")
                        .setDescription("Edits an embed.")
                        .addIntegerOption(option => option.setName("id").setDescription("The ID of the embed to edit.").setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("delete")
                        .setDescription("Deletes an embed.")
                        .addIntegerOption(option => option.setName("id").setDescription("The ID of the embed to delete.").setRequired(true))
                )
                .addSubcommand(subcommand => subcommand.setName("list").setDescription("Lists all embeds."))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("send")
                        .setDescription("Sends an embed.")
                        .addStringOption(option => option.setName("id").setDescription("The ID of the embed to send.").setRequired(true))
                        .addChannelOption(option => option.setName("channel").setDescription("The channel to send the embed to."))
                )
        );
    }

    private async showModal(command: ChatInputCommandInteraction, prev?: IEmbed, id?: number) {
        const modal = new ModalBuilder()
            .setCustomId("embed-create")
            .setTitle(prev ? "Edit embed" : "Create embed")
            .addComponents(
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                    new TextInputBuilder()
                        .setLabel("Title")
                        .setStyle(TextInputStyle.Short)
                        .setCustomId("title")
                        .setMaxLength(256)
                        .setValue(prev?.title ?? "")
                ),
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                    new TextInputBuilder()
                        .setLabel("Description")
                        .setStyle(TextInputStyle.Paragraph)
                        .setCustomId("description")
                        .setValue(prev?.description ?? "")
                ),
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                    new TextInputBuilder()
                        .setLabel("Color (#Hex)")
                        .setStyle(TextInputStyle.Short)
                        .setCustomId("color")
                        .setMaxLength(7)
                        .setValue(prev?.color.toString() ?? "#000000")
                ),
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                    new TextInputBuilder()
                        .setLabel("URL")
                        .setStyle(TextInputStyle.Short)
                        .setCustomId("url")
                        .setMaxLength(200)
                        .setValue(prev?.url ?? "")
                ),
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                    new TextInputBuilder()
                        .setLabel("Image URL")
                        .setStyle(TextInputStyle.Short)
                        .setCustomId("image-url")
                        .setMaxLength(200)
                        .setValue(prev?.image ?? "")
                )
            );

        const button = new ButtonBuilder()
            .setCustomId("embed-create-button")
            .setLabel(`${prev ? "Edit" : "Create"} Embed`)
            .setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        // Send a button to show the modal
        const reply = (await command.editReply({
            content: `Click here to ${prev ? "edit" : "create"} an embed.`,
            components: [row],
        })) as Message;

        const modalOpenFilter = (i: MessageComponentInteraction) => i.customId === "embed-create-button" && i.user.id === command.user.id;

        // Wait for the button to be pressed
        await reply
            .awaitMessageComponent({ filter: modalOpenFilter, componentType: ComponentType.Button, time: 10000 })
            .then(async (interaction: MessageComponentInteraction) => {
                interaction.showModal(modal);
                const modalSubmitFilter = (i: ModalSubmitInteraction) => i.customId === "embed-create" && i.user.id === command.user.id;

                // Wait for the modal to be submitted
                await interaction
                    .awaitModalSubmit({ filter: modalSubmitFilter, time: 60000 })
                    .then(async (modalSubmit: ModalSubmitInteraction) => {
                        if (!modalSubmit.isFromMessage()) return;
                        // Create the embed object and upload it to db
                        const title = modalSubmit.fields.getTextInputValue("title");
                        const description = modalSubmit.fields.getTextInputValue("description");
                        const color = modalSubmit.fields.getTextInputValue("color");
                        const url = modalSubmit.fields.getTextInputValue("url");
                        const image = modalSubmit.fields.getTextInputValue("image-url");
                        const embed = {};

                        if (title) embed["title"] = title;
                        if (description) embed["description"] = description;
                        if (color) embed["color"] = color;
                        if (url) embed["url"] = url;
                        if (image) embed["image"] = image;

                        if (!title && !description && !color && !url && !image) {
                            return modalSubmit.reply({
                                content: "You must provide at least one field to create an embed.",
                                ephemeral: true,
                            });
                        } else if (!title && !description) {
                            return modalSubmit.reply({
                                content: "You must provide at least a title or description to create an embed.",
                                ephemeral: true,
                            });
                        }
                        if (prev) {
                            await this.client.db.embeds.update({
                                where: { id: id },
                                data: {
                                    content: JSON.stringify(embed),
                                },
                            });
                        } else {
                            const created = await this.client.db.embeds.create({ data: { content: JSON.stringify(embed) } });
                            id = created.id;
                        }

                        modalSubmit.update({
                            content: `Embed ${prev ? "edited" : "created"}! [Embed ID: ${id}]`,
                            embeds: [embed],
                            components: [],
                        });
                    })

                    .catch(e => {
                        Logger.log("ERROR", e);
                        command.editReply({
                            content: "You didn't create an embed in time.",
                        });
                    });
            })
            .catch(() => command.editReply({ content: "You took too long to create an embed.", components: [] }));
    }

    private async listEmbeds(command: ChatInputCommandInteraction) {
        const embeds = await this.client.db.embeds.findMany();
        if (embeds.length == 0 && this.client.registry.getEmbeds().size == 0) {
            command.editReply({
                content: "No embeds have been created! Create one with `/embeds create`.",
            });
            return;
        }
        const embedsList = embeds.map(embed => {
            const embedObject = JSON.parse(embed.content);
            return {
                id: embed.id,
                title: embedObject.title,
                description: embedObject.description,
                color: embedObject.color,
                url: embedObject.url,
                image: embedObject.image,
            } as IEmbed;
        });
        embedsList.push(
            ...this.client.registry.getEmbeds().map(msg => {
                if (msg.message.embeds && msg.message.embeds.length > 0) {
                    const embed = msg.message.embeds[0] as APIEmbed as EmbedBuilder;
                    return {
                        id: msg.id,
                        title: embed.data.title,
                        description: embed.data.description,
                        color: embed.data.color,
                        url: embed.data.url,
                        image: embed.data.image?.url,
                    } as IEmbed;
                } else {
                    return {
                        id: msg.id,
                        title: msg.name,
                        description: msg.message.content,
                        color: process.env.BUILDERGROOP_COLOR,
                    } as IEmbed;
                }
            })
        );
        // select menu to select embed
        const row = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
            new SelectMenuBuilder()
                .setCustomId("embed-select")
                .setPlaceholder("Select an embed")
                .addOptions(
                    embedsList.map(e => ({ label: `${e.id}: ${e.title}`, description: e.description?.slice(0, 99) ?? "No description", value: e.id ? e.id.toString() : e.title }))
                )
        );
        const reply = (await command.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Embeds")
                    .setDescription("Select an option to view info about an embed")
                    .setFooter({ text: `${embedsList.length} embeds found.` }),
            ],
            components: [row],
        })) as Message;
        const selectFilter = (i: MessageComponentInteraction) => i.customId === "embed-select" && i.user.id === command.user.id;
        const collector = reply.createMessageComponentCollector({ filter: selectFilter, componentType: ComponentType.SelectMenu, time: 60000 });
        collector.on("collect", async (interaction: SelectMenuInteraction) => {
            let embed = embedsList.find(e => e.id?.toString() === interaction.values[0]);
            if (!embed) {
                // search for embed in registry
                const hcEmbed = this.client.registry.getEmbeds().find(e => (e.message.embeds[0] as APIEmbed as EmbedBuilder).data.title === interaction.values[0]);
                const embedObj = hcEmbed.message.embeds[0] as APIEmbed as EmbedBuilder;
                embed = {
                    id: hcEmbed.id,
                    title: embedObj.data.title,
                    description: embedObj.data.description,
                    color: embedObj.data.color,
                    url: embedObj.data.url,
                    image: embedObj.data.image?.url,
                } as IEmbed;
            }
            const msgEmbed = new EmbedBuilder();
            if (embed.title) msgEmbed.setTitle(embed.title);
            if (embed.description) msgEmbed.setDescription(embed.description);
            if (embed.color) msgEmbed.setColor(embed.color as HexColorString);
            if (embed.url) msgEmbed.setURL(embed.url);
            if (embed.image) msgEmbed.setImage(embed.image);
            interaction.update({
                embeds: [msgEmbed.setFooter({ text: `Embed ID: ${embed.id} ${typeof embed.id == "string" ? " | This embed cannot be edited through Discord." : ""}` })],
                components: [row],
            });
        });
        collector.on("end", async (collected, reason) => {
            command.editReply({
                content: "Session expired.",
                components: [],
            });
        });
    }

    async run(command: ChatInputCommandInteraction) {
        switch (command.options.getSubcommand()) {
            case "create":
                this.showModal(command);
                break;
            case "edit":
                const editId = command.options.getInteger("id");
                const editEmbed = await this.client.db.embeds.findFirst({ where: { id: editId } });
                if (!editEmbed) {
                    command.editReply({ content: "Embed not found." });
                    return;
                }
                this.showModal(command, JSON.parse(editEmbed.content), editId);
                break;
            case "list":
                this.listEmbeds(command);
                break;
            case "delete":
                const deleteId = command.options.getInteger("id");
                const deleteEmbed = await this.client.db.embeds.findFirst({ where: { id: deleteId } });
                if (!deleteEmbed) {
                    command.editReply({ content: "Embed not found." });
                    return;
                }
                await this.client.db.embeds.delete({ where: { id: deleteId } });
                command.editReply({ content: "Embed deleted." });
                break;
            case "send":
                const sendId = command.options.getString("id");
                let sendEmbedMessage: MessageOptions;
                const sendChannel = command.options.getChannel("channel") ?? command.channel;
                if (sendChannel.type != ChannelType.GuildText && sendChannel.type != ChannelType.GuildAnnouncement) {
                    command.editReply({ content: "You can only send embeds to text channels." });
                    return;
                }

                if (sendId.startsWith("E")) {
                    // Hardcoded Embeds
                    const sendEmbed = this.client.registry.getEmbeds().find(e => e.id === sendId);
                    if (!sendEmbed) {
                        command.editReply({ content: "Embed not found." });
                        return;
                    }
                    (sendChannel as TextChannel).send({ ...sendEmbed.message, components: sendEmbed.components });
                    command.editReply({ content: "Embed sent." });
                } else {
                    // DB Embeds
                    const sendEmbed = await this.client.db.embeds.findFirst({ where: { id: parseInt(sendId) } });
                    if (!sendEmbed) {
                        command.editReply({ content: "Embed not found." });
                        return;
                    }
                    const sendEmbedObject = JSON.parse(sendEmbed.content);
                    const embed = new EmbedBuilder();
                    if (sendEmbedObject.title) embed.setTitle(sendEmbedObject.title);
                    if (sendEmbedObject.description) embed.setDescription(sendEmbedObject.description);
                    if (sendEmbedObject.color) embed.setColor(sendEmbedObject.color as HexColorString);
                    if (sendEmbedObject.url) embed.setURL(sendEmbedObject.url);
                    if (sendEmbedObject.image) embed.setImage(sendEmbedObject.image);

                    (sendChannel as TextChannel).send({ embeds: [embed] });
                    command.editReply({ content: "Embed sent." });
                }
                break;
        }
    }
}
