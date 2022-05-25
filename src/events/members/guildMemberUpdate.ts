import { GuildMember, MessageEmbedOptions, TextBasedChannel } from 'discord.js';

import Logger from '@classes/Logger';
import DiscordClient from '@structures/DiscordClient';
import Event from '@structures/Event';

export default class GuildMemberUpdateEvent extends Event {
    constructor(client: DiscordClient) {
        super(client, 'guildMemberUpdate', 'Members');
    }

    async run(oldMember: GuildMember, newMember: GuildMember) {
        const log = await this.client.db.log.findFirst({
            where: {
                log_event: 'Members',
                enabled: true
            }
        });
        if (log) {
            const logChannel = newMember.guild.channels.cache.get(log.channel_id) as TextBasedChannel;
            if (logChannel) {
                const embed = {
                    title: 'Member Updated',
                    color: 'DARK_PURPLE',
                    fields: [
                        {
                            name: 'Member',
                            value: newMember.user.toString(),
                            inline: true
                        }
                    ]
                } as MessageEmbedOptions;
                if (oldMember.displayName !== newMember.displayName) {
                    embed.fields.push({
                        name: 'Name',
                        value: `${oldMember.displayName} -> ${newMember.displayName}`,
                        inline: true
                    });
                }
                if (oldMember.permissions !== newMember.permissions) {
                    // Determine whether permissions were added or removed
                    const addedPermissions = newMember.permissions.toArray().filter(permission => !oldMember.permissions.has(permission));
                    const removedPermissions = oldMember.permissions.toArray().filter(permission => !newMember.permissions.has(permission));
                    if (addedPermissions.length > 0) {
                        embed.fields.push({
                            name: 'Added Permissions',
                            value: addedPermissions.join(', '),
                            inline: true
                        });
                    }
                    if (removedPermissions.length > 0) {
                        embed.fields.push({
                            name: 'Removed Permissions',
                            value: removedPermissions.join(', '),
                            inline: true
                        });
                    }
                }
                if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
                    // Determine whether roles were added or removed
                    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
                    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
                    if (addedRoles.size > 0) {
                        embed.fields.push({
                            name: 'Added Roles',
                            value: [...addedRoles.values()].map(role => role.toString()).join(', '),
                            inline: true
                        });
                    }
                    if (removedRoles.size > 0) {
                        embed.fields.push({
                            name: 'Removed Roles',
                            value: [...removedRoles.values()].map(role => role.toString()).join(', '),
                            inline: true
                        });
                    }
                }
                if (embed.fields.length > 1) {
                    await logChannel.send({
                        embeds: [embed]
                    });
                }
            }
        }
    }
}
