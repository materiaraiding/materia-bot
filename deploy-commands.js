const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config()

async function deployCommands() {
    // Grab all the command folders from the commands directory you created earlier
    const foldersPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(foldersPath);

    // Collect commands for async processing
    const commandModules = [];

    for (const folder of commandFolders) {
        // Skip the tooling directory as it contains utility modules, not commands
        if (folder === 'tooling') continue;

        // Grab all the command files from the commands directory you created earlier
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        // Load command modules
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commandModules.push(command);
            } else {
                console.log({
                    message: `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
                    filePath,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(process.env.TOKEN);

    try {
        // Process all commands and await their data functions
        const commands = await Promise.all(
            commandModules.map(async (command) => {
                // Handle both async functions and regular SlashCommandBuilder objects
                if (typeof command.data === 'function') {
                    return (await command.data()).toJSON();
                } else {
                    return command.data.toJSON();
                }
            })
        );

        console.log({
            message: `Started refreshing ${commands.length} application (/) commands.`,
            commandCount: commands.length,
            timestamp: new Date().toISOString()
        });

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENTID),
            { body: commands },
        );

        console.log({
            message: `Successfully reloaded ${data.length} application (/) commands.`,
            commandCount: data.length,
            clientId: process.env.CLIENTID,
            timestamp: new Date().toISOString()
        });
        return data;
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error({
            message: 'Error deploying commands',
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

// Export the deployCommands function
module.exports = { deployCommands };

// Run the function if the file is executed directly
if (require.main === module) {
    deployCommands().catch(error => {
        console.error({
            message: 'Failed to deploy commands',
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    });
}
