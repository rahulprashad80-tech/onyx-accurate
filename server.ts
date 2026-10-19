import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import {
  sendEmailViaSecureSMTP,
  formatTicketEmailContent,
  getRuntimeEmailSettings,
  updateRuntimeEmailSettings,
} from './server/smtpService';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// -------------------------------------------------------------
// API: Email Settings
// -------------------------------------------------------------
app.get('/api/email/settings', (_req: Request, res: Response) => {
  const settings = getRuntimeEmailSettings();
  res.json({
    success: true,
    settings,
  });
});

app.post('/api/email/settings', (req: Request, res: Response) => {
  const { settings } = req.body;
  if (settings && typeof settings === 'object') {
    updateRuntimeEmailSettings(settings);
  }
  res.json({ success: true, settings: getRuntimeEmailSettings() });
});

// -------------------------------------------------------------
// API: Send Ticket Notification
// -------------------------------------------------------------
app.post('/api/email/send-ticket-notification', async (req: Request, res: Response) => {
  try {
    const { ticket, adminEmail, eventType, customRecipient } = req.body;

    if (!ticket) {
      return res.status(400).json({ success: false, error: 'Ticket details are required.' });
    }

    const currentSettings = getRuntimeEmailSettings();
    const recipient = customRecipient || adminEmail || currentSettings.adminEmail || 'admin@company.internal';
    const appBaseUrl = process.env.APP_URL || `http://localhost:${PORT}`;

    // Format content using server-side utility
    const { subject, html, text } = formatTicketEmailContent(ticket, eventType || 'ticket_created', appBaseUrl);

    // Dispatch via server-side secure SMTP utility
    const result = await sendEmailViaSecureSMTP({
      to: recipient,
      subject,
      html,
      text,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'SMTP delivery failed.',
        recipient,
      });
    }

    return res.json({
      success: true,
      messageId: result.messageId,
      recipient: result.recipient,
      isLiveSmtp: result.isLiveSmtp,
      previewUrl: result.previewUrl,
    });
  } catch (err: any) {
    console.error('[EmailServer] Send ticket notification failed:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to dispatch email notification.',
    });
  }
});

// -------------------------------------------------------------
// API: Test Email
// -------------------------------------------------------------
app.post('/api/email/test', async (req: Request, res: Response) => {
  try {
    const { targetEmail, settings } = req.body;
    if (settings && typeof settings === 'object') {
      updateRuntimeEmailSettings(settings);
    }

    const currentSettings = getRuntimeEmailSettings();
    const recipient = targetEmail || settings?.adminEmail || currentSettings.adminEmail || 'admin@company.internal';
    const appBaseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const subject = 'Test Notification: IT Helpdesk Email Integration Verified';
    const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' });

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #10b981; padding: 20px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 700;">✓ Email Configuration Verified</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">IT Helpdesk System Transactional Notification Test</p>
    </div>
    <div style="padding: 24px; font-size: 13px; line-height: 1.6; color: #334155;">
      <p>Hello Administrator,</p>
      <p>This message confirms that your <strong>Helpdesk Email Notification Service</strong> is operational and properly configured to deliver automated ticket alerts to your address.</p>
      
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 14px; margin: 18px 0; font-size: 12px;">
        <div style="margin-bottom: 6px;"><strong>Recipient:</strong> <span style="font-family: monospace; color: #0f172a;">${recipient}</span></div>
        <div style="margin-bottom: 6px;"><strong>Dispatched At:</strong> ${timestamp}</div>
        <div><strong>Application Origin:</strong> <a href="${appBaseUrl}" style="color: #4f46e5;">${appBaseUrl}</a></div>
      </div>

      <p style="margin-bottom: 0;">Whenever employees or technicians log support tickets or critical hardware faults, instant alerts will be dispatched directly to this inbox.</p>
    </div>
  </div>
</body>
</html>
`;

    const textBody = `IT Helpdesk Test Notification\n\nVerified successfully at ${timestamp}.\nRecipient: ${recipient}\nApplication: ${appBaseUrl}`;

    const result = await sendEmailViaSecureSMTP({
      to: recipient,
      subject,
      html: htmlBody,
      text: textBody,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to dispatch test verification email.',
      });
    }

    return res.json({
      success: true,
      recipient: result.recipient,
      isLiveSmtp: result.isLiveSmtp,
      messageId: result.messageId,
      previewUrl: result.previewUrl,
      message: `Verified test email successfully dispatched to ${recipient}`,
    });
  } catch (err: any) {
    console.error('[EmailServer] Test email failed:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to dispatch test verification email.',
    });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function startServer() {
  if (!isProd) {
    // In development, mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dist folder
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] IT Helpdesk & Computer Inventory running on port ${PORT}`);
    console.log(`[Server] Admin notification recipient: ${getRuntimeEmailSettings().adminEmail}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
