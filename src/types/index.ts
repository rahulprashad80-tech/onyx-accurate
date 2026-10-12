export type UserRole = 'admin' | 'technician' | 'employee';

export type UserStatus = 'active' | 'inactive' | 'pending_approval';

export interface AppUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
  departmentId?: string;
  departmentName?: string;
  status: UserStatus;
  lastLoginDate?: string;
  createdAt: string;
  updatedAt: string;
  mustChangePassword?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  companyId?: string;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  username?: string;
}

export interface OrganizationAuditEntry {
  id: string;
  type: 'created' | 'updated' | 'archived' | 'restored' | 'reassigned' | 'deleted' | 'imported';
  actorName: string;
  actorRole: UserRole;
  message: string;
  timestamp: string;
  details?: string;
}

export interface SystemAuditLogEntry {
  id: string;
  timestamp: string;
  category: 'asset' | 'status' | 'ticket' | 'auth' | 'organization';
  action: string;
  actorName: string;
  actorRole: UserRole;
  targetType: 'computer' | 'ticket' | 'user' | 'company' | 'department';
  targetId?: string;
  targetLabel: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  phone: string;
  address: string;
  city?: string;
  country?: string;
  contactPerson?: string;
  notes?: string;
  website?: string;
  status: 'active' | 'inactive' | 'archived';
  auditHistory?: OrganizationAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  companyId: string;
  managerName?: string;
  headName?: string;
  email?: string;
  phone?: string;
  location?: string;
  floorLocation?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'archived';
  auditHistory?: OrganizationAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export type EmployeeStatus = 'active' | 'on_leave' | 'terminated';

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyId: string;
  departmentId: string;
  role: UserRole;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

export type ComputerType = 
  | 'desktop' 
  | 'laptop' 
  | 'monitor' 
  | 'printer' 
  | 'server' 
  | 'network_device' 
  | 'workstation' 
  | 'tablet' 
  | 'other';

export type ComputerCondition = 'new' | 'good' | 'fair' | 'damaged';

export type ComputerStatus = 
  | 'available' 
  | 'assigned' 
  | 'in_use' 
  | 'under_repair' 
  | 'maintenance' 
  | 'retired' 
  | 'lost';

export interface ComputerAttachment {
  id: string;
  name: string;
  category: 'invoice' | 'warranty' | 'photo' | 'other';
  size: number;
  type: string;
  url?: string;
  uploadedAt: string;
  uploadedByName: string;
}

export interface ComputerAuditEntry {
  id: string;
  type: 
    | 'created' 
    | 'assigned' 
    | 'unassigned' 
    | 'status_change' 
    | 'condition_change' 
    | 'retired' 
    | 'updated'
    | 'attachment_added';
  actorName: string;
  actorRole: UserRole;
  message: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
}

export interface Computer {
  id: string;
  assetTag: string;
  serialNumber: string;
  hostname?: string;
  type: ComputerType;
  brand: string;
  model: string;
  os?: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  specs?: string;
  purchaseDate?: string;
  purchaseCost?: string;
  warrantyExpiration?: string;
  vendor?: string;
  location?: string;
  condition: ComputerCondition;
  status: ComputerStatus;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  companyId?: string;
  departmentId?: string;
  assignedDate?: string;
  returnedDate?: string;
  attachments?: ComputerAttachment[];
  auditHistory?: ComputerAuditEntry[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TicketCategory = 'hardware' | 'software' | 'network' | 'access' | 'email' | 'other';
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'pending_user' | 'resolved' | 'closed';

export interface TicketAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadedAt: string;
  uploadedByName: string;
}

export interface TicketTimelineEvent {
  id: string;
  type:
    | 'created'
    | 'status_change'
    | 'assigned'
    | 'priority_change'
    | 'comment_added'
    | 'attachment_added'
    | 'resolved'
    | 'closed'
    | 'reopened'
    | 'edited';
  actorName: string;
  actorRole: UserRole;
  message: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  companyId?: string;
  departmentId?: string;
  assignedTechId?: string;
  assignedTechName?: string;
  assetId?: string;
  assetTag?: string;
  dueDate?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  attachments?: TicketAttachment[];
  timeline?: TicketTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  isInternal?: boolean;
  createdAt: string;
}
