import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { verifyKeyMiddleware } from './middleware/verifyKey.js';
import { cleanChannel } from './lib/cleanFunctions.js';

const app = new Hono();

app.get('/', (ctx) => {
  return ctx.text('Hello Hono!');
});

app.get('/interactions', (ctx) => {
  return ctx.text('This endpoint is for Discord interactions. Please use POST requests.');
});

app.post('/interactions', verifyKeyMiddleware, async (ctx) => {
  // Handle the interaction here
  const { id, type, member, data, channel } = await ctx.req.json();

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
      // Call the cleanChannel function to process the channel cleanup in the background
      cleanChannel(
        { id: channel.id, name: channel.name },
        { id: member.user.id, username: member.user.username }
      );

      // Acknowledge the command and inform the user that the bot is processing it.
      return ctx.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Clean command received from user ${member.user.username}! Preparing to clear non-pinned messages.`,
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
