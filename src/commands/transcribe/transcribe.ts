import type { Context } from 'hono';

import { InteractionResponseType } from 'discord-interactions';
import { transcribeChannel } from '@/commands/transcribe/transcribeFunctions.js';

export async function handletranscribeChannel(
  ctx: Context,
  guildID: string,
  channel: { id: string; name: string },
  member: { user: { id: string; username: string } },
  data: { options: { name: string; type: number; value: string }[] }
) {
  // console.log(`req: ${JSON.stringify(await ctx.req.json(), null, 2)}`);
  const emailListObject: { name: string; type: number; value: string } | undefined =
    data.options.find(
      (option: { name: string; type: number; value: string }) => option.name === 'email_list'
    );

  // If no email list provided, respond with an error message
  // Discord should have prevented this from happening since it's a required option
  // but just in case...
  if (!emailListObject) {
    return ctx.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Transcribe command received from user ${member.user.username}! But no email recipients were provided.`,
      },
    });
  }

  // Split the comma-separated email list into an array and trim whitespace
  const emailRecipients = emailListObject.value.split(',').map((email: string) => email.trim());

  // Call the transcribeChannel function to process the channel archiving in the background
  transcribeChannel(
    guildID,
    { id: channel.id, name: channel.name },
    { id: member.user.id, username: member.user.username },
    emailRecipients
  );

  // Acknowledge the command and inform the user that the bot is processing it.
  return ctx.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Transcribe command received from user ${member.user.username}! Preparing to email message log.`,
    },
  });
}
