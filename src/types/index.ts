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
  username?: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyId: string;
  companyName?: string;
  departmentId: string;
  departmentName?: string;
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
  assetTag: string; // 1. Asset ID / Asset Tag
  companyId?: string; // 2. Company ID
  company?: string; // 2b. Company Name
  type: ComputerType; // 3. Asset Type
  assetNumber?: string; // 4. Asset Number
  condition: ComputerCondition; // 5. Condition
  assignedEmployeeName?: string; // 6. Assigned Employee Name
  assetUserName?: string; // 7. Asset User Name / Custodian
  departmentId?: string; // 8. Department ID
  department?: string; // 8b. Department Name
  location?: string; // 9. Location
  ipAddress?: string; // 10. IP Adresss
  serialNumber: string; // 11. Serial Number
  brand: string; // 12. Manufacturer / Brand
  manufacturer?: string; // 12b. Manufacturer alias
  model: string; // 13. Model
  cpu?: string; // 14. Processor / CPU
  processor?: string; // 14b. Processor alias
  purchaseDate?: string; // 15. Purchase Date
  procurementType?: string; // 16. New (NH)/ Old (SH)
  newOrOld?: string; // 16b. NH / SH
  storage?: string; // 17. Storage
  ram?: string; // 18. RAM
  os?: string; // 19. WINDOWS VERSION / OS
  windowsVersion?: string; // 19b. Windows Version alias
  msOffice?: string; // 20. MSOFFICE
  escan?: string; // 21. ESCAN
  motherboard?: string; // 22. Motherboard
  display?: string; // 23. Display
  displaySize?: string; // 24. Display Size
  lanCard?: string; // 25. Lan Card
  upsBattery?: string; // 26. Ups/ Battery
  warrantyStart?: string; // 27. Warranty Start
  warrantyExpiration?: string; // 28. Warranty End / Expiry
  warrantyEnd?: string; // 28b. Warranty End alias

  // Existing additional operational fields
  hostname?: string;
  specs?: string;
  purchaseCost?: string;
  vendor?: string;
  status: ComputerStatus;
  assignedEmployeeId?: string;
  assignedDate?: string;
  returnedDate?: string;
  assignmentStatus?: 'matched' | 'pending' | 'multiple_matches' | string;
  attachments?: ComputerAttachment[];
  auditHistory?: ComputerAuditEntry[];
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Lifecycle, archive, and schema upgrade fields
  isArchived?: boolean;
  archivedAt?: string;
  archivedByName?: string;
  archivedReason?: string;
  schemaVersion?: number;
  customFields?: Record<string, any>; // Preserves any unknown columns from Excel
}

export type SnapshotOperationType = 
  | 'pre_import'
  | 'pre_bulk_delete'
  | 'pre_clear'
  | 'pre_bulk_update'
  | 'pre_upgrade'
  | 'pre_rollback'
  | 'manual_backup'
  | 'asset_rollback';

export type SnapshotStatus = 'active' | 'restored' | 'archived';

export interface InventorySnapshot {
  id: string;
  name: string;
  description: string;
  timestamp: string;
  createdByName: string;
  createdByEmail: string;
  createdByRole: UserRole;
  operationType: SnapshotOperationType;
  affectedCount: number;
  totalAssetsCount: number;
  scopeCompanyId?: string; // If undefined/null -> Organization-wide
  scopeCompanyName?: string;
  status: SnapshotStatus;
  availableRecoveryActions: ('full_restore' | 'selective_rollback' | 'deleted_recovery')[];
  assetsCount: number;
  assets: Computer[];
  schemaVersion: number;
  checksum?: string;
  isRestored?: boolean;
  restoredAt?: string;
  restoredByName?: string;
}

export interface InventoryAuditLog {
  id: string;
  timestamp: string;
  action: 
    | 'create_asset'
    | 'update_asset'
    | 'archive_asset'
    | 'restore_asset'
    | 'delete_asset'
    | 'bulk_archive'
    | 'bulk_update'
    | 'bulk_delete'
    | 'clear_inventory'
    | 'create_snapshot'
    | 'rollback_selected'
    | 'restore_full_snapshot'
    | 'restore_deleted_assets'
    | 'upgrade_schema'
    | 'import_excel'
    | 'export_excel';
  actorName: string;
  actorEmail: string;
  actorRole: UserRole;
  scope: string; // 'Organization-Wide' or company name
  affectedCount: number;
  affectedAssetIds?: string[];
  details: string;
  snapshotId?: string;
  status: 'success' | 'failure';
  metadata?: Record<string, any>;
}

export type AuditLogAction =
  | 'bulk_delete'
  | 'clear_inventory'
  | 'upgrade_schema'
  | 'inventory_upgrade'
  | 'snapshot_restore'
  | 'rollback_selected'
  | 'restore_full_snapshot'
  | 'restore_deleted_assets'
  | 'create_snapshot'
  | 'delete_snapshot'
  | 'bulk_archive'
  | 'bulk_update'
  | 'excel_import'
  | 'manual_backup'
  | string;

/**
 * Dedicated administrative audit log record persisted in the Firestore 'auditLogs' collection.
 * Tracks acting user ID, timestamp, affected asset count, and action metadata.
 */
export interface AuditLog {
  id: string;
  action: AuditLogAction;
  actingUserId: string;
  actingUserName?: string;
  actingUserEmail?: string;
  actingUserRole?: string;
  timestamp: string; // ISO 8601 string
  affectedAssetCount: number;
  details?: string;
  snapshotId?: string;
  scope?: string;
  affectedAssetIds?: string[];
  status?: 'success' | 'failure' | 'pending';
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface InventorySchemaField {
  key: string;
  label: string;
  category: 'core' | 'hardware' | 'software' | 'network' | 'lifecycle' | 'custom';
  description: string;
  dataType: 'string' | 'number' | 'date' | 'enum';
  isRequired?: boolean;
}

export interface SchemaUpgradePreview {
  currentVersion: number;
  targetVersion: number;
  totalAssets: number;
  addedFields: string[];
  modifiedFields: string[];
  normalizedCount: number;
  backfilledCount: number;
  preservedUnknownCount: number;
  sampleUpgradedAssets: Computer[];
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
    | 'edited'
    | 'notification_sent'
    | 'notification_failed';
  actorName: string;
  actorRole: UserRole | 'system';
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

export interface EmailNotificationSettings {
  adminEmail: string;
  senderName?: string;
  senderEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  notifyAdminOnTicketCreated: boolean;
  notifyTechOnTicketAssigned: boolean;
  notifyRequesterOnStatusChange: boolean;
  notifyAdminOnCriticalPriority: boolean;
  notifyAdminOnOverdue: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface EmailDeliveryLog {
  id: string;
  timestamp: string;
  ticketId?: string;
  ticketNumber?: string;
  subject: string;
  recipient: string;
  eventType: 'ticket_created' | 'ticket_assigned' | 'status_changed' | 'critical_ticket' | 'overdue' | 'test_email';
  status: 'delivered' | 'failed' | 'simulated';
  error?: string;
  messageId?: string;
  previewUrl?: string;
}
