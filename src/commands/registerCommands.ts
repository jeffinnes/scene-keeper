/**
 * This is a script to register commands with Discord. It runs separately from the main Hono app.
 * This is based on the example here: https://github.com/discord/discord-example-app/blob/main/utils.js
 * (As of September 2025)
 */
import type { ApplicationCommand } from '@/types/command.js';
import { commandList } from '@/commands/development/commandList.js';
import packageJson from '../../package.json' with { type: 'json' };

// Define reusable utility functions to register commands with Discord
async function DiscordRequest(endpoint: string, method: string, commands: ApplicationCommand[]) {
  try {
    // append endpoint to root API URL
    const url = 'https://discord.com/api/v10/' + endpoint;

    // Use fetch to make requests
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': `DiscordBot (https://github.com/jeffinnes/scene-keeper, ${packageJson.version})`,
      },
      method,
      body: JSON.stringify(commands),
    });

    // throw API errors
    if (!res.ok) {
      const data = await res.json();
      console.log(res.status);
      throw new Error(JSON.stringify(data));
    }
    // return original response
    return res;
  } catch (error) {
    console.log(error);
  }
}

// Function to install dev commands to the dev guild
async function InstallDevCommands(appId: string, guildId: string, commands: ApplicationCommand[]) {
  // API endpoint to overwrite guild commands
  const endpoint = `/applications/${appId}/guilds/${guildId}/commands`;

  try {
    // This is using PUT to call the bulk overwrite functionality at the endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-guild-application-commands
    await DiscordRequest(endpoint, 'PUT', commands);
    // log out the guild and status
    console.log(`Finished installing commands for guild ID: ${guildId}`);
  } catch (err) {
    console.error(err);
  }
}

// Function to install global commands
async function InstallGlobalCommands(appId: string, commands: ApplicationCommand[]) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is using PUT to call the bulk overwrite functionality at the endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, 'PUT', commands);
  } catch (err) {
    console.error(err);
  }
}

// Run the scripts
(async () => {
  try {
    const appId = process.env.APP_ID || 'missing_app_id';
    const rawGuildIds = process.env.DEV_GUILD_IDS || 'missing_guild_ids';
    const guildIds = rawGuildIds.split(',');

    if (guildIds.length === 0) {
      throw new Error('No DEV_GUILD_IDS specified in environment variables.');
    }

    // Install the dev commands for each guild ID
    for (const id of guildIds) {
      const guildId = id.trim();
      if (guildId.length === 0) {
        continue;
      }

      console.log(`Registering commands for guild ID: ${guildId}`);
      await InstallDevCommands(appId, guildId, commandList);
    }

    // Install global commands
    await InstallGlobalCommands(appId, commandList);
  } catch (error) {
    console.error(error);
  }
})();
