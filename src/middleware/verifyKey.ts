import { createMiddleware } from 'hono/factory';
import { verifyKey } from 'discord-interactions';

// Define Middleware
const verifyKeyMiddleware = createMiddleware(async (ctx, next) => {
  const signature = ctx.req.header('X-Signature-Ed25519');
  const timestamp = ctx.req.header('X-Signature-Timestamp');
  const rawBody = await ctx.req.text(); // Get raw body as text

  if (!rawBody) {
    return ctx.status(400);
  }

  if (!signature || !timestamp || !process.env.PUBLIC_KEY) {
    return ctx.status(401);
  }

  const isValidRequest = await verifyKey(rawBody, signature, timestamp, process.env.PUBLIC_KEY);

  if (!isValidRequest) {
    return ctx.status(401);
  }

  await next();
});

export { verifyKeyMiddleware };
