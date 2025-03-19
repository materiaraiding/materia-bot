const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('directory')
        .setDescription('Gets the link to the materia directory.'), 
    async execute(interaction) {
        await interaction.reply('https://materia.directory');
    },
};