const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guide')
        .setDescription('Gets the link to a guide.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('savage')
                .setDescription('Savage Raid Guides')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Enter the 3-letter abbreviated name, eg: M4S')
                        .setRequired(true)
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('extreme')
                .setDescription('Extreme Trial Guides')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Enter the 3-letter abbreviated name, eg: EX1')
                        .setRequired(true)
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('criterion')
                .setDescription('Criterion Guides')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Enter the 3-letter abbreviated name, eg: AAI')
                        .setRequired(true)
                        ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('chaotic')
                .setDescription('Chaotic Alliance Raid Guides')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Enter the 3-letter abbreviated name, eg: COD')
                        .setRequired(true)
                        )),
    async execute(interaction) {
        let string = interaction.options.getString('name').toLowerCase();
        if (string.length !== 3) {
            await interaction.reply(`Please enter a valid 3-letter name!`);
            return;
        }
        if (interaction.options.getSubcommand() === 'savage') {
            await interaction.reply(`https://materiaraiding.com/savage/${string}`);

        } else if (interaction.options.getSubcommand() === 'extreme') {
            await interaction.reply(`https://materiaraiding.com/extreme/${string}`);

        } else if (interaction.options.getSubcommand() === 'criterion') {
            await interaction.reply(`https://materiaraiding.com/criterion/${string}`);

        } else if (interaction.options.getSubcommand() === 'chaotic') {
            await interaction.reply(`https://materiaraiding.com/chaotic/${string}`);
        }
    },
};