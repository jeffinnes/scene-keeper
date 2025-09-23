import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { verifyKeyMiddleware } from './middleware/verifyKey.js';

const app = new Hono();

app.get('/', (ctx) => {
  return ctx.text('Hello Hono!');
});

app.post('/interactions', verifyKeyMiddleware, async (ctx) => {
  // Handle the interaction here
  const { id, type, data } = await ctx.req.json();
  console.log('Interaction received:', { id, type, data });

  if (type === InteractionType.PING) {
    ctx.status(200);
    return ctx.json({ type: InteractionResponseType.PONG });
  }
});

app.get('/interactions', (ctx) => {
  return ctx.text('This endpoint is for Discord interactions. Please use POST requests.');
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
