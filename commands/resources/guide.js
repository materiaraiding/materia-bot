const { SlashCommandBuilder } = require('discord.js');
const { fetchSitemapXML } = require('../../tooling/fetchSitemap.js');

// Define categories and their corresponding names
const categories = {
    savage: 'Savage Raid Guides',
    ultimate: 'Ultimate Raid Guides',
    extreme: 'Extreme Trial Guides',
    criterion: 'Criterion Guides',
    chaotic: 'Chaotic Alliance Raid Guides',
    fieldops: 'Field Operations Guides'
}

// Initialize as null, will be populated when needed
let xmlData = null;

// Function to initialize the XML data if it hasn't been loaded yet
async function ensureXmlDataLoaded() {
    if (!xmlData) {
        xmlData = await fetchSitemapXML();
    }
    return xmlData;
}

// function to fetch sitemap and split it into categories based on the URL structure: https://materiaraiding.com/<category>/
async function fetchGuides(requestedCategory) {
    try {
        // Ensure the XML data is loaded
        const data = await ensureXmlDataLoaded();
        if (!data) {
            return null;
        }

        // Regular expression to extract category and pagename from URLs
        const urlPattern = /https:\/\/materiaraiding\.com\/([^\/]+)\/([^\/]+)/;

        // Parse XML data
        const urlElements = data.match(/<url>([\s\S]*?)<\/url>/g) || [];

        // Array to store guides for the requested category
        const guides = [];

        urlElements.forEach(urlElement => {
            const locMatch = urlElement.match(/<loc>(.*?)<\/loc>/);
            if (locMatch) {
                const url = locMatch[1];
                const match = url.match(urlPattern);

                if (match) {
                    const category = match[1];
                    const pagename = match[2];

                    // Only process the requested category
                    if (category === requestedCategory) {
                        guides.push({
                            category,
                            pagename,
                            url
                        });
                    }
                }
            }
        });

        return guides;
    } catch (error) {
        console.error({
            message: 'Error processing sitemap data',
            error: error.message,
            stack: error.stack,
            category: requestedCategory,
            timestamp: new Date().toISOString()
        });
        return null;
    }
}

// Function to build choices for the select menu based on the category
async function buildChoices(category) {
    return await fetchGuides(category).then(guides => {
        if (!guides || guides.length === 0) {
            return [{ name: `No ${categories[category]} available`, value: 'none' }];
        }

        return guides.map(guide => ({
            name: guide.pagename.toUpperCase(),
            value: guide.pagename.toLowerCase()
        }));
    });
}


module.exports = {
    data: async () => {
        // Create a map to store choices for all categories
        const categoryChoicesMap = new Map();

        // Fetch choices for each category and store in the map
        await Promise.all(
            Object.keys(categories).map(async (category) => {
                categoryChoicesMap.set(category, await buildChoices(category));
            })
        );

        // Create the SlashCommandBuilder instance
        const builder = new SlashCommandBuilder()
            .setName('guide')
            .setDescription('Gets the link to a guide.');

        // Add subcommands for each category
        for (const [category, categoryName] of Object.entries(categories)) {
            builder.addSubcommand(subcommand =>
                subcommand
                    .setName(category)
                    .setDescription(`${categoryName}`)
                    .addStringOption(option =>
                        option.setName('fight')
                            .setDescription('Choose a fight from the list')
                            .setRequired(true)
                            .addChoices(...categoryChoicesMap.get(category))
                    )
            );
        }
        return builder;
    },
    async execute(interaction) {
        let subcommand = interaction.options.getSubcommand();
        let string = interaction.options.getString('fight').toLowerCase();

        if (string.length > 4 && string !== 'none') {
            await interaction.reply(`Please enter a valid fight name!`);
            return;
        }

        if (string === 'none') {
            await interaction.reply(`Sorry, there are currently no guides available for ${subcommand}.`);
            return;
        }

        let url = `https://materiaraiding.com/${subcommand}/${string}`;

        try {
            const response = await fetch(url);
            if (response.status === 200) {
                await interaction.reply(url);
            } else {
                await interaction.reply(`Sorry, there currently is no guide for ${string.toUpperCase()} available.`);
            }
        } catch (error) {
            console.error({
                message: `Error fetching guide for ${string.toUpperCase()}`,
                error: error.message,
                stack: error.stack,
                url: url,
                category: subcommand,
                fightName: string,
                userId: interaction.user.id,
                guildId: interaction.guildId,
                timestamp: new Date().toISOString()
            });
            await interaction.reply(`There was an error fetching the guide for ${string.toUpperCase()}. Tell a mod!`);
        }
    },
};