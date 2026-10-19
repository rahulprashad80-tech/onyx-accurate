import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { EmailNotificationService } from '../../services/EmailNotificationService';
import { 
  Ticket, 
  TicketStatus, 
  TicketPriority, 
  TicketCategory,
  TicketComment, 
  TicketAttachment,
  Computer 
} from '../../types';
import { Badge } from '../common/Badge';
import { AuditInfo } from '../common/AuditInfo';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { 
  MessageSquare, 
  Send, 
  User, 
  Laptop, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Lock,
  AlertCircle,
  Paperclip,
  Upload,
  Download,
  History,
  CheckCircle2,
  XCircle,
  UserCheck,
  Edit2,
  Save,
  X,
  FileText,
  AlertTriangle,
  Mail,
} from 'lucide-react';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectComputer?: (computer: Computer) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onSelectComputer,
}) => {
  const { activeRole, userProfile } = useAuth();
  const { 
    updateTicket, 
    deleteTicket, 
    addTicketComment, 
    getTicketComments,
    addTicketAttachment,
    employees, 
    computers,
    companies,
    departments,
  } = useData();
  const { addNotification, showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'conversation' | 'timeline' | 'attachments'>('conversation');
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  
  // Quick status / priority / tech
  const [status, setStatus] = useState<TicketStatus>('open');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [assignedTechId, setAssignedTechId] = useState('');
  
  // Resolution notes
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolvingModalOpen, setIsResolvingModalOpen] = useState(false);

  // Edit Mode for ticket details
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<TicketCategory>('hardware');
  const [editAssetId, setEditAssetId] = useState('');

  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const canManage = activeRole === 'admin' || activeRole === 'technician';
  const isAdmin = activeRole === 'admin';
  const isRequester = ticket && (ticket.requesterEmail === userProfile?.email || ticket.requesterId === userProfile?.id);
  const canEditDetails = isAdmin || canManage || (isRequester && ticket?.status === 'open');

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status === 'pending_user' ? 'waiting_user' : ticket.status);
      setPriority(ticket.priority === 'urgent' ? 'critical' : ticket.priority);
      setAssignedTechId(ticket.assignedTechId || '');
      setResolutionNotes(ticket.resolutionNotes || '');
      setEditTitle(ticket.title);
      setEditDescription(ticket.description);
      setEditCategory(ticket.category);
      setEditAssetId(ticket.assetId || '');
      setIsEditingDetails(false);

      const unsubscribe = getTicketComments(ticket.id, (loadedComments) => {
        setComments(loadedComments);
      });
      return () => unsubscribe();
    }
  }, [ticket?.id]);

  if (!ticket) return null;

  const linkedComputer = ticket.assetId
    ? computers.find((c) => c.id === ticket.assetId)
    : null;

  const itStaff = employees.filter(
    (e) => e.role === 'admin' || e.role === 'technician'
  );

  // Check if ticket is overdue
  const isOverdue = (() => {
    if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
    if (ticket.dueDate) {
      return new Date(ticket.dueDate).getTime() < Date.now();
    }
    // Fallback: 48 hours SLA from createdAt
    return Date.now() - new Date(ticket.createdAt).getTime() > 48 * 3600 * 1000;
  })();

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setStatus(newStatus);
    const timelineEvent = {
      type: 'status_change' as const,
      actorName: userProfile?.displayName || 'User',
      actorRole: activeRole,
      message: `Status changed from ${formatStatusLabel(status)} to ${formatStatusLabel(newStatus)}`,
      oldValue: status,
      newValue: newStatus,
    };
    await updateTicket(ticket.id, { 
      status: newStatus,
      ...(newStatus === 'resolved' ? { resolvedAt: new Date().toISOString() } : {})
    }, timelineEvent);

    // Notify requester about status update
    addNotification({
      title: `Ticket ${newStatus === 'resolved' ? 'Resolved' : newStatus === 'closed' ? 'Closed' : 'Updated'}`,
      message: `Ticket #${ticket.ticketNumber} ("${ticket.title}") status changed to ${formatStatusLabel(newStatus)}.`,
      type: newStatus === 'resolved' ? 'ticket_resolved' : newStatus === 'closed' ? 'ticket_closed' : 'ticket_updated',
      severity: newStatus === 'resolved' ? 'success' : 'info',
      targetType: 'ticket',
      targetId: ticket.id,
      recipientEmail: ticket.requesterEmail,
    });

    // Automated transactional email notification to requester
    EmailNotificationService.sendStatusChangedNotification(ticket, newStatus).catch(() => {});
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    setPriority(newPriority);
    const timelineEvent = {
      type: 'priority_change' as const,
      actorName: userProfile?.displayName || 'User',
      actorRole: activeRole,
      message: `Priority updated from ${priority.toUpperCase()} to ${newPriority.toUpperCase()}`,
      oldValue: priority,
      newValue: newPriority,
    };
    await updateTicket(ticket.id, { priority: newPriority }, timelineEvent);

    if (newPriority === 'critical' || newPriority === 'urgent') {
      addNotification({
        title: 'Critical Ticket Escalation',
        message: `Ticket #${ticket.ticketNumber} was escalated to Critical urgency.`,
        type: 'critical_ticket',
        severity: 'error',
        targetType: 'ticket',
        targetId: ticket.id,
        recipientRole: 'admin',
      });
    }
  };

  const handleTechChange = async (newTechId: string) => {
    setAssignedTechId(newTechId);
    const tech = employees.find((e) => e.id === newTechId);
    const techName = tech ? tech.fullName : 'Unassigned';
    const timelineEvent = {
      type: 'assigned' as const,
      actorName: userProfile?.displayName || 'User',
      actorRole: activeRole,
      message: newTechId ? `Assigned to ${techName}` : 'Unassigned ticket',
      newValue: techName,
    };
    await updateTicket(ticket.id, {
      assignedTechId: newTechId || undefined,
      assignedTechName: tech ? tech.fullName : undefined,
    }, timelineEvent);

    // Notify technician about assignment
    if (newTechId && tech) {
      addNotification({
        title: 'Ticket Assigned to You',
        message: `Ticket #${ticket.ticketNumber} ("${ticket.title}") has been assigned to you.`,
        type: 'ticket_assigned',
        severity: 'info',
        targetType: 'ticket',
        targetId: ticket.id,
        recipientEmail: tech.email,
        recipientRole: 'technician',
      });
      showToast({
        title: 'Technician Assigned',
        message: `Ticket assigned to ${techName}`,
        type: 'success',
      });

      if (tech.email) {
        EmailNotificationService.sendTicketAssignedNotification(ticket, tech.email, tech.fullName).catch(() => {});
      }
    }
  };

  const handleAssignToMe = async () => {
    const currentEmp = employees.find((e) => e.email === userProfile?.email);
    const myName = currentEmp ? currentEmp.fullName : userProfile?.displayName || 'Current Technician';
    const myId = currentEmp ? currentEmp.id : userProfile?.id || 'tech-me';
    setAssignedTechId(myId);

    const timelineEvent = {
      type: 'assigned' as const,
      actorName: userProfile?.displayName || 'User',
      actorRole: activeRole,
      message: `Self-assigned by ${myName}`,
      newValue: myName,
    };
    await updateTicket(ticket.id, {
      assignedTechId: myId,
      assignedTechName: myName,
      ...(status === 'open' ? { status: 'in_progress' } : {}),
    }, timelineEvent);
    if (status === 'open') setStatus('in_progress');
    showToast({
      title: 'Ticket Self-Assigned',
      message: `You are now the lead technician on #${ticket.ticketNumber}`,
      type: 'success',
    });

    if (currentEmp?.email) {
      EmailNotificationService.sendTicketAssignedNotification(ticket, currentEmp.email, myName).catch(() => {});
    }
  };

  const handleSaveResolution = async () => {
    if (!resolutionNotes.trim()) return;
    setIsSavingChanges(true);
    const timelineEvent = {
      type: 'resolved' as const,
      actorName: userProfile?.displayName || 'User',
      actorRole: activeRole,
      message: `Resolved with notes: "${resolutionNotes.trim()}"`,
    };
    await updateTicket(ticket.id, {
      resolutionNotes: resolutionNotes.trim(),
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    }, timelineEvent);
    setStatus('resolved');
    setIsResolvingModalOpen(false);
    setIsSavingChanges(false);

    // Notify requester about resolution
    addNotification({
      title: 'Ticket Resolved',
      message: `Ticket #${ticket.ticketNumber} has been resolved by IT: "${resolutionNotes.trim()}"`,
      type: 'ticket_resolved',
      severity: 'success',
      targetType: 'ticket',
      targetId: ticket.id,
      recipientEmail: ticket.requesterEmail,
    });
    showToast({
      title: 'Ticket Resolved',
      message: `Resolution recorded for #${ticket.ticketNumber}`,
      type: 'success',
    });
  };

  const handleCloseTicket = async () => {
    const timelineEvent = {
      type: 'closed' as const,
      actorName: userProfile?.displayName || 'User',
      actorRole: activeRole,
      message: 'Ticket closed by IT operations',
      newValue: 'closed',
    };
    await updateTicket(ticket.id, { status: 'closed' }, timelineEvent);
    setStatus('closed');

    addNotification({
      title: 'Ticket Closed',
      message: `Ticket #${ticket.ticketNumber} is now officially closed.`,
      type: 'ticket_closed',
      severity: 'info',
      targetType: 'ticket',
      targetId: ticket.id,
      recipientEmail: ticket.requesterEmail,
    });
  };

  const handleReopenTicket = async () => {
    const timelineEvent = {
      type: 'reopened' as const,
      actorName: userProfile?.displayName || 'User',
      actorRole: activeRole,
      message: 'Ticket reopened for further action',
      newValue: 'in_progress',
    };
    await updateTicket(ticket.id, { status: 'in_progress' }, timelineEvent);
    setStatus('in_progress');
  };

  const handleSaveEditedDetails = async () => {
    if (!editTitle.trim() || !editDescription.trim()) return;
    setIsSavingChanges(true);
    const selectedComp = computers.find((c) => c.id === editAssetId);

    const timelineEvent = {
      type: 'edited' as const,
      actorName: userProfile?.displayName || 'User',
      actorRole: activeRole,
      message: 'Ticket details updated',
    };

    await updateTicket(ticket.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      category: editCategory,
      assetId: editAssetId || undefined,
      assetTag: selectedComp ? selectedComp.assetTag : undefined,
    }, timelineEvent);

    setIsEditingDetails(false);
    setIsSavingChanges(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const newAttachment: TicketAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: reader.result as string,
          uploadedAt: new Date().toISOString(),
          uploadedByName: userProfile?.displayName || 'User',
        };
        await addTicketAttachment(ticket.id, newAttachment);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setIsSendingComment(true);
      await addTicketComment(ticket.id, {
        authorId: userProfile?.id || 'guest',
        authorName: userProfile?.displayName || 'User',
        authorRole: activeRole,
        content: commentText.trim(),
        isInternal: canManage ? isInternal : false,
      });
      setCommentText('');
      setIsInternal(false);
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setIsSendingComment(false);
    }
  };

  const confirmDeleteTicketAction = async () => {
    try {
      setIsDeleting(true);
      await deleteTicket(ticket.id);
      showToast({
        title: 'Ticket Deleted',
        message: `Ticket #${ticket.ticketNumber} was deleted.`,
        type: 'info',
      });
      setIsDeleting(false);
      setIsConfirmDeleteOpen(false);
      onClose();
    } catch (err: any) {
      showToast({
        title: 'Delete Failed',
        message: err?.message || 'Could not delete ticket.',
        type: 'error',
      });
      setIsDeleting(false);
    }
  };

  function formatStatusLabel(st: string) {
    switch (st) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'waiting_user':
      case 'pending_user': return 'Waiting for User';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return st;
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${ticket.ticketNumber} • ${ticket.title}`}
      subtitle={`Submitted by ${ticket.requesterName} (${ticket.requesterEmail})`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Top Action & Status Control Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="ticketStatus" value={status} />
            <Badge variant="priority" value={priority} />

            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded ring-1 ring-rose-300 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Overdue SLA
              </span>
            )}
          </div>

          {/* Quick Action Buttons: Assign, Resolve, Close, Reopen */}
          <div className="flex flex-wrap items-center gap-1.5">
            {canManage && status !== 'resolved' && status !== 'closed' && (
              <>
                {ticket.assignedTechName !== (userProfile?.displayName) && (
                  <button
                    type="button"
                    onClick={handleAssignToMe}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Assign to Me</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsResolvingModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Resolve</span>
                </button>
              </>
            )}

            {canManage && status === 'resolved' && (
              <button
                type="button"
                onClick={handleCloseTicket}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-900 shadow-2xs transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Close Ticket</span>
              </button>
            )}

            {canManage && (status === 'resolved' || status === 'closed') && (
              <button
                type="button"
                onClick={handleReopenTicket}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-2xs transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Reopen</span>
              </button>
            )}

            {canEditDetails && !isEditingDetails && (
              <button
                type="button"
                onClick={() => setIsEditingDetails(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
              >
                <Edit2 className="w-3 h-3 text-slate-500" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Assignment / Status Dropdowns for Technicians and Admins */}
        {canManage && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white border border-slate-200 rounded-xl text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Update Status</label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                className="w-full text-xs font-medium rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_user">Waiting for User</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Update Priority</label>
              <select
                value={priority}
                onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                className="w-full text-xs font-medium rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Assigned Technician</label>
              <select
                value={assignedTechId}
                onChange={(e) => handleTechChange(e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Unassigned</option>
                {itStaff.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.fullName} ({tech.jobTitle})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Edit Details Form (inline) */}
        {isEditingDetails ? (
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900">Editing Ticket Information</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingDetails(false)}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedDetails}
                  disabled={isSavingChanges}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingChanges ? 'Saving...' : 'Save Edits'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Subject</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as TicketCategory)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white"
                >
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                  <option value="network">Network</option>
                  <option value="access">Access</option>
                  <option value="email">Email</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Affected Computer</label>
                <select
                  value={editAssetId}
                  onChange={(e) => setEditAssetId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white"
                >
                  <option value="">None</option>
                  {computers.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.assetTag} - {comp.brand} {comp.model}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Description</label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white"
              />
            </div>
          </div>
        ) : (
          /* Normal View of Description & Details */
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Description
              </h4>
              <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                {ticket.description}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Category</span>
                <span className="font-medium text-slate-900 capitalize">{ticket.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Requester</span>
                <span className="font-medium text-slate-900">{ticket.requesterName}</span>
                {(ticket.companyId || ticket.departmentId) && (
                  <span className="text-[11px] text-slate-500 block truncate">
                    {[
                      companies.find((c) => c.id === ticket.companyId)?.name,
                      departments.find((d) => d.id === ticket.departmentId)?.name,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Tech</span>
                <span className="font-medium text-slate-900">
                  {ticket.assignedTechName || <span className="text-slate-400 italic">Unassigned</span>}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">SLA Target Date</span>
                <span className={`font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                  {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }) : '48h Standard'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Affected Hardware Asset Card */}
        {linkedComputer && (
          <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-700">
                    {linkedComputer.assetTag}
                  </span>
                  <Badge variant="computerStatus" value={linkedComputer.status} size="sm" />
                </div>
                <p className="text-xs font-medium text-slate-800">
                  {linkedComputer.brand} {linkedComputer.model} ({linkedComputer.serialNumber})
                </p>
                <p className="text-[11px] text-slate-500">
                  {linkedComputer.os} • {linkedComputer.cpu} • {linkedComputer.ram}
                </p>
              </div>
            </div>

            {onSelectComputer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectComputer(linkedComputer);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2.5 py-1 rounded-md bg-white border border-indigo-200 cursor-pointer shadow-2xs"
              >
                Inspect Device Spec
              </button>
            )}
          </div>
        )}

        {/* Resolution Notes Box */}
        {(ticket.resolutionNotes || status === 'resolved' || status === 'closed') && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Resolution Notes
              </h4>
              {ticket.resolvedAt && (
                <span className="text-[11px] text-emerald-700">
                  Resolved on: {new Date(ticket.resolvedAt).toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-emerald-100">
              {ticket.resolutionNotes || 'Marked as resolved by IT Operations.'}
            </p>
          </div>
        )}

        {/* Sub-Tabs: Conversation, Timeline, Attachments */}
        <div className="border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('conversation')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 cursor-pointer transition-colors ${
              activeTab === 'conversation'
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comments & Notes ({comments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 cursor-pointer transition-colors ${
              activeTab === 'timeline'
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Ticket History & Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 cursor-pointer transition-colors ${
              activeTab === 'attachments'
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attachments ({ticket.attachments?.length || 0})</span>
          </button>
        </div>

        {/* Tab 1: Conversation / Comments */}
        {activeTab === 'conversation' && (
          <div className="space-y-3">
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg">
                  No comments yet on this ticket. Start the discussion below.
                </p>
              ) : (
                comments.map((c) => {
                  const isTechComment = c.authorRole === 'admin' || c.authorRole === 'technician';
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border text-xs leading-relaxed ${
                        c.isInternal
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                          : isTechComment
                          ? 'bg-indigo-50/40 border-indigo-100 text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{c.authorName}</span>
                          <Badge variant="role" value={c.authorRole} size="sm" />
                          {c.isInternal && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                              <Lock className="w-2.5 h-2.5" /> Internal Note
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400">
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-line">{c.content}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="pt-1">
              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Post a reply or update to this ticket..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                />
                <div className="flex items-center justify-between">
                  {canManage ? (
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                      />
                      <span className="text-[11px]">Internal staff note only</span>
                    </label>
                  ) : (
                    <div />
                  )}

                  <button
                    type="submit"
                    disabled={isSendingComment || !commentText.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingComment ? 'Posting...' : 'Reply'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Ticket Timeline & History */}
        {activeTab === 'timeline' && (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1 py-1">
            {(!ticket.timeline || ticket.timeline.length === 0) ? (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg">
                No history recorded for this ticket yet.
              </p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {ticket.timeline.map((evt) => {
                  const isNotificationSent = evt.type === 'notification_sent';
                  const isNotificationFailed = evt.type === 'notification_failed';
                  return (
                    <div key={evt.id} className="relative text-xs">
                      <div className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ${
                        isNotificationSent 
                          ? 'bg-emerald-500 ring-emerald-50' 
                          : isNotificationFailed 
                          ? 'bg-rose-500 ring-rose-50' 
                          : 'bg-indigo-600 ring-indigo-50'
                      }`}></div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800">{evt.actorName}</span>
                          <span className="text-slate-400">({evt.actorRole})</span>
                          {isNotificationSent && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Mail className="w-2.5 h-2.5" /> Email Dispatched
                            </span>
                          )}
                          {isNotificationFailed && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-2.5 h-2.5" /> Delivery Issue
                            </span>
                          )}
                        </div>
                        <span className="shrink-0">{new Date(evt.timestamp).toLocaleString()}</span>
                      </div>
                      <p className={`mt-0.5 ${
                        isNotificationSent 
                          ? 'text-emerald-900 font-medium' 
                          : isNotificationFailed 
                          ? 'text-rose-900 font-medium' 
                          : 'text-slate-700 font-medium'
                      }`}>{evt.message}</p>
                      {evt.oldValue && evt.newValue && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span className="line-through text-slate-400">{evt.oldValue}</span> →{' '}
                          <span className="text-indigo-600 font-semibold">{evt.newValue}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Attachments */}
        {activeTab === 'attachments' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Files attached to this service ticket ({ticket.attachments?.length || 0})
              </span>
              <label className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors border border-indigo-200">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New File</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {(!ticket.attachments || ticket.attachments.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                No attachments uploaded yet. Click above to attach screenshots or crash logs.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ticket.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{att.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {Math.round(att.size / 1024)} KB • By {att.uploadedByName}
                        </p>
                      </div>
                    </div>

                    {att.url && (
                      <a
                        href={att.url}
                        download={att.name}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                        title="Download Attachment"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Prompt for Resolving Ticket with Resolution Notes */}
        {isResolvingModalOpen && (
          <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 space-y-3 animate-in fade-in">
            <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Document Resolution Details
            </h4>
            <p className="text-xs text-emerald-800">
              Please enter the root cause analysis and resolution steps performed to solve this issue.
            </p>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Replaced faulty battery unit; updated user credentials; verified on-site."
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsResolvingModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveResolution}
                disabled={isSavingChanges || !resolutionNotes.trim()}
                className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {isSavingChanges ? 'Resolving...' : 'Confirm & Mark as Resolved'}
              </button>
            </div>
          </div>
        )}

        {/* Audit info bar & Admin Delete */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <AuditInfo createdAt={ticket.createdAt} updatedAt={ticket.updatedAt} />

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsConfirmDeleteOpen(true)}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Ticket'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirm Ticket Deletion Modal */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={confirmDeleteTicketAction}
        title="Delete Support Ticket"
        message={`Are you sure you want to permanently delete ticket #${ticket.ticketNumber} ("${ticket.title}")? This action will permanently remove the conversation and history log.`}
        confirmLabel="Delete Ticket"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </Modal>
  );
};
