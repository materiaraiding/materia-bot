const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const dotenv = require('dotenv');
const { deployCommands } = require('./deploy-commands.js');
const cron = require('node-cron');

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

        // Scheduled Tasks System
        const scheduledPath = path.join(__dirname, 'scheduled');
        if (fs.existsSync(scheduledPath) && process.env.DISABLE_SCHEDULED_TASKS !== 'true') {
            const scheduledFiles = fs.readdirSync(scheduledPath).filter(file => file.endsWith('.js'));
            for (const file of scheduledFiles) {
                const taskModule = require(path.join(scheduledPath, file));
                if (taskModule && taskModule.data && taskModule.data.cron && typeof taskModule.executeScheduledTask === 'function') {
                    // Always run scheduled task once on startup
                    (async () => {
                        try {
                            console.log({ message: `Running scheduled task on startup: ${taskModule.data.name}`, timestamp: new Date().toISOString() });
                            await taskModule.executeScheduledTask(client);
                            console.log({ message: `Scheduled task complete on startup: ${taskModule.data.name}`, timestamp: new Date().toISOString() });
                        } catch (err) {
                            console.error({ message: `Scheduled task error on startup: ${taskModule.data.name}`, error: err.message, stack: err.stack, timestamp: new Date().toISOString() });
                        }
                    })();
                    // Schedule for cron
                    cron.schedule(taskModule.data.cron, async () => {
                        try {
                            console.log({ message: `Running scheduled task: ${taskModule.data.name}`, timestamp: new Date().toISOString() });
                            await taskModule.executeScheduledTask(client);
                            console.log({ message: `Scheduled task complete: ${taskModule.data.name}`, timestamp: new Date().toISOString() });
                        } catch (err) {
                            console.error({ message: `Scheduled task error: ${taskModule.data.name}`, error: err.message, stack: err.stack, timestamp: new Date().toISOString() });
                        }
                    });
                    console.log({ message: `Scheduled task loaded: ${taskModule.data.name} (${taskModule.data.cron})`, timestamp: new Date().toISOString() });
                }
            }
        }
        if (process.env.DISABLE_SCHEDULED_TASKS === 'true') {
            console.log({ message: 'Scheduled tasks are disabled via environment variable', timestamp: new Date().toISOString() });
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
