import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { EmailNotificationService } from '../../services/EmailNotificationService';
import { AuditLogService } from '../../services/AuditLogService';
import { TicketCategory, TicketPriority, TicketAttachment, Ticket } from '../../types';
import { AlertCircle, Paperclip, X, Upload } from 'lucide-react';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAssetId?: string;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ 
  isOpen, 
  onClose,
  defaultAssetId 
}) => {
  const { userProfile, activeRole } = useAuth();
  const { createTicket, updateTicket, computers, tickets, companies, departments } = useData();
  const { addNotification, showToast } = useNotifications();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('hardware');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [selectedAssetId, setSelectedAssetId] = useState(defaultAssetId || '');
  const [requesterName, setRequesterName] = useState(userProfile?.displayName || '');
  const [requesterEmail, setRequesterEmail] = useState(userProfile?.email || '');
  const [companyId, setCompanyId] = useState(userProfile?.companyId || companies[0]?.id || '');
  const [departmentId, setDepartmentId] = useState(userProfile?.departmentId || departments[0]?.id || '');
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync defaultAssetId when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (defaultAssetId) {
        setSelectedAssetId(defaultAssetId);
        setCategory('hardware');
        const assetObj = computers.find((c) => c.id === defaultAssetId);
        if (assetObj) {
          if (assetObj.assignedEmployeeName) {
            setRequesterName(assetObj.assignedEmployeeName);
          }
          if (assetObj.companyId) setCompanyId(assetObj.companyId);
          if (assetObj.departmentId) setDepartmentId(assetObj.departmentId);
        }
      } else {
        setSelectedAssetId('');
      }
    }
  }, [isOpen, defaultAssetId, computers]);

  // Generate ticket number
  const generateTicketNumber = () => {
    const nextSeq = 1000 + tickets.length + 1;
    return `TCK-${nextSeq}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newAttachment: TicketAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: reader.result as string,
          uploadedAt: new Date().toISOString(),
          uploadedByName: userProfile?.displayName || 'User',
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a ticket title.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please describe the issue in detail.');
      return;
    }
    if (!requesterEmail.trim()) {
      setErrorMsg('Requester email is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedComp = computers.find((c) => c.id === selectedAssetId);

      // SLA due date calculation based on priority
      const slaHours = priority === 'critical' ? 4 : priority === 'high' ? 12 : priority === 'medium' ? 48 : 96;
      const dueDate = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

      const ticketNo = generateTicketNumber();
      const newTicketId = await createTicket({
        ticketNumber: ticketNo,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status: 'open',
        requesterId: userProfile?.id || 'guest',
        requesterName: requesterName.trim() || userProfile?.displayName || 'User',
        requesterEmail: requesterEmail.trim() || userProfile?.email || '',
        companyId: companyId || undefined,
        departmentId: departmentId || undefined,
        assetId: selectedAssetId || undefined,
        assetTag: selectedComp?.assetTag || undefined,
        dueDate,
        attachments,
      });

      // Contextual metadata for email template
      const compName = companies.find((c) => c.id === companyId)?.name || 'Corporate';
      const deptName = departments.find((d) => d.id === departmentId)?.name || 'General Staff';
      const assetSpecs = selectedComp
        ? `${selectedComp.brand} ${selectedComp.model} (S/N: ${selectedComp.serialNumber || 'N/A'})`
        : undefined;

      const createdTicketData: Ticket = {
        id: newTicketId,
        ticketNumber: ticketNo,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status: 'open',
        requesterId: userProfile?.id || 'guest',
        requesterName: requesterName.trim() || userProfile?.displayName || 'User',
        requesterEmail: requesterEmail.trim() || userProfile?.email || '',
        companyId: companyId || undefined,
        departmentId: departmentId || undefined,
        assetId: selectedAssetId || undefined,
        assetTag: selectedComp?.assetTag || undefined,
        dueDate,
        attachments,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Dispatch automated email notification to administrator (non-blocking)
      try {
        const emailResult = await EmailNotificationService.sendTicketCreatedNotification(createdTicketData, {
          companyName: compName,
          departmentName: deptName,
          assetSpecs,
        });

        if (emailResult.success) {
          // Record successful email event in ticket activity timeline
          await updateTicket(newTicketId, {}, {
            type: 'notification_sent',
            actorName: 'System Email Dispatcher',
            actorRole: 'system',
            message: `Automated email notification dispatched to Administrator (${emailResult.recipient || 'Admin'})`,
          });

          // Record in dedicated administrative auditLogs collection
          AuditLogService.logAction({
            action: 'ticket_email_notification',
            actingUserId: userProfile?.id || 'system',
            actingUserName: userProfile?.displayName || requesterName.trim() || 'System Dispatcher',
            actingUserEmail: userProfile?.email || requesterEmail.trim(),
            actingUserRole: activeRole || 'employee',
            affectedAssetCount: selectedAssetId ? 1 : 0,
            details: `Dispatched automated ticket notification for #${ticketNo} to Admin (${emailResult.recipient})`,
            metadata: {
              ticketId: newTicketId,
              ticketNumber: ticketNo,
              recipient: emailResult.recipient,
              priority,
              messageId: emailResult.messageId,
            },
          }).catch((logErr) => console.warn('Audit log write notice:', logErr));

          showToast({
            title: 'Ticket Submitted',
            message: `Ticket #${ticketNo} created successfully. Admin alert sent to ${emailResult.recipient}.`,
            type: 'success',
          });
        } else {
          // Email dispatch failed: record notice in timeline and audit log, but keep ticket creation intact
          await updateTicket(newTicketId, {}, {
            type: 'notification_failed',
            actorName: 'System Email Dispatcher',
            actorRole: 'system',
            message: `Admin notification delivery notice: ${emailResult.error || 'Dispatch issue'}`,
          });

          AuditLogService.logAction({
            action: 'ticket_email_failed',
            actingUserId: userProfile?.id || 'system',
            actingUserName: userProfile?.displayName || 'System Dispatcher',
            actingUserEmail: userProfile?.email || requesterEmail.trim(),
            actingUserRole: activeRole || 'employee',
            affectedAssetCount: selectedAssetId ? 1 : 0,
            status: 'failure',
            details: `Admin email alert failed for #${ticketNo}: ${emailResult.error}`,
            metadata: {
              ticketId: newTicketId,
              ticketNumber: ticketNo,
              error: emailResult.error,
            },
          }).catch((logErr) => console.warn('Audit log write notice:', logErr));

          showToast({
            title: 'Ticket Created with Notice',
            message: `Ticket #${ticketNo} created successfully, but admin email alert could not be delivered (${emailResult.error || 'Server error'}).`,
            type: 'warning',
          });
        }
      } catch (emailErr: any) {
        console.warn('Email notification error:', emailErr);
        await updateTicket(newTicketId, {}, {
          type: 'notification_failed',
          actorName: 'System Email Dispatcher',
          actorRole: 'system',
          message: `Admin email delivery error: ${emailErr?.message || 'Network exception'}`,
        });

        showToast({
          title: 'Ticket Created',
          message: `Ticket #${ticketNo} created, but email notification alert failed to dispatch (${emailErr?.message || 'Check network'}).`,
          type: 'warning',
        });
      }

      if (priority === 'critical' || priority === 'high') {
        addNotification({
          title: 'High/Critical Ticket Created',
          message: `Ticket #${ticketNo} ("${title.trim()}") was logged with ${priority.toUpperCase()} priority.`,
          type: 'critical_ticket',
          severity: priority === 'critical' ? 'error' : 'warning',
          recipientRole: 'admin',
        });
      }

      // Reset & close
      setTitle('');
      setDescription('');
      setSelectedAssetId('');
      setAttachments([]);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit ticket. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Support Ticket"
      subtitle="Submit an IT service request or hardware incident inquiry"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Subject / Issue Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. MacBook Pro M3 display flickers or AWS read permissions needed"
            className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            required
          />
        </div>

        {/* Category & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            >
              <option value="hardware">Hardware Issue</option>
              <option value="software">Software / Application</option>
              <option value="network">Network & Wi-Fi / VPN</option>
              <option value="access">Access & Permissions / IAM</option>
              <option value="email">Email & Cloud Accounts</option>
              <option value="other">Other Inquiry</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Priority *
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors font-medium"
            >
              <option value="low">Low (General request • 96h SLA)</option>
              <option value="medium">Medium (Standard impact • 48h SLA)</option>
              <option value="high">High (Significant disruption • 12h SLA)</option>
              <option value="critical">Critical (Complete business blocker • 4h SLA)</option>
            </select>
          </div>
        </div>

        {/* Affected Hardware Asset */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Affected Computer / Hardware Asset (Optional)
          </label>
          <select
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
          >
            <option value="">No specific computer device</option>
            {computers.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.assetTag} - {comp.brand} {comp.model} (S/N: {comp.serialNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Detailed Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Issue Description & Steps to Reproduce *
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please detail what happened, any error messages displayed, and troubleshooting steps already attempted..."
            className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            required
          />
        </div>

        {/* Attachments Section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              Attachments (Screenshots, Logs, Files)
            </label>
            <label className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Add File</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-md border border-slate-200 text-xs shadow-2xs"
                >
                  <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-800 max-w-xs truncate">{att.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({Math.round(att.size / 1024)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-0.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              No files attached. You can attach error screenshots or diagnostic logs.
            </p>
          )}
        </div>

        {/* Requester & Company / Department Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Requester Name
            </label>
            <input
              type="text"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-colors"
              disabled={activeRole === 'employee'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Requester Email
            </label>
            <input
              type="email"
              value={requesterEmail}
              onChange={(e) => setRequesterEmail(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-colors"
              disabled={activeRole === 'employee'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Requester Company
            </label>
            <select
              value={companyId}
              onChange={(e) => {
                const newCoId = e.target.value;
                setCompanyId(newCoId);
                const currentDept = departments.find((d) => d.id === departmentId);
                const validDepts = departments.filter((d) => !newCoId || d.companyId === newCoId);
                const match = validDepts.find((d) => d.name.toLowerCase() === currentDept?.name.toLowerCase());
                if (match) {
                  setDepartmentId(match.id);
                } else if (departmentId && !validDepts.some((d) => d.id === departmentId)) {
                  setDepartmentId(validDepts[0]?.id || '');
                }
              }}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:border-indigo-600 transition-colors"
            >
              <option value="">-- No specific company --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Requester Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:border-indigo-600 transition-colors"
            >
              <option value="">-- No specific department --</option>
              {(companyId
                ? departments.filter((d) => d.companyId === companyId)
                : departments
              ).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {!companyId ? `(${companies.find((c) => c.id === d.companyId)?.name || ''})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
