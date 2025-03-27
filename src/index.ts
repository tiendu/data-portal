import 'dotenv/config';
import { Hono } from 'hono';
import { serveStatic } from 'hono/serve-static';
import { jwt, sign } from 'hono/jwt';
import type { JwtVariables } from 'hono/jwt';
import { authenticator } from 'otplib';
import { findUser, getUserByUsername, updateUserTwoFASecret } from './users';
import qrcode from 'qrcode';

// Secret key for JWT signing
const JWT_SECRET = 'your_jwt_secret_key';

// Define the type for JWT variables to enable c.get('jwtPayload') inference
type Variables = JwtVariables;

// Create a Hono app with the inferred Variables type
const app = new Hono<{ Variables: Variables }>();

// Serve static files from the "public" directory
app.use('/public/*', serveStatic({ root: './public' }));

// Serve index.html at the root URL
app.get('/', (c) => new Response(Bun.file('./public/index.html')));

// Login endpoint using Hono's sign function for JWT creation.
app.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    const user = findUser(username, password);
    if (user) {
      // Construct a payload with subject and expiration (1 hour)
      const payload = {
        sub: username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        iat: Math.floor(Date.now() / 1000),
      };
      // Create the token using Hono's sign function.
      const token = await sign(payload, JWT_SECRET);
      return c.json({ token });
    }
    return c.json({ error: 'Invalid credentials' }, 401);
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 2FA: Generate secret and QR code
app.get('/generate-2fa', jwt({ secret: JWT_SECRET }), async (c) => {
  const payload = c.get('jwtPayload');
  const username = payload?.sub;
  if (!username) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const user = getUserByUsername(username);
  if (user?.twoFASecret) {
    console.log(`User ${username} already has 2FA set up.`);
    // If already registered, return an indicator (without a secret)
    return c.json({ alreadySetUp: true, secret: user.twoFASecret });
  }
  // Otherwise, generate a new secret and QR code.
  const secret = authenticator.generateSecret();
  updateUserTwoFASecret(username, secret);
  console.log(`2FA secret for user ${username} added: ${secret}`);
  const otpauth = authenticator.keyuri(username, 'MyDataPortal', secret);
  const qrCodeDataURL = await qrcode.toDataURL(otpauth);
  return c.json({ secret, qrCodeDataURL });
});

// 2FA: Verify token
app.post('/verify-2fa', async (c) => {
  const { token, secret } = await c.req.json();
  const isValid = authenticator.check(token, secret);
  if (isValid) {
    return c.json({ success: true, message: '2FA token verified' });
  }
  return c.json({ error: 'Invalid 2FA token' }, 401);
});

// Additional protected endpoint example.
app.get('/protected', jwt({ secret: JWT_SECRET }), (c) => {
  return c.json({ message: 'This is a protected route.' });
});

// Start the server using Bun.serve.
Bun.serve({
  fetch: app.fetch,
  port: 3000,
});

