const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const dotenv = require('dotenv');
const { deployCommands } = require('./deploy-commands.js');

dotenv.config()

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Loading Commands
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Main async function to initialize the bot
(async () => {
    try {
        // Deploy slash commands first
        console.log('Deploying commands...');
        await deployCommands();
        console.log('Command deployment complete');

        // Then load commands for the bot to use
        for (const folder of commandFolders) {
            // Skip the tooling directory as it contains utility modules, not commands
            if (folder === 'tooling') continue;

            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);

                // Set a new item in the Collection with the key as the command name and the value as the exported module
                if ('data' in command && 'execute' in command) {
                    try {
                        // Handle both async functions and regular SlashCommandBuilder objects
                        if (typeof command.data === 'function') {
                            const commandData = await command.data();
                            command.resolvedData = commandData;
                            client.commands.set(commandData.name, command);
                        } else {
                            client.commands.set(command.data.name, command);
                        }
                    } catch (error) {
                        console.error(`Error loading command from ${filePath}:`, error);
                    }
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }

        // Client Login
        client.on(Events.ClientReady, readyClient => {
            console.log(`Logged in as ${readyClient.user.tag}!`);
        });

        client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) return;

            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error({
                    message: 'No command matching ' + interaction.commandName + ' was found.',
                    commandName: interaction.commandName,
                    options: interaction.options.data
                });
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
                }
            }
        });

        // Login to Discord
        client.login(process.env.TOKEN);
    } catch (error) {
        console.error('Failed to initialize bot:', error);
    }
})();
