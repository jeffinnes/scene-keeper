import type { Message } from '@/types/message.js';

import packageJson from '../../../package.json' with { type: 'json' };
import { rateLimitedFetch } from '@/lib/sharedFunctions.js';

const baseUrl = 'https://discord.com/api/v10/';
const discordBotUserAgent = `DiscordBot (https://github.com/jeffinnes/scene-keeper, ${packageJson.version})`;

async function cleanChannel(
  channel: { id: string; name: string },
  user: { id: string; username: string }
) {
  // ToDo Delete debug logging when done
  console.log(
    `Cleaning channel: ${channel.name} (ID: ${channel.id}) requested by user ${user.username}`
  );

  const messageLimit = 100; // Discord API message limit per request (100 max, set lower for debugging with low use channels)

  const messageIDs: string[] = [];

  let flag = true;

  while (flag === true) {
    // Fetch all the channel messages
    const getMessagesUrl = `${baseUrl}channels/${channel.id}/messages?limit=${messageLimit}${
      messageIDs.length > 0 ? `&before=${messageIDs[messageIDs.length - 1]}` : ''
    }`;

    const messagesResponse = await rateLimitedFetch(getMessagesUrl, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': discordBotUserAgent,
      },
    });

    if (!messagesResponse.ok) {
      console.error(
        `Failed to fetch messages: ${messagesResponse.status} ${messagesResponse.statusText}`
      );
      return;
    }

    const messages: Message[] = await messagesResponse.json();

    console.log(`Fetched ${messages.length} messages from channel ${channel.name}`);
    // console.log('Messages:', JSON.stringify(messages, null, 2));

    if (messages.length < messageLimit) {
      flag = false;
    }

    // Filter out pinned messages and collect IDs of messages to delete
    const nonPinnedMessages = messages.filter((message) => !message.pinned);

    nonPinnedMessages.forEach((message) => {
      messageIDs.push(message.id);
    });

    console.log(`Collected ${messageIDs.length} non-pinned message IDs for deletion.`);
  } // End of while loop

  console.log(`Total non-pinned messages to delete: ${messageIDs.length}`);
  console.log('Message IDs:', messageIDs);

  // For testing/Debugging, just log the message IDs instead of deleting them.
  /* await rateLimitedFetch(`${baseUrl}channels/${channel.id}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': discordBotUserAgent,
    },
    body: JSON.stringify({
      content: `This would have deleted ${messageIDs.length} non-pinned messages...`,
    }),
  }); */

  for (const messageId of messageIDs) {
    await rateLimitedFetch(`${baseUrl}/channels/${channel.id}/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': discordBotUserAgent,
        'X-Audit-Log-Reason': `Clean command by user ${user.username} (ID: ${user.id})`,
      },
    });
  }
}

export { cleanChannel };
