const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mr')
        .setDescription('Materia Raiding Discord Link'),
    async execute(interaction) {
        await interaction.reply('https://discord.gg/EySn5dRj65');
    },
};