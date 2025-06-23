const { SlashCommandBuilder } = require('discord.js');

const communityServers = [
    {
        name: 'Materia Raiding',
        url: 'https://discord.gg/EySn5dRj65'
    },
    {
        name: 'Materia Ultimate Raiding',
        url: 'https://discord.gg/ArZz3b8PZV'
    },
    {
        name: 'Materia Wolves Den (PvP)',
        url: 'https://discord.gg/vfTBvxx6fn'
    },
    {
        name: 'Overseas Casuals (Island Sanctuary)',
        url: 'https://discord.gg/overseascasuals'
    },
    {
        name: 'Faloop (Hunts)',
        url: 'https://discord.gg/faloop'
    },
    {
        name: 'The Balance (Jobs, Theorycrafting, BiS)',
        url: 'https://discord.gg/thebalanceffxiv'
    },
    {
        name: 'Content Achievers (Various Content)',
        url: 'https://discord.gg/FJFxr2U'
    },
    {
        name: 'Murder of Geese (Field Ops)',
        url: 'https://discord.gg/czkX3cTKuj'
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get an invite link to one of the community Discord servers.')
        .addStringOption(option =>
            option.setName('server')
                .setDescription('Choose a server to get the invite link')
                .setRequired(true)
                .addChoices(
                    ...communityServers.map(server => ({
                        name: server.name,
                        value: server.url
                    }))
                )
        ),
    async execute(interaction) {
        const serverUrl = interaction.options.getString('server');
        await interaction.reply(`Here is your invite link: ${serverUrl}`);
    },
};