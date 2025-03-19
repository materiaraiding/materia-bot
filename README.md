# Materia Bot

Materia Bot is a Discord bot designed to provide various guides for raids and trials in the game. It uses the Discord.js library to interact with the Discord API.

## Requirements

- Node.js v20.12.x or higher

## Setup

1. **Clone the repository:**

    ```sh
    git clone https://github.com/yourusername/materia-bot.git
    cd materia-bot
    ```

2. **Install dependencies:**

    ```sh
    npm install
    ```

3. **Create a `.env` file in the root directory and add your environment variables:**

    ```env
    TOKEN=your-discord-bot-token
    CLIENTID=your-discord-client-id
    ```

4. **Run the deploy-commands.js to register new commands (Optional):**

    if you have made changes to commands inputs they will need to be registered running the deploy-commands.js script.

    ```sh
    node deploy-commands.js
    ```

4. **Run the bot:**

    ```sh
    node index.js
    ```

## Commands

The bot currently supports the following commands:

- `/guide savage name:<3-letter name>` - Gets the link to a Savage Raid Guide.
- `/guide extreme name:<3-letter name>` - Gets the link to an Extreme Trial Guide.
- `/guide criterion name:<3-letter name>` - Gets the link to a Criterion Guide.
- `/guide chaotic name:<3-letter name>` - Gets the link to a Chaotic Alliance Raid Guide.

## Contributing

Feel free to submit issues or pull requests if you have any improvements or bug fixes.