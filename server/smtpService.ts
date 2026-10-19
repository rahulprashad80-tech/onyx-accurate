/**
 * Server-Side Secure SMTP Utility Service
 * 
 * IMPORTANT: This utility runs exclusively on the Node.js / Express server.
 * Credentials, API keys, and SMTP authentication secrets are stored in secure
 * server-side environment variables and are NEVER exposed to the frontend browser.
 */

import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface SMTPOptions {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  fromEmail?: string;
  fromName?: string;
}

export interface TicketEmailPayload {
  id: string;
  ticketNumber?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  requesterName: string;
  requesterEmail: string;
  companyName?: string;
  departmentName?: string;
  assetTag?: string;
  assetSpecs?: string;
  createdAt: string;
  directLink?: string;
  assignedTechName?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  smtpOverrides?: SMTPOptions;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  isLiveSmtp: boolean;
  previewUrl?: string;
  error?: string;
}

// In-memory runtime settings cache (seeded from environment)
let cachedRuntimeSettings = {
  adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'rahulprashad80@gmail.com',
  senderName: process.env.SMTP_FROM_NAME || 'IT Helpdesk System',
  senderEmail: process.env.SMTP_FROM || 'notifications@company.internal',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpSecure: process.env.SMTP_SECURE === 'true',
  notifyAdminOnTicketCreated: true,
  notifyTechOnTicketAssigned: true,
  notifyRequesterOnStatusChange: true,
  notifyAdminOnCriticalPriority: true,
  notifyAdminOnOverdue: true,
};

/**
 * Creates and initializes a secure Nodemailer transporter based on server environment.
 * If live SMTP credentials (SMTP_HOST & SMTP_USER) exist, uses production SMTP.
 * Otherwise, falls back seamlessly to Ethereal test account or JSON mock for development.
 */
export async function getSecureSMTPTransporter(overrides?: SMTPOptions): Promise<{
  transporter: Transporter;
  isLiveSmtp: boolean;
  isEthereal?: boolean;
}> {
  const host = overrides?.host || cachedRuntimeSettings.smtpHost || process.env.SMTP_HOST;
  const user = overrides?.user || cachedRuntimeSettings.smtpUser || process.env.SMTP_USER;
  const pass = overrides?.pass || cachedRuntimeSettings.smtpPass || process.env.SMTP_PASS;
  const port = overrides?.port || cachedRuntimeSettings.smtpPort || parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = overrides?.secure !== undefined 
    ? overrides.secure 
    : (cachedRuntimeSettings.smtpSecure || process.env.SMTP_SECURE === 'true');

  // If live credentials are provided in server environment
  if (host && user) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    });
    return { transporter, isLiveSmtp: true };
  }

  // Fallback: Test ethereal or structured mock transporter for development / preview
  try {
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return { transporter: testTransporter, isLiveSmtp: false, isEthereal: true };
  } catch (err) {
    // Ultimate fallback: JSON transport that safely captures message without failure
    const mockTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return { transporter: mockTransporter, isLiveSmtp: false };
  }
}

/**
 * Formats a clean, high-priority HTML and text email body conforming to Helpdesk specifications.
 */
export function formatTicketEmailContent(
  ticket: TicketEmailPayload,
  eventType: string = 'ticket_created',
  appBaseUrl: string = 'http://localhost:3000'
): { subject: string; html: string; text: string } {
  const ticketRef = ticket.ticketNumber || ticket.id;
  
  // Subject exact requirement:
  // "New Helpdesk Ticket: [Ticket ID] – [Ticket Title]"
  let subject = `New Helpdesk Ticket: ${ticketRef} – ${ticket.title}`;
  if (eventType === 'ticket_assigned') {
    subject = `Ticket Assigned: [${ticketRef}] – ${ticket.title}`;
  } else if (eventType === 'status_changed') {
    subject = `Ticket Status Updated: [${ticketRef}] – ${ticket.title} (${ticket.status})`;
  } else if (eventType === 'critical_ticket') {
    subject = `CRITICAL ALERT: [${ticketRef}] – ${ticket.title}`;
  } else if (eventType === 'overdue') {
    subject = `OVERDUE SLA Alert: [${ticketRef}] – ${ticket.title}`;
  }

  const directLink = ticket.directLink || `${appBaseUrl}/?ticket=${ticket.id}`;
  const priority = ticket.priority || 'Medium';
  const status = ticket.status || 'Open';

  const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: '#fee2e2', text: '#991b1b', border: '#f87171' },
    urgent: { bg: '#fee2e2', text: '#991b1b', border: '#f87171' },
    high: { bg: '#ffedd5', text: '#9a3412', border: '#fb923c' },
    medium: { bg: '#e0e7ff', text: '#3730a3', border: '#818cf8' },
    low: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
  };

  const pColor = priorityColors[priority.toLowerCase()] || priorityColors.medium;
  const createdDate = ticket.createdAt 
    ? new Date(ticket.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Header Banner -->
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 24px; color: #ffffff;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; opacity: 0.85; margin-bottom: 4px;">
        IT Operations Helpdesk Automated Alert
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">
        ${subject}
      </h1>
    </div>

    <!-- Status Strip -->
    <div style="background-color: #f1f5f9; padding: 12px 24px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
      <div>
        <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Status:</span>
        <strong style="font-size: 12px; color: #0f172a; text-transform: capitalize; margin-left: 4px;">${status}</strong>
      </div>
      <div>
        <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Priority:</span>
        <span style="background-color: ${pColor.bg}; color: ${pColor.text}; border: 1px solid ${pColor.border}; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-left: 4px;">
          ${priority}
        </span>
      </div>
    </div>

    <!-- Main Content Details -->
    <div style="padding: 24px;">
      
      <!-- Issue Title and Description -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #0f172a; font-weight: 600;">
          ${ticket.title}
        </h2>
        <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;">
${ticket.description}
        </div>
      </div>

      <!-- Specification Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 35%;">Ticket ID</td>
            <td style="padding: 10px 0; color: #0f172a; font-family: monospace; font-weight: 700;">${ticketRef}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Category</td>
            <td style="padding: 10px 0; color: #0f172a; text-transform: capitalize;">${ticket.category || 'General'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Priority</td>
            <td style="padding: 10px 0; color: #0f172a; text-transform: uppercase; font-weight: 700;">${priority}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Status</td>
            <td style="padding: 10px 0; color: #0f172a; text-transform: capitalize;">${status}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Requester</td>
            <td style="padding: 10px 0; color: #0f172a;">
              <strong>${ticket.requesterName || 'Employee'}</strong>
              ${ticket.requesterEmail ? `<span style="color: #64748b; font-family: monospace; font-size: 11px;">(${ticket.requesterEmail})</span>` : ''}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Company</td>
            <td style="padding: 10px 0; color: #0f172a;">${ticket.companyName || 'Corporate'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Department</td>
            <td style="padding: 10px 0; color: #0f172a;">${ticket.departmentName || 'General Staff'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Affected Computer / Asset</td>
            <td style="padding: 10px 0; color: #0f172a;">
              ${ticket.assetTag 
                ? `<strong style="font-family: monospace; color: #4338ca; background-color: #eef2ff; padding: 2px 6px; border-radius: 4px;">${ticket.assetTag}</strong> ${ticket.assetSpecs ? `– ${ticket.assetSpecs}` : ''}` 
                : '<span style="color: #94a3b8; font-style: italic;">None selected (General inquiry / non-hardware)</span>'}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Created Date & Time</td>
            <td style="padding: 10px 0; color: #0f172a;">${createdDate}</td>
          </tr>
        </tbody>
      </table>

      <!-- CTA Button to open ticket -->
      <div style="text-align: center; margin: 28px 0 16px 0;">
        <a href="${directLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.25);">
          Open Ticket in Application &rarr;
        </a>
      </div>

      <div style="text-align: center; font-size: 11px; color: #94a3b8;">
        Direct Link: <a href="${directLink}" style="color: #6366f1; word-break: break-all;">${directLink}</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
      This automated alert was dispatched by the IT Helpdesk System. All SMTP credentials are protected server-side.
    </div>
  </div>
</body>
</html>
`;

  const text = `
New Helpdesk Ticket Notification
=========================================
Subject: ${subject}

Ticket ID: ${ticketRef}
Title: ${ticket.title}

Description:
${ticket.description}

Category: ${ticket.category || 'General'}
Priority: ${priority}
Status: ${status}
Requester: ${ticket.requesterName || 'Employee'} (${ticket.requesterEmail || 'No email'})
Company: ${ticket.companyName || 'Corporate'}
Department: ${ticket.departmentName || 'General Staff'}
Affected Asset: ${ticket.assetTag || 'None selected'} ${ticket.assetSpecs ? `(${ticket.assetSpecs})` : ''}
Created Date & Time: ${createdDate}

Direct Link to Open Ticket:
${directLink}
-----------------------------------------
Automated notification dispatched via secure server SMTP.
`;

  return { subject, html, text };
}

/**
 * Primary server-side utility function to handle sending emails via secure SMTP.
 * Ensures zero credentials or sensitive API keys leak into client bundles.
 */
export async function sendEmailViaSecureSMTP(options: SendEmailOptions): Promise<SendEmailResult> {
  const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  
  if (!recipient || recipient.trim() === '') {
    return {
      success: false,
      recipient: '',
      isLiveSmtp: false,
      error: 'Recipient email address is required.',
    };
  }

  try {
    const { transporter, isLiveSmtp, isEthereal } = await getSecureSMTPTransporter(options.smtpOverrides);

    const senderName = options.smtpOverrides?.fromName || cachedRuntimeSettings.senderName;
    const senderEmail = options.smtpOverrides?.fromEmail || cachedRuntimeSettings.senderEmail;
    const fromAddress = `"${senderName}" <${senderEmail}>`;

    const mailOptions = {
      from: fromAddress,
      to: recipient,
      subject: options.subject,
      text: options.text || '',
      html: options.html,
      replyTo: options.replyTo,
    };

    const info = await transporter.sendMail(mailOptions);
    let previewUrl: string | undefined = undefined;

    if (isEthereal) {
      previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    }

    console.log(`[SecureSMTP] Email dispatched to ${recipient} (Message ID: ${info.messageId || 'simulated'}, live: ${isLiveSmtp})`);

    return {
      success: true,
      messageId: info.messageId || `msg-${Date.now()}`,
      recipient,
      isLiveSmtp,
      previewUrl,
    };
  } catch (err: any) {
    console.error('[SecureSMTP] Email dispatch failed:', err);
    return {
      success: false,
      recipient,
      isLiveSmtp: false,
      error: err?.message || 'SMTP transmission failed. Please verify server connection.',
    };
  }
}

/**
 * Accessor for runtime notification settings
 */
export function getRuntimeEmailSettings() {
  return {
    ...cachedRuntimeSettings,
    hasSmtpCredentials: Boolean(
      (cachedRuntimeSettings.smtpHost || process.env.SMTP_HOST) &&
      (cachedRuntimeSettings.smtpUser || process.env.SMTP_USER)
    ),
  };
}

/**
 * Setter to update cached runtime notification settings
 */
export function updateRuntimeEmailSettings(updates: Partial<typeof cachedRuntimeSettings>) {
  cachedRuntimeSettings = {
    ...cachedRuntimeSettings,
    ...updates,
    adminEmail: updates.adminEmail ? String(updates.adminEmail).trim() : cachedRuntimeSettings.adminEmail,
  };
  return cachedRuntimeSettings;
}
