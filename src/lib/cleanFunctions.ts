import packageJson from '../../package.json' with { type: 'json' };

import type { Message } from '@/types/message.js';

const baseUrl = 'https://discord.com/api/v10/';
const discordBotUserAgent = `DiscordBot (https://github.com/jeffinnes/scene-keeper, ${packageJson.version})`;

async function rateLimitedFetch(
  url: string,
  options?: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    const response = await fetch(url, options);

    // If not rate limited, return the response
    if (response.status !== 429) {
      return response;
    }

    // If we've hit the max retries, return the 429 response
    if (retryCount >= maxRetries) {
      console.error(`Max retries (${maxRetries}) exceeded for ${url}`);
      return response;
    }

    // Handle rate limiting
    let retryAfter = 1; // Default to 1 second if not specified

    try {
      // Check for retry_after in response headers first (Discord standard)
      const retryAfterHeader = response.headers.get('retry-after');
      if (retryAfterHeader) {
        retryAfter = parseInt(retryAfterHeader, 10);
      } else {
        // Check response body for retry_after value
        const responseBody = await response.text();
        try {
          const bodyJson = JSON.parse(responseBody);
          if (bodyJson.retry_after) {
            retryAfter = bodyJson.retry_after;
          }
        } catch {
          // If parsing fails, use default retry time
        }
      }
    } catch (error) {
      console.warn('Failed to parse retry_after, using default delay:', error);
    }

    console.log(
      `Rate limited (429). Retrying in ${retryAfter} seconds... (attempt ${retryCount + 1}/${maxRetries + 1})`
    );

    // Wait for the retry_after duration (convert to milliseconds)
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));

    retryCount++;
  }

  // This should never be reached due to the logic above, but TypeScript needs it
  throw new Error('Unexpected error in rateLimitedFetch');
}

async function cleanChannel(
  channel: { id: string; name: string },
  user: { id: string; username: string }
) {
  // ToDo Delete debug logging when done
  console.log(
    `Cleaning channel: ${channel.name} (ID: ${channel.id}) requested by user ${user.username}`
  );

  const messageLimit = 2; // Discord API message limit per request

  const messageIDs: string[] = [];

  let flag = true;

  while (flag === true) {
    // Implementation for fetching and processing messages in batches
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
    console.log(`Deleted message ID: ${messageId}`);
  }
}

export { cleanChannel };
