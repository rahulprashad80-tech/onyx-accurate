import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { sanitizeForFirestore } from '../firebase/utils';
import { 
  Ticket, 
  EmailNotificationSettings, 
  EmailDeliveryLog 
} from '../types';

export const DEFAULT_EMAIL_SETTINGS: EmailNotificationSettings = {
  adminEmail: 'rahulprashad80@gmail.com',
  senderName: 'IT Helpdesk System',
  senderEmail: 'notifications@company.internal',
  notifyAdminOnTicketCreated: true,
  notifyTechOnTicketAssigned: true,
  notifyRequesterOnStatusChange: true,
  notifyAdminOnCriticalPriority: true,
  notifyAdminOnOverdue: true,
};

const EMAIL_SETTINGS_DOC_PATH = 'settings';
const EMAIL_SETTINGS_DOC_ID = 'email_notifications';
const EMAIL_LOGS_STORAGE_KEY = 'it_desk_email_delivery_logs_v1';

class EmailNotificationServiceImpl {
  private cachedSettings: EmailNotificationSettings | null = null;

  /**
   * Loads the current email notification settings from Firestore with default fallback.
   */
  async getSettings(): Promise<EmailNotificationSettings> {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    try {
      const docRef = doc(db, EMAIL_SETTINGS_DOC_PATH, EMAIL_SETTINGS_DOC_ID);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<EmailNotificationSettings>;
        this.cachedSettings = {
          ...DEFAULT_EMAIL_SETTINGS,
          ...data,
          adminEmail: data.adminEmail || DEFAULT_EMAIL_SETTINGS.adminEmail,
        };
        return this.cachedSettings;
      }
    } catch (err) {
      console.warn('[EmailNotificationService] Firestore getSettings notice, using default:', err);
    }

    // Try server API fallback
    try {
      const res = await fetch('/api/email/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          const loadedSettings: EmailNotificationSettings = {
            ...DEFAULT_EMAIL_SETTINGS,
            ...json.settings,
          };
          this.cachedSettings = loadedSettings;
          return loadedSettings;
        }
      }
    } catch {
      // Local fallback
    }

    const fallback: EmailNotificationSettings = { ...DEFAULT_EMAIL_SETTINGS };
    this.cachedSettings = fallback;
    return fallback;
  }

  /**
   * Saves updated email notification settings to Firestore and notifies server.
   */
  async saveSettings(settings: EmailNotificationSettings, updatedBy?: string): Promise<EmailNotificationSettings> {
    const updated: EmailNotificationSettings = {
      ...settings,
      adminEmail: settings.adminEmail.trim().toLowerCase(),
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Administrator',
    };

    this.cachedSettings = updated;

    try {
      const docRef = doc(db, EMAIL_SETTINGS_DOC_PATH, EMAIL_SETTINGS_DOC_ID);
      await setDoc(docRef, sanitizeForFirestore(updated), { merge: true });
    } catch (err) {
      console.warn('[EmailNotificationService] Firestore write settings notice:', err);
    }

    // Inform server endpoint
    try {
      await fetch('/api/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updated }),
      });
    } catch (e) {
      // Ignore server sync failure
    }

    return updated;
  }

  /**
   * Sends an automated email notification when a new ticket is submitted.
   * If email sending fails, resolves safely without throwing an exception.
   */
  async sendTicketCreatedNotification(
    ticket: Ticket,
    context?: {
      companyName?: string;
      departmentName?: string;
      assetSpecs?: string;
      appUrl?: string;
    }
  ): Promise<{ success: boolean; messageId?: string; recipient?: string; error?: string; previewUrl?: string }> {
    const settings = await this.getSettings();

    // Check if notification is enabled
    if (!settings.notifyAdminOnTicketCreated && !(settings.notifyAdminOnCriticalPriority && ticket.priority === 'critical')) {
      return { success: true, recipient: settings.adminEmail, error: 'Notification disabled in settings' };
    }

    const appUrl = context?.appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const directLink = `${appUrl}/?ticket=${ticket.id}`;

    const payload = {
      eventType: 'ticket_created',
      adminEmail: settings.adminEmail,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        requesterName: ticket.requesterName,
        requesterEmail: ticket.requesterEmail,
        companyName: context?.companyName || 'Not specified',
        departmentName: context?.departmentName || 'Not specified',
        assetTag: ticket.assetTag,
        assetSpecs: context?.assetSpecs,
        createdAt: ticket.createdAt,
        directLink,
      },
    };

    try {
      const response = await fetch('/api/email/send-ticket-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        this.recordDeliveryLog({
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          subject: `New Helpdesk Ticket: ${ticket.ticketNumber} – ${ticket.title}`,
          recipient: settings.adminEmail,
          eventType: 'ticket_created',
          status: data.simulated ? 'simulated' : 'delivered',
          messageId: data.messageId,
          previewUrl: data.previewUrl,
        });

        return {
          success: true,
          messageId: data.messageId,
          recipient: settings.adminEmail,
          previewUrl: data.previewUrl,
        };
      } else {
        const errorMsg = data.error || `Server responded with status ${response.status}`;
        this.recordDeliveryLog({
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          subject: `New Helpdesk Ticket: ${ticket.ticketNumber} – ${ticket.title}`,
          recipient: settings.adminEmail,
          eventType: 'ticket_created',
          status: 'failed',
          error: errorMsg,
        });

        return { success: false, error: errorMsg, recipient: settings.adminEmail };
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Network error attempting to send email notification';
      console.warn('[EmailNotificationService] Email delivery failed:', errorMsg);

      this.recordDeliveryLog({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: `New Helpdesk Ticket: ${ticket.ticketNumber} – ${ticket.title}`,
        recipient: settings.adminEmail,
        eventType: 'ticket_created',
        status: 'failed',
        error: errorMsg,
      });

      return { success: false, error: errorMsg, recipient: settings.adminEmail };
    }
  }

  /**
   * Sends a test email to verify the SMTP configuration and admin notification recipient.
   */
  async sendTestEmail(targetEmail?: string): Promise<{
    success: boolean;
    recipient: string;
    message?: string;
    error?: string;
    previewUrl?: string;
  }> {
    const settings = await this.getSettings();
    const recipient = targetEmail || settings.adminEmail;

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: recipient,
          settings,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        this.recordDeliveryLog({
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          subject: 'Test Notification: IT Helpdesk Email Integration Verified',
          recipient,
          eventType: 'test_email',
          status: data.simulated ? 'simulated' : 'delivered',
          messageId: data.messageId,
          previewUrl: data.previewUrl,
        });

        return {
          success: true,
          recipient,
          message: data.message || `Test email dispatched to ${recipient}`,
          previewUrl: data.previewUrl,
        };
      } else {
        const errorMsg = data.error || `Server failed with status ${response.status}`;
        return { success: false, recipient, error: errorMsg };
      }
    } catch (err: any) {
      return { success: false, recipient, error: err?.message || 'Failed to contact notification server' };
    }
  }

  /**
   * Returns recent email delivery logs for diagnostic and verification in Settings UI.
   */
  getDeliveryLogs(): EmailDeliveryLog[] {
    try {
      const raw = localStorage.getItem(EMAIL_LOGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }

  private recordDeliveryLog(log: EmailDeliveryLog) {
    try {
      const existing = this.getDeliveryLogs();
      const updated = [log, ...existing.filter((l) => l.id !== log.id)].slice(0, 100);
      localStorage.setItem(EMAIL_LOGS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  /**
   * Clears stored local email delivery diagnostic logs.
   */
  clearDeliveryLogs(): void {
    try {
      localStorage.removeItem(EMAIL_LOGS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Dispatches an assignment notification to the assigned technician if enabled in settings.
   */
  async sendTicketAssignedNotification(
    ticket: Ticket,
    techEmail: string,
    techName: string
  ): Promise<{ success: boolean; error?: string }> {
    const settings = await this.getSettings();
    if (!settings.notifyTechOnTicketAssigned || !techEmail) {
      return { success: true };
    }

    try {
      const response = await fetch('/api/email/send-ticket-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'ticket_assigned',
          customRecipient: techEmail,
          ticket: {
            ...ticket,
            assignedTechName: techName,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      return { success: response.ok && data.success, error: data.error };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  /**
   * Dispatches status update notification to ticket requester if enabled in settings.
   */
  async sendStatusChangedNotification(
    ticket: Ticket,
    newStatus: string
  ): Promise<{ success: boolean; error?: string }> {
    const settings = await this.getSettings();
    if (!settings.notifyRequesterOnStatusChange || !ticket.requesterEmail) {
      return { success: true };
    }

    try {
      const response = await fetch('/api/email/send-ticket-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'status_changed',
          customRecipient: ticket.requesterEmail,
          ticket: {
            ...ticket,
            status: newStatus,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      return { success: response.ok && data.success, error: data.error };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }
}

export const EmailNotificationService = new EmailNotificationServiceImpl();
export default EmailNotificationService;
