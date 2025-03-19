const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mur')
        .setDescription('Materia Ultimate Raiding Discord Link'),
    async execute(interaction) {
        await interaction.reply('https://discord.gg/mur');
    },
};