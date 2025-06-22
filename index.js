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
        console.log({ message: 'Deploying commands...', timestamp: new Date().toISOString() });
        await deployCommands();
        console.log({ message: 'Command deployment complete', timestamp: new Date().toISOString() });

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
                        console.error({
                            message: `Error loading command from ${filePath}`,
                            error: error.message,
                            stack: error.stack,
                            filePath,
                            timestamp: new Date().toISOString()
                        });
                    }
                } else {
                    console.log({
                        message: `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
                        filePath,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        // Client Login
        client.on(Events.ClientReady, readyClient => {
            console.log({
                message: `Logged in as ${readyClient.user.tag}!`,
                username: readyClient.user.username,
                id: readyClient.user.id,
                timestamp: new Date().toISOString()
            });
        });

        client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) return;

            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error({
                    message: 'No command matching ' + interaction.commandName + ' was found.',
                    commandName: interaction.commandName,
                    options: interaction.options.data,
                    guildId: interaction.guildId,
                    userId: interaction.user.id,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            try {
                await command.execute(interaction);
                // Log successful command execution
                console.log({
                    message: 'Command executed successfully',
                    commandName: interaction.commandName,
                    options: interaction.options.data,
                    guildId: interaction.guildId,
                    userId: interaction.user.id,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error({
                    message: 'Error executing command',
                    commandName: interaction.commandName,
                    error: error.message,
                    stack: error.stack,
                    guildId: interaction.guildId,
                    userId: interaction.user.id,
                    timestamp: new Date().toISOString()
                });
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
        console.error({
            message: 'Failed to initialize bot',
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
})();
