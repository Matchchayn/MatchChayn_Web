import express from "express";
import "dotenv/config";
import path from "path";
import { Resend } from 'resend';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Cloudflare R2 Client Initialization
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || "placeholder",
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || "placeholder",
  },
});

const isR2Configured = !!(
  process.env.CLOUDFLARE_ACCOUNT_ID &&
  process.env.CLOUDFLARE_ACCESS_KEY_ID &&
  process.env.CLOUDFLARE_SECRET_ACCESS_KEY &&
  process.env.CLOUDFLARE_BUCKET_NAME &&
  process.env.CLOUDFLARE_PUBLIC_DOMAIN
);

// In-memory OTP store (for demo purposes)
const otpStore = new Map<string, string>();

// Simple authentication middleware (placeholder for now)
const authenticateToken = (req: any, res: any, next: any) => {
  // For now, we'll just mock a user ID if no token is provided
  // In a real app, you'd verify a JWT here
  req.user = { id: "anonymous_user" }; 
  next();
};

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API Routes
app.post("/api/auth/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore.set(email, otp);

  console.log(`[OTP] Generated ${otp} for ${email}`);

  // Non-blocking email sending to keep response fast
  (async () => {
    if (resend) {
      try {
        await resend.emails.send({
          from: 'MatchChayn <support@matchchayn.com>',
          to: email,
          subject: 'Your Verification Code',
          html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MatchChayn Verification</title>
<style>
  body { background-color: #090a1e; color: #ffffff; font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; }
  .main { background-color: #11112b; margin: 40px auto; width: 100%; max-width: 500px; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; }
  .header { padding: 40px 0 20px; text-align: center; }
  .logo { display: inline-block; width: 60px; height: 60px; line-height: 60px; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 16px; font-size: 32px; color: #a855f7; }
  .content { padding: 0 40px 40px; text-align: center; }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #ffffff; }
  p { color: #9ca3af; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
  .otp-container { background: rgba(168, 85, 247, 0.05); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 16px; padding: 30px; margin: 30px 0; }
  .otp-code { font-family: monospace; font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #a855f7; }
  .footer { padding: 30px 40px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); }
  .footer p { font-size: 12px; color: #6b7280; margin: 0; }
  .btn { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #a855f7, #7c3aed); color: #ffffff !important; text-decoration: none; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-top: 20px; }
</style>
</head>
<body>
<div style="background-color: #090a1e; padding: 20px;">
  <table class="main">
    <tr><td class="header"><div class="logo">⚡</div></td></tr>
    <tr>
      <td class="content">
        <h1>Verify Identity</h1>
        <p>Use the code below to secure your MatchChayn account. It expires in 10 minutes.</p>
        <div class="otp-container"><span class="otp-code">${otp}</span></div>
        <p style="font-size: 13px;">If you didn't request this, ignore this email.</p>
        <a href="https://matchchayn.com" class="btn">Open MatchChayn</a>
      </td>
    </tr>
    <tr>
      <td class="footer">
        <p>&copy; 2026 MatchChayn. Vibe on-chain.</p>
      </td>
    </tr>
  </table>
</div>
</body>
</html>
        `
        });
      } catch (error: any) {
        console.error("Resend error:", error);
      }
    } else {
      console.log(`[DEMO MODE] OTP is ${otp}`);
    }
  })();

  res.json({ success: true, message: "OTP sent to your email" });
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const storedOtp = otpStore.get(email);

  if (storedOtp && storedOtp === otp) {
    otpStore.delete(email);
    res.json({ success: true, message: "OTP verified" });
  } else {
    res.status(400).json({ error: "Invalid or expired OTP" });
  }
});

app.post("/api/auth/welcome", async (req, res) => {
  const { email, firstName } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  (async () => {
    if (resend) {
      try {
        await resend.emails.send({
          from: 'MatchChayn <support@matchchayn.com>',
          to: email,
          subject: `Welcome to MatchChayn, ${firstName || 'there'}!`,
          html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to MatchChayn</title>
<style>
  body { background-color: #090a1e; color: #ffffff; font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; }
  .main { background-color: #11112b; margin: 40px auto; width: 100%; max-width: 500px; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; }
  .header { padding: 40px 0 20px; text-align: center; }
  .logo { display: inline-block; width: 60px; height: 60px; line-height: 60px; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 16px; font-size: 32px; color: #a855f7; }
  .content { padding: 0 40px 40px; text-align: center; }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #ffffff; }
  p { color: #9ca3af; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
  .footer { padding: 30px 40px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); }
  .footer p { font-size: 12px; color: #6b7280; margin: 0; }
  .btn { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #a855f7, #7c3aed); color: #ffffff !important; text-decoration: none; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-top: 20px; }
</style>
</head>
<body>
<div style="background-color: #090a1e; padding: 20px;">
  <table class="main">
    <tr><td class="header"><div class="logo">✨</div></td></tr>
    <tr>
      <td class="content">
        <h1>Your Profile is Live!</h1>
        <p>Welcome to MatchChayn, ${firstName || 'Founder'}. Your frequencies are now synced on-chain.</p>
        <p>Start matching with those who vibe on your level and explore the future of social connection.</p>
        <a href="https://matchchayn.com" class="btn">Start Matching Now</a>
      </td>
    </tr>
    <tr>
      <td class="footer">
        <p>&copy; 2026 MatchChayn. Vibe on-chain.</p>
      </td>
    </tr>
  </table>
</div>
</body>
</html>
          `
        });
      } catch (error: any) {
        console.error("Resend Welcome Email error:", error);
      }
    }
  })();

  res.json({ success: true, message: "Welcome email triggered" });
});

// Admin Stats Endpoint
app.get("/api/admin/stats", authenticateToken, (req, res) => {
  // In a real app, you'd fetch these from Firestore
  // For now, we'll return some mock stats
  res.json({
    profilesCreated: 1248,
    totalUsers: 1540,
    conversations: 856,
    matchingInterests: 3420,
    successfulMatches: 428,
    messagesSent: 15680,
    interestsCreated: 560,
    likesGiven: 8420,
    userMedia: 3120,
    userPreferences: 1420,
    onlineUsers: 142,
    activeEvents: 12
  });
});

// ─── R2 Presigned Upload URL ──────────────────────────────────────────────────
app.post('/api/media/presigned-url', authenticateToken, async (req: any, res) => {
  if (!isR2Configured) {
    return res.status(503).json({ error: "Cloudflare R2 is not configured. Please set environment variables." });
  }
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) {
      return res.status(400).json({ error: "fileName and fileType are required" });
    }

    // Basic validation for video/image types
    if (!fileType.startsWith('video/') && !fileType.startsWith('image/')) {
      return res.status(400).json({ error: "Only video and image files are allowed" });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const key = `uploads/${req.user.id}/${Date.now()}-${safeName}`;
    
    const command = new PutObjectCommand({ 
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME, 
      Key: key, 
      ContentType: fileType 
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    const publicUrl = `${process.env.CLOUDFLARE_PUBLIC_DOMAIN}/${key}`;
    
    res.json({ uploadUrl, publicUrl });
  } catch (err) {
    console.error('Presigned URL Error:', err);
    res.status(500).json({ message: 'Failed to generate upload URL' });
  }
});

// For development, rely on the separate Vite proxy.
// We only serve static files in production.
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Only listen if not on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;

