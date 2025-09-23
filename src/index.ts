import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { verifyKeyMiddleware } from './middleware/verifyKey.js';

const app = new Hono();

app.get('/', (ctx) => {
  return ctx.text('Hello Hono!');
});

// Define interactions base path
const interactions = new Hono().basePath('/interactions');

interactions.post('/', verifyKeyMiddleware, async (ctx) => {
  // Handle the interaction here
  const { id, type, data } = await ctx.req.json();
  console.log('Interaction received:', { id, type, data });

  if (type === InteractionType.PING) {
    ctx.status(200);
    return ctx.json({ type: InteractionResponseType.PONG });
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
