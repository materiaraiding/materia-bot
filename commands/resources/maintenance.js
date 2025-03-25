const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const https = require('https');
const xml2js = require('xml2js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maintenance')
        .setDescription('Get the most recent maintenance information from the Lodestone.'),
    async execute(interaction) {
        const url = 'https://eu.finalfantasyxiv.com/lodestone/news/news.xml';
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', async () => {
                try {
                    const result = await xml2js.parseStringPromise(data);
                    console.log(result);
                    const items = result.feed.entry
                    const maintenancePost = items.find(item => item.title[0].includes('All Worlds Maintenance'));
                    
                    if (maintenancePost) {
                        const embed = new EmbedBuilder()
                            .setTitle(maintenancePost.title[0])
                            .setDescription(maintenancePost.content[0]._.replace(/<br>/g, ''))
                            .setColor(0x00AE86)
                            .setTimestamp(new Date(maintenancePost.updated[0]))
                            .setAuthor({ name: 'Lodestone', iconURL: 'https://ffxiv.gamerescape.com/w/images/4/48/Mob15_Icon.png', url: 'https://na.finalfantasyxiv.com/lodestone' })
                        await interaction.reply({ embeds: [embed] });
                    } else {
                        await interaction.reply('No recent maintenance information found.');
                    }
                } catch (error) {
                    console.error(error);
                    await interaction.reply('Failed to fetch maintenance information.');
                }
            });
        }).on('error', async (error) => {
            console.error(error);
            await interaction.reply('Failed to fetch maintenance information.');
        });
    },
};