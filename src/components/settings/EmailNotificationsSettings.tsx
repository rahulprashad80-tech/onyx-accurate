import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { EmailNotificationService } from '../../services/EmailNotificationService';
import { AuditLogService } from '../../services/AuditLogService';
import { EmailNotificationSettings, EmailDeliveryLog } from '../../types';
import { 
  Mail, 
  Send, 
  Check, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink, 
  Server, 
  Bell, 
  Trash2,
  Lock,
  ArrowRight
} from 'lucide-react';

export const EmailNotificationsSettings: React.FC = () => {
  const { activeRole, currentUser, userProfile } = useAuth();
  const { showToast } = useNotifications();

  const isAdmin = activeRole === 'admin';

  const [settings, setSettings] = useState<EmailNotificationSettings>({
    adminEmail: 'rahulprashad80@gmail.com',
    senderName: 'IT Helpdesk System',
    senderEmail: 'notifications@company.internal',
    notifyAdminOnTicketCreated: true,
    notifyTechOnTicketAssigned: true,
    notifyRequesterOnStatusChange: true,
    notifyAdminOnCriticalPriority: true,
    notifyAdminOnOverdue: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Test Email state
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    previewUrl?: string;
    recipient?: string;
  } | null>(null);

  // Delivery Logs
  const [deliveryLogs, setDeliveryLogs] = useState<EmailDeliveryLog[]>([]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    refreshLogs();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const loaded = await EmailNotificationService.getSettings();
      setSettings(loaded);
      setTestRecipient(loaded.adminEmail || currentUser?.email || 'rahulprashad80@gmail.com');
    } catch (err: any) {
      console.warn('Failed to load email settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLogs = () => {
    const logs = EmailNotificationService.getDeliveryLogs();
    setDeliveryLogs(logs);
  };

  const handleClearLogs = () => {
    EmailNotificationService.clearDeliveryLogs();
    setDeliveryLogs([]);
    showToast({
      title: 'Logs Cleared',
      message: 'Email delivery audit logs cleared from local diagnostic storage.',
      type: 'info',
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMsg('Administrator privileges are required to update email notification routing.');
      return;
    }

    const emailToSave = settings.adminEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToSave)) {
      setErrorMsg('Please enter a valid administrator email address (e.g. admin@company.com).');
      return;
    }

    setErrorMsg('');
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updated = await EmailNotificationService.saveSettings(
        {
          ...settings,
          adminEmail: emailToSave,
        },
        currentUser?.fullName || userProfile?.displayName || 'Administrator'
      );

      setSettings(updated);
      setSaveSuccess(true);

      // Record administrative action in Firestore auditLogs collection
      await AuditLogService.logAction({
        action: 'update_email_settings',
        actingUserId: currentUser?.id || 'admin',
        actingUserName: currentUser?.fullName || userProfile?.displayName || 'Administrator',
        actingUserEmail: currentUser?.email || '',
        actingUserRole: activeRole,
        affectedAssetCount: 0,
        details: `Updated Admin Notification Email to ${updated.adminEmail}`,
        metadata: {
          newAdminEmail: updated.adminEmail,
          notifyAdminOnTicketCreated: updated.notifyAdminOnTicketCreated,
          notifyTechOnTicketAssigned: updated.notifyTechOnTicketAssigned,
          notifyRequesterOnStatusChange: updated.notifyRequesterOnStatusChange,
          notifyAdminOnCriticalPriority: updated.notifyAdminOnCriticalPriority,
          notifyAdminOnOverdue: updated.notifyAdminOnOverdue,
        },
      });

      showToast({
        title: 'Settings Saved',
        message: `Admin notification address updated to ${updated.adminEmail}.`,
        type: 'success',
      });

      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to persist settings. Please verify connectivity.');
      showToast({
        title: 'Save Failed',
        message: err?.message || 'Could not save notification settings.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    const target = testRecipient.trim() || settings.adminEmail;
    if (!target) {
      showToast({
        title: 'Recipient Required',
        message: 'Please enter an email address to send the test notification.',
        type: 'warning',
      });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await EmailNotificationService.sendTestEmail(target);
      setTestResult(res);
      refreshLogs();

      if (res.success) {
        showToast({
          title: 'Test Email Dispatched',
          message: `Verification message sent to ${res.recipient}.`,
          type: 'success',
        });
      } else {
        showToast({
          title: 'Test Email Notice',
          message: res.error || 'Test notification could not be delivered.',
          type: 'warning',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        recipient: target,
        error: err?.message || 'Failed to dispatch test notification.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleUseMyEmail = () => {
    const myEmail = currentUser?.email || userProfile?.email;
    if (myEmail) {
      setSettings((prev) => ({ ...prev, adminEmail: myEmail }));
      setTestRecipient(myEmail);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Banner */}
      <div className="p-5 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-white to-sky-50/40 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Email Notifications & Automated Alerts</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Automatically dispatch email notifications to administrators, technicians, and employees upon ticket lifecycle events.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadSettings}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-slate-200 bg-slate-50 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Settings</span>
          </button>
        </div>

        {/* Security architecture notice */}
        <div className="mt-4 pt-3 border-t border-indigo-100/60 flex items-center gap-2 text-[11px] text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Secure Architecture:</strong> SMTP credentials and email API keys are kept strictly in server environment variables and are never exposed to the frontend browser.
          </span>
        </div>
      </div>

      {/* Non-admin notice */}
      {!isAdmin && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 text-xs flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold">Administrator Privileges Required</p>
            <p className="text-amber-800 text-[11px] mt-0.5">
              You are currently viewing settings in read-only mode ({activeRole} persona). Switch to an Administrator persona to update notification addresses and event triggers.
            </p>
          </div>
        </div>
      )}

      {/* Primary Configuration Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Card 1: Admin Notification Email Address */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                Admin Notification Email Address
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Every newly created ticket across the organization will be dispatched to this inbox.
              </p>
            </div>
            {settings.updatedAt && (
              <span className="text-[10px] text-slate-400">
                Last modified: {new Date(settings.updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Notification settings successfully updated and saved to secure application settings.</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Admin Notification Email Address *
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                  placeholder="e.g. rahulprashad80@gmail.com or admin@company.com"
                  disabled={!isAdmin || isSaving}
                  className="w-full text-xs font-mono rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                  required
                />
              </div>

              {isAdmin && currentUser?.email && currentUser.email !== settings.adminEmail && (
                <button
                  type="button"
                  onClick={handleUseMyEmail}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white transition-colors cursor-pointer shrink-0"
                >
                  <span>Use my address</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              This address receives instant alerts when any employee logs a service request, hardware issue, or incident.
            </p>
          </div>

          {/* Optional Event Notification Triggers */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Automated Notification Triggers & Routing
            </h5>
            <p className="text-[11px] text-slate-500">
              Select which lifecycle events trigger automated transactional notifications:
            </p>

            <div className="space-y-3 pt-1">
              {/* Trigger 1: Ticket Created */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyAdminOnTicketCreated}
                  onChange={(e) => setSettings({ ...settings, notifyAdminOnTicketCreated: e.target.checked })}
                  disabled={!isAdmin}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    Notify admin when a ticket is created (Primary)
                  </span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    Automatically sends an email notification to the Admin email address with full ticket specifications whenever any user creates a new ticket.
                  </span>
                </div>
              </label>

              {/* Trigger 2: Ticket Assigned */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyTechOnTicketAssigned}
                  onChange={(e) => setSettings({ ...settings, notifyTechOnTicketAssigned: e.target.checked })}
                  disabled={!isAdmin}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    Notify assigned technician when a ticket is assigned
                  </span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    Dispatches an assignment alert to the technician's corporate email address when assigned to an open ticket.
                  </span>
                </div>
              </label>

              {/* Trigger 3: Status Changed */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyRequesterOnStatusChange}
                  onChange={(e) => setSettings({ ...settings, notifyRequesterOnStatusChange: e.target.checked })}
                  disabled={!isAdmin}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    Notify requester when ticket status changes
                  </span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    Sends progress updates, waiting-on-user inquiries, and resolution notes directly to the employee who submitted the ticket.
                  </span>
                </div>
              </label>

              {/* Trigger 4: Critical Priority */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyAdminOnCriticalPriority}
                  onChange={(e) => setSettings({ ...settings, notifyAdminOnCriticalPriority: e.target.checked })}
                  disabled={!isAdmin}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    Notify admin for Critical priority tickets
                  </span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    High-urgency escalation dispatch with prominent severity badges and emergency tags for business-stopping blockers.
                  </span>
                </div>
              </label>

              {/* Trigger 5: Overdue Tickets */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyAdminOnOverdue}
                  onChange={(e) => setSettings({ ...settings, notifyAdminOnOverdue: e.target.checked })}
                  disabled={!isAdmin}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    Notify admin for overdue tickets
                  </span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    Alerts administrators when tickets breach SLA deadlines without resolution.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Form Submit */}
          {isAdmin && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Configuration...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Notification Settings</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Card 2: Verify Configuration & Test Email */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" />
              Verify Configuration & Test Email
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Send a test transactional notification to verify SMTP delivery and HTML email rendering.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
            <Server className="w-3 h-3 text-slate-500" />
            Port 3000 API
          </span>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Target Test Recipient Email
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="Enter recipient to test..."
              className="flex-1 text-xs font-mono rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSendingTest ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching Test...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Email</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              testResult.success
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/80 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Test Notification Dispatched Successfully</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Test Email Delivery Notice</span>
                  </>
                )}
              </div>
              <span className="font-mono text-[10px] text-slate-500">
                To: {testResult.recipient}
              </span>
            </div>

            <p className="text-[11px] opacity-90">
              {testResult.success
                ? testResult.message || `Dispatched to ${testResult.recipient} via transactional email transport.`
                : testResult.error}
            </p>

            {testResult.previewUrl && (
              <div className="pt-2">
                <a
                  href={testResult.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 shadow-xs transition-colors"
                >
                  <span>Inspect Rendered Email in Web Browser (Ethereal Preview)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card 3: Live Notification Delivery Activity Log */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Recent Notification Audit Log
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit timeline of automated ticket alerts dispatched by this system.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshLogs}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
              title="Refresh log"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {deliveryLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {deliveryLogs.length === 0 ? (
          <div className="p-6 text-center rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-400">
            <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-slate-600">No email alerts dispatched yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              When tickets are created or test messages are sent, activity will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Subject / Ticket</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveryLogs.map((log) => {
                  const isDelivered = log.status === 'delivered' || log.status === 'simulated';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                          {log.eventType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-800 font-medium">
                        {log.subject}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {log.recipient}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isDelivered
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isDelivered ? (
                            <>
                              <Check className="w-2.5 h-2.5" /> Delivered
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-2.5 h-2.5" /> Failed
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {log.previewUrl ? (
                          <a
                            href={log.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {log.messageId ? log.messageId.slice(0, 12) : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
