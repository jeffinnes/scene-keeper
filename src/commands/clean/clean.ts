import type { Context } from 'hono';

import { InteractionResponseType } from 'discord-interactions';
import { cleanChannel } from '@/commands/clean/cleanFunctions.js';

export async function handleCleanCommand(
  ctx: Context,
  channel: { id: string; name: string },
  member: { id: string; username: string }
) {
  // Call the cleanChannel function to process the channel cleanup in the background
  cleanChannel(
    { id: channel.id, name: channel.name },
    { id: member.id, username: member.username }
  );

  // Acknowledge the command and inform the user that the bot is processing it.
  return ctx.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Clean command received from user ${member.username}! Preparing to clear non-pinned messages.`,
    },
  });
}
