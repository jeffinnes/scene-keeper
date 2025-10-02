import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { verifyKeyMiddleware } from './middleware/verifyKey.js';

const app = new Hono();

app.get('/', (ctx) => {
  return ctx.text('Hello Hono!');
});

app.get('/interactions', (ctx) => {
  return ctx.text('This endpoint is for Discord interactions. Please use POST requests.');
});

app.post('/interactions', verifyKeyMiddleware, async (ctx) => {
  // Handle the interaction here
  const { id, type, data } = await ctx.req.json();

  if (type === InteractionType.PING) {
    ctx.status(200);
    return ctx.json({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    console.log(`req: ${JSON.stringify(await ctx.req.json(), null, 2)}`);

    if (data.name === 'test') {
      return ctx.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Test command received! The command registration process is working.',
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
