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
    npm run register
    ```
   Note: This step is only necessary if you have added or modified commands. If you are running the bot for the first time, you can skip this step.

4. **Run the bot:**

    ```sh
    npm run start
    ```

## Contributing

Feel free to submit issues or pull requests if you have any improvements or bug fixes.