const { SlashCommandBuilder } = require('discord.js');
const yaml = require('yaml');

// URL to fetch macros from GitHub
const MACRO_URL = 'https://raw.githubusercontent.com/materiaraiding/materiaraiding/refs/heads/main/macromate.yaml';

// Initialize as null, will be populated when needed
let macroData = null;

// Function to extract the main category from group field
function extractMainCategory(group) {
    // Split at the forward slash and take the first part
    return group.split('/')[0];
}

// Function to fetch and parse the YAML data
async function fetchMacroData() {
    if (macroData !== null) {
        return macroData;
    }

    try {
        const response = await fetch(MACRO_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch macro data: ${response.status} ${response.statusText}`);
        }

        const yamlText = await response.text();
        macroData = yaml.parse(yamlText);
        return macroData;
    } catch (error) {
        console.error({
            message: 'Error fetching macro data',
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        return null;
    }
}

// Function to get all macros organized by category
async function getMacrosByCategory() {
    const data = await fetchMacroData();
    if (!data || !data.macros || !Array.isArray(data.macros)) {
        return null;
    }

    // Create a map of categories to macros
    const categoriesMap = new Map();

    data.macros.forEach(macro => {
        if (!macro.group) return;

        const mainCategory = extractMainCategory(macro.group);
        
        if (!categoriesMap.has(mainCategory)) {
            categoriesMap.set(mainCategory, []);
        }
        
        categoriesMap.get(mainCategory).push(macro);
    });

    return categoriesMap;
}

// Function to get macro choices for a specific category
function getMacroChoices(macros) {
    if (!macros || macros.length === 0) {
        return [{ name: 'No macros available', value: 'none' }];
    }

    return macros.map(macro => ({
        name: macro.name,
        value: macro.name
    }));
}

// Function to find a specific macro by name and category
function findMacro(macros, name) {
    return macros.find(macro => macro.name === name);
}

// Function to extract code blocks from Markdown
async function extractCodeBlocksFromMarkdown(url) {
    try {
        // Convert relative URLs to absolute GitHub URLs if needed
        if (url.startsWith('docs/')) {
            url = `https://raw.githubusercontent.com/materiaraiding/materiaraiding/main/${url}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch markdown: ${response.status}`);
        }

        const mdContent = await response.text();
        
        // Regular expression to find code blocks (both ```codeblock``` and ```language\ncodeblock```)
        const codeBlockRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
        
        const codeBlocks = [];
        let match;
        
        while ((match = codeBlockRegex.exec(mdContent)) !== null) {
            codeBlocks.push(match[1].trim());
        }
        
        return codeBlocks;
    } catch (error) {
        console.error({
            message: 'Error extracting code blocks from markdown',
            error: error.message,
            url,
            timestamp: new Date().toISOString()
        });
        return null;
    }
}

// Function to fetch raw macro content
async function fetchRawMacro(url) {
    try {
        // Convert relative URLs to absolute GitHub URLs if needed
        if (url.startsWith('docs/')) {
            url = `https://raw.githubusercontent.com/materiaraiding/materiaraiding/main/${url}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch raw macro: ${response.status}`);
        }
        
        return await response.text();
    } catch (error) {
        console.error({
            message: 'Error fetching raw macro',
            error: error.message,
            url,
            timestamp: new Date().toISOString()
        });
        return null;
    }
}

// Function to format a macro for Discord output
async function formatMacroContent(macro) {
    let content = `**${macro.name} Macro**`;
    let macroText = '';
    
    try {
        // Case 1: Raw URL - direct content
        if (macro.rawUrl) {
            macroText = await fetchRawMacro(macro.rawUrl);
        } 
        // Case 2: Markdown URL - need to extract code blocks
        else if (macro.markdownUrl) {
            const codeBlocks = await extractCodeBlocksFromMarkdown(macro.markdownUrl);
            
            if (codeBlocks && codeBlocks.length > 0) {
                // Get the specified code block or default to the first one
                const index = macro.markdownMacroCodeBlockIndex !== undefined ? macro.markdownMacroCodeBlockIndex : 0;
                
                if (codeBlocks.length > index) {
                    macroText = codeBlocks[index];
                } else {
                    throw new Error(`Code block index ${index} out of range (only ${codeBlocks.length} blocks found)`);
                }
            } else {
                throw new Error('No code blocks found in markdown');
            }
        }
        
        if (macroText) {
            content += '\n```\n' + macroText + '\n```\n';
        } else {
            content += '\nUnable to fetch macro content.\n';
        }
        
        if (macro.notes) {
            content += `\n${macro.notes}\n`;
        }
        
        return content;
    } catch (error) {
        console.error({
            message: 'Error formatting macro',
            error: error.message,
            macro: macro.name,
            timestamp: new Date().toISOString()
        });
        
        return `**${macro.name}**\n\nError retrieving macro content. Please try again later.\n\nReference URL: ${macro.markdownUrl || macro.rawUrl}`;
    }
}

module.exports = {
    data: async () => {
        // Get macros by category
        const categoriesMap = await getMacrosByCategory();
        
        if (!categoriesMap) {
            // Return a basic command if we couldn't fetch the data
            return new SlashCommandBuilder()
                .setName('macro')
                .setDescription('Unable to load macros. Try again later.');
        }

        // Create the SlashCommandBuilder instance
        const builder = new SlashCommandBuilder()
            .setName('macro')
            .setDescription('Gets a macro for a specific fight or mechanic');

        // Add subcommands for each category
        for (const [category, macros] of categoriesMap.entries()) {
            builder.addSubcommand(subcommand =>
                subcommand
                    .setName(category.toLowerCase())
                    .setDescription(`${category} Macros`)
                    .addStringOption(option =>
                        option.setName('name')
                            .setDescription('Choose a macro from the list')
                            .setRequired(true)
                            .addChoices(...getMacroChoices(macros))
                    )
            );
        }
        
        return builder;
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const macroName = interaction.options.getString('name');

        // If the user selected 'none', inform them
        if (macroName === 'none') {
            await interaction.reply(`Sorry, there are currently no macros available for ${subcommand}.`);
            return;
        }

        try {
            // Fetch all macros
            const categoriesMap = await getMacrosByCategory();
            
            if (!categoriesMap) {
                await interaction.reply('Sorry, I was unable to fetch the macro data. Please try again later.');
                return;
            }

            // Get macros for the requested category
            const macros = categoriesMap.get(subcommand.charAt(0).toUpperCase() + subcommand.slice(1));
            
            if (!macros || macros.length === 0) {
                await interaction.reply(`Sorry, there are currently no macros available for ${subcommand}.`);
                return;
            }

            // Find the requested macro
            const macro = findMacro(macros, macroName);
            
            if (!macro) {
                await interaction.reply(`Sorry, I couldn't find the macro "${macroName}" in the ${subcommand} category.`);
                return;
            }            // Format and send the macro
            await interaction.deferReply(); // Defer the reply since fetching macro content might take time
            const macroContent = await formatMacroContent(macro);
            await interaction.editReply(macroContent);
              } catch (error) {
            console.error({
                message: `Error fetching macro`,
                error: error.message,
                stack: error.stack,
                category: subcommand,
                macroName: macroName,
                userId: interaction.user.id,
                guildId: interaction.guildId,
                timestamp: new Date().toISOString()
            });
            
            if (interaction.deferred) {
                await interaction.editReply(`There was an error fetching the macro. Please try again later or tell a mod!`);
            } else {
                await interaction.reply(`There was an error fetching the macro. Please try again later or tell a mod!`);
            }
        }
    },
};