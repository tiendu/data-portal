import 'dotenv/config';
import { Hono } from 'hono';
import { serveStatic } from 'hono/serve-static';
import { jwt, sign } from 'hono/jwt';
import type { JwtVariables } from 'hono/jwt';
import { authenticator } from 'otplib';
import { findUser, getUserByUsername, updateUserTwoFASecret } from './users';
import { mkdir } from 'fs/promises';
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

// Serve dashboard.html at /dashboard URL
app.get('/dashboard', (c) => new Response(Bun.file('./public/dashboard.html')))

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
app.post('/verify-2fa', jwt({ secret: JWT_SECRET }), async (c) => {
  // Get the 2FA token and secret from the request body
  const { token: twoFAToken, secret: twoFASecret } = await c.req.json();

  // Retrieve the username from the verified JWT payload (sent along with the request)
  const payload = c.get('jwtPayload');
  const username = payload?.sub;
  if (!username) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Validate the 2FA code
  const isValid = authenticator.check(twoFAToken, twoFASecret);
  if (isValid) {
    // Build a new payload for the session token
    const newPayload = {
      sub: username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // e.g., valid for 1 hour
    };
    // Generate a new JWT session token using your secret key
    const sessionToken = await sign(newPayload, JWT_SECRET);
    return c.json({ success: true, message: '2FA token verified', token: sessionToken });
  }
  return c.json({ error: 'Invalid 2FA token' }, 401);
});

// Upload Endpoint: Save a file to the user's dedicated directory.
app.post('/upload', jwt({ secret: JWT_SECRET }), async (c) => {
  try {
    // Get the username from the JWT payload.
    const payload = c.get('jwtPayload');
    const username = payload?.sub;
    if (!username) return c.json({ error: 'Unauthorized' }, 401);
    console.log("Successfully logged in!");
    // Parse the form data.
    const formData = await c.req.formData();
    const file = formData.get('file');
    console.log(`Uploading:`, file);
    if (!file) return c.json({ error: 'No file provided' }, 400);

    // Determine the user's asset directory.
    const userDir = `./assets/${username}`;
    // Create the directory if it doesn't exist.
    await mkdir(userDir, { recursive: true });

    // Get the original file name.
    const fileName = file.name || 'uploadfile';
    const filePath = `${userDir}/${fileName}`;

    // Convert the uploaded file to a Buffer.
    const buffer = Buffer.from(await file.arrayBuffer());
    await Bun.write(filePath, buffer);

    return c.json({ success: true, message: 'File uploaded successfully', filePath });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

// Download Endpoint: Retrieve a file from the user's directory.
app.get('/download', jwt({ secret: JWT_SECRET }), async (c) => {
  const payload = c.get('jwtPayload');
  const username = payload?.sub;
  if (!username) return c.json({ error: 'Unauthorized' }, 401);
  
  const fileName = c.req.query('filename');
  if (!fileName) return c.json({ error: 'Missing filename' }, 400);
  
  const filePath = `./assets/${username}/${fileName}`;
  try {
    await Bun.stat(filePath);
    return c.body(Bun.file(filePath));
  } catch (err) {
    return c.json({ error: 'File not found' }, 404);
  }
});

// Start the server using Bun.serve.
Bun.serve({
  fetch: app.fetch,
  port: 3000,
});

