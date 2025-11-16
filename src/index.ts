import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { verifyKeyMiddleware } from '@/middleware/verifyKey.js';
import { handleCleanCommand } from '@/commands/clean/clean.js';
import { transcribeChannel } from '@/commands/transcribe/transcribeFunctions.js';

const app = new Hono();

app.get('/', (ctx) => {
  return ctx.text('Hello Hono!');
});

app.get('/interactions', (ctx) => {
  return ctx.text('This endpoint is for Discord interactions. Please use POST requests.');
});

app.post('/interactions', verifyKeyMiddleware, async (ctx) => {
  // Handle the interaction here
  const { guild_id, type, member, data, channel } = await ctx.req.json();

  if (type === InteractionType.PING) {
    ctx.status(200);
    return ctx.json({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    // console.log(`req: ${JSON.stringify(await ctx.req.json(), null, 2)}`);

    if (data.name === 'test') {
      return ctx.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Test command received! The command registration process is working.',
        },
      });
    }

    if (data.name === 'clean') {
      handleCleanCommand(
        ctx,
        { id: channel.id, name: channel.name },
        { id: member.user.id, username: member.user.username }
      );
    }

    if (data.name === 'transcribe') {
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
        guild_id,
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
  }
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
