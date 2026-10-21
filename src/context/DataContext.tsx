import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  Company, 
  Department, 
  Employee, 
  EmployeeStatus,
  Computer, 
  ComputerAttachment,
  ComputerAuditEntry,
  ComputerCondition,
  ComputerStatus,
  ComputerType,
  OrganizationAuditEntry,
  InventorySnapshot,
  InventoryAuditLog,
  AuditLog,
  SnapshotOperationType,
  SchemaUpgradePreview,
  Ticket, 
  TicketComment,
  TicketAttachment,
  TicketTimelineEvent,
  TicketStatus,
  TicketPriority,
  UserRole,
  Location,
} from '../types';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { sanitizeForFirestore, sanitizeForFirestoreUpdate } from '../firebase/utils';
import { MASTER_COMPANIES, MASTER_DEPARTMENTS, MASTER_LOCATIONS } from '../constants/masterData';
import { useAuth } from './AuthContext';
import { AuditLogService, RecordActionParams } from '../services/AuditLogService';

// Demo / sample identifier sets for permanent purge of legacy sample data
export const DEMO_COMPANY_IDS = new Set([
  "comp-acme-corp",
  "comp-globex-media",
  "comp-initech-logistics",
  "comp-apex-ventures",
]);

export const DEMO_DEPARTMENT_IDS = new Set([
  "dept-exec",
  "dept-it-ops",
  "dept-engineering",
  "dept-product",
  "dept-finance",
  "dept-ops-intc",
]);

export const DEMO_EMPLOYEE_IDS = new Set([
  "emp-sarah",
  "emp-alex",
  "emp-elena",
  "emp-david",
  "emp-marcus",
  "emp-rahul",
]);

export const DEMO_COMPUTER_IDS = new Set([
  "comp-ast-101",
  "comp-ast-102",
  "comp-ast-103",
  "comp-ast-104",
  "comp-ast-105",
  "comp-ast-106",
  "comp-ast-107",
  "comp-ast-108",
  "comp-ast-109",
  "comp-ast-110",
  "comp-ast-111",
]);

export const DEMO_TICKET_IDS = new Set([
  "tck-1001",
  "tck-1002",
  "tck-1003",
  "tck-1004",
  "tck-1005",
  "tck-1006",
]);

interface DataContextType {
  companies: Company[];
  departments: Department[];
  employees: Employee[];
  computers: Computer[];
  tickets: Ticket[];
  isLoading: boolean;
  error: string | null;

  // Tickets
  createTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTicket: (id: string, updates: Partial<Ticket>, timelineEvent?: Omit<TicketTimelineEvent, 'id' | 'timestamp'>) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  addTicketComment: (ticketId: string, comment: Omit<TicketComment, 'id' | 'ticketId' | 'createdAt'>) => Promise<void>;
  getTicketComments: (ticketId: string, callback: (comments: TicketComment[]) => void) => () => void;
  addTicketAttachment: (ticketId: string, attachment: TicketAttachment) => Promise<void>;
  addTimelineEvent: (ticketId: string, event: Omit<TicketTimelineEvent, 'id' | 'timestamp'>) => Promise<void>;

  // Computers
  createComputer: (
    computer: Omit<Computer, 'id' | 'createdAt' | 'updatedAt'>,
    auditEntry?: Omit<ComputerAuditEntry, 'id' | 'timestamp'>
  ) => Promise<string>;
  updateComputer: (id: string, updates: Partial<Computer>, auditEntry?: Omit<ComputerAuditEntry, 'id' | 'timestamp'>) => Promise<void>;
  deleteComputer: (id: string) => Promise<void>;
  assignComputer: (
    id: string,
    employeeId: string,
    employeeName: string,
    companyId?: string,
    departmentId?: string,
    assignedDate?: string,
    actor?: { name: string; role: UserRole }
  ) => Promise<void>;
  unassignComputer: (
    id: string,
    returnedDate?: string,
    condition?: ComputerCondition,
    notes?: string,
    actor?: { name: string; role: UserRole }
  ) => Promise<void>;
  retireComputer: (
    id: string,
    reason?: string,
    actor?: { name: string; role: UserRole }
  ) => Promise<void>;
  addComputerAttachment: (
    id: string,
    attachment: ComputerAttachment,
    actor?: { name: string; role: UserRole }
  ) => Promise<void>;
  addComputerAuditEntry: (
    id: string,
    entry: Omit<ComputerAuditEntry, 'id' | 'timestamp'>
  ) => Promise<void>;

  // Companies
  createCompany: (
    company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { name: string; role: UserRole }
  ) => Promise<string>;
  updateCompany: (
    id: string,
    updates: Partial<Company>,
    auditEntry?: Omit<OrganizationAuditEntry, 'id' | 'timestamp'>
  ) => Promise<void>;
  deleteCompany: (id: string, actor?: { name: string; role: UserRole }) => Promise<void>;
  archiveCompany: (id: string, actor?: { name: string; role: UserRole }) => Promise<void>;
  restoreCompany: (id: string, actor?: { name: string; role: UserRole }) => Promise<void>;
  reassignCompanyRecords: (
    sourceCompanyId: string,
    targetCompanyId: string,
    actor?: { name: string; role: UserRole }
  ) => Promise<void>;

  // Departments
  createDepartment: (
    department: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { name: string; role: UserRole }
  ) => Promise<string>;
  updateDepartment: (
    id: string,
    updates: Partial<Department>,
    auditEntry?: Omit<OrganizationAuditEntry, 'id' | 'timestamp'>
  ) => Promise<void>;
  deleteDepartment: (id: string, actor?: { name: string; role: UserRole }) => Promise<void>;
  archiveDepartment: (id: string, actor?: { name: string; role: UserRole }) => Promise<void>;
  restoreDepartment: (id: string, actor?: { name: string; role: UserRole }) => Promise<void>;
  reassignDepartmentRecords: (
    sourceDeptId: string,
    targetDeptId: string,
    actor?: { name: string; role: UserRole }
  ) => Promise<void>;
  organizationAuditLog: OrganizationAuditEntry[];
  addOrganizationAuditEntry: (entry: Omit<OrganizationAuditEntry, 'id'>) => Promise<void>;

  // Employees
  createEmployee: (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  // Physical Locations
  locations: Location[];
  createLocation: (
    location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { name: string; role: UserRole }
  ) => Promise<string>;
  updateLocation: (
    id: string,
    updates: Partial<Location>,
    actor?: { name: string; role: UserRole }
  ) => Promise<void>;
  deleteLocation: (id: string, actor?: { name: string; role: UserRole }) => Promise<void>;

  // Inventory Administration, Snapshots & Rollbacks
  inventorySnapshots: InventorySnapshot[];
  inventoryAuditLogs: InventoryAuditLog[];
  auditLogs: AuditLog[];
  recordAuditLog: (params: RecordActionParams) => Promise<AuditLog>;
  createInventorySnapshot: (params: {
    name: string;
    description: string;
    operationType: SnapshotOperationType;
    scopeCompanyId?: string;
    scopeCompanyName?: string;
    assetsToSnapshot?: Computer[];
    reason?: string;
  }) => Promise<string>;
  rollbackSelectedAssets: (
    snapshotId: string,
    assetIdsToRestore: string[],
    reason?: string
  ) => Promise<{ restoredCount: number }>;
  restoreFullInventorySnapshot: (
    snapshotId: string,
    previewOnly?: boolean
  ) => Promise<{ restoredCount: number; updatedCount: number; removedCount: number }>;
  restoreDeletedAssets: (
    snapshotId: string,
    assetIdsToRecover: string[]
  ) => Promise<{ recoveredCount: number }>;
  deleteInventorySnapshot: (snapshotId: string) => Promise<void>;

  // Inventory Bulk Operations
  bulkArchiveAssets: (assetIds: string[], reason?: string) => Promise<number>;
  bulkDeleteAssets: (assetIds: string[], confirmationWord: string, reason?: string) => Promise<number>;
  clearAllInventory: (confirmationWord: string, reason?: string, targetCompanyId?: string) => Promise<number>;
  bulkUpdateAssets: (
    assetIds: string[],
    updates: Partial<Computer>,
    reason?: string
  ) => Promise<number>;

  // Safe Schema Upgrade
  upgradeInventorySchema: (targetVersion?: number) => Promise<{
    success: boolean;
    upgradedCount: number;
    preview: SchemaUpgradePreview;
  }>;

  // Seeding
  seedDatabase: (force?: boolean) => Promise<void>;
  isSeeding: boolean;
  isLiveSync: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const getDefaultCompanies = (): Company[] => {
  const now = new Date().toISOString();
  return MASTER_COMPANIES.map((mc) => ({
    id: mc.id,
    name: mc.name,
    code: mc.code,
    contactEmail: mc.contactEmail,
    phone: '',
    address: '',
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  }));
};

const getDefaultDepartments = (): Department[] => {
  const now = new Date().toISOString();
  const list: Department[] = [];
  for (const mc of MASTER_COMPANIES) {
    for (const dName of MASTER_DEPARTMENTS) {
      const slug = dName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      list.push({
        id: `dept-${mc.name.toLowerCase()}-${slug}`,
        name: dName,
        code: dName.length <= 4 ? dName : undefined,
        companyId: mc.id,
        status: 'active' as const,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  return list;
};

const getDefaultLocations = (): Location[] => {
  const now = new Date().toISOString();
  return MASTER_LOCATIONS.map((ml) => ({
    id: ml.id,
    name: ml.name,
    code: ml.code,
    building: ml.building,
    floor: ml.floor,
    room: ml.room || '',
    address: ml.address || '',
    description: ml.description || '',
    status: ml.status,
    createdAt: now,
    updatedAt: now,
  }));
};

const getInitialEmployees = (): Employee[] => {
  try {
    const raw = localStorage.getItem('it_desk_local_users_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((u: any) => ({
          id: u.id,
          fullName: u.fullName || u.username,
          username: u.username ? String(u.username).trim() : undefined,
          email: u.email || '',
          phone: u.phone || '',
          jobTitle: u.jobTitle || (u.role === 'admin' ? 'Administrator' : u.role === 'technician' ? 'IT Specialist' : (u.departmentName ? `${u.departmentName} Staff` : 'Staff Member')),
          companyId: u.companyId || '',
          companyName: u.companyName || '',
          departmentId: u.departmentId || '',
          departmentName: u.departmentName || '',
          role: (u.role || 'employee') as UserRole,
          status: (u.status === 'active' ? 'active' : 'on_leave') as EmployeeStatus,
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        }));
      }
    }
  } catch (e) {
    console.warn('Initial employees parse notice:', e);
  }
  return [];
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>(getDefaultCompanies);
  const [departments, setDepartments] = useState<Department[]>(getDefaultDepartments);
  const [locations, setLocations] = useState<Location[]>(getDefaultLocations);
  const [employees, setEmployees] = useState<Employee[]>(getInitialEmployees);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<string, TicketComment[]>>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiveSync, setIsLiveSync] = useState<boolean>(false);

  const [organizationAuditLog, setOrganizationAuditLog] = useState<OrganizationAuditEntry[]>([]);
  const [inventorySnapshots, setInventorySnapshots] = useState<InventorySnapshot[]>([]);
  const [inventoryAuditLogs, setInventoryAuditLogs] = useState<InventoryAuditLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // 1. Immediately subscribe to public companies, departments & locations master data (no auth required)
  useEffect(() => {
    const unsubCompanies = onSnapshot(
      collection(db, 'companies'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Company[] = [];
          snapshot.forEach((d) => {
            if (DEMO_COMPANY_IDS.has(d.id)) {
              deleteDoc(doc(db, 'companies', d.id)).catch(() => {});
            } else {
              list.push({ id: d.id, ...d.data() } as Company);
            }
          });
          if (list.length > 0) {
            list.sort((a, b) => a.name.localeCompare(b.name));
            setCompanies(list);
          }
        }
      },
      (err) => {
        console.warn('Companies snapshot notice:', err);
      }
    );

    const unsubDepartments = onSnapshot(
      collection(db, 'departments'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Department[] = [];
          snapshot.forEach((d) => {
            if (DEMO_DEPARTMENT_IDS.has(d.id)) {
              deleteDoc(doc(db, 'departments', d.id)).catch(() => {});
            } else {
              list.push({ id: d.id, ...d.data() } as Department);
            }
          });
          if (list.length > 0) {
            list.sort((a, b) => a.name.localeCompare(b.name));
            setDepartments(list);
          }
        }
      },
      (err) => {
        console.warn('Departments snapshot notice:', err);
      }
    );

    const unsubLocations = onSnapshot(
      collection(db, 'locations'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Location[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Location);
          });
          if (list.length > 0) {
            list.sort((a, b) => a.name.localeCompare(b.name));
            setLocations(list);
          }
        }
      },
      (err) => {
        console.warn('Locations snapshot notice:', err);
      }
    );

    // Auto-verify and write master data to Firestore without duplicates
    ensureMasterDataInFirestore().catch((err) => {
      console.warn('Master data auto-sync notice:', err);
    });

    return () => {
      unsubCompanies();
      unsubDepartments();
      unsubLocations();
    };
  }, []);

  useEffect(() => {
    // Only attach operational data listeners if auth is ready and user is authenticated
    if (authLoading) {
      return;
    }

    if (!currentUser) {
      setIsLiveSync(false);
      setIsLoading(false);
      return;
    }

    // Authenticated user: Attach onSnapshot listeners to Firestore for operational data
    setIsLiveSync(true);
    setIsLoading(true);

    // Unify accounts from app_users and employees so that employee dropdowns & import auto-assignment have complete data
    let currentAppUsers: any[] = [];
    let currentEmployees: Employee[] = [];

    const rebuildUnifiedEmployees = () => {
      const empMap = new Map<string, Employee>();

      // 1. Process app_users first (real user accounts with document IDs and usernames)
      for (const u of currentAppUsers) {
        if (!u.id) continue;
        const empItem: Employee = {
          id: u.id,
          fullName: u.fullName || u.username || 'User',
          username: u.username ? String(u.username).trim() : undefined,
          email: u.email || '',
          phone: u.phone || '',
          jobTitle: u.jobTitle || (u.role === 'admin' ? 'Administrator' : u.role === 'technician' ? 'IT Specialist' : (u.departmentName ? `${u.departmentName} Staff` : 'Staff Member')),
          companyId: u.companyId || '',
          companyName: u.companyName || '',
          departmentId: u.departmentId || '',
          departmentName: u.departmentName || '',
          role: (u.role || 'employee') as UserRole,
          status: (u.status === 'active' ? 'active' : 'on_leave') as EmployeeStatus,
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        };
        empMap.set(u.id, empItem);
      }

      // 2. Process records from 'employees' collection
      for (const e of currentEmployees) {
        if (!e.id) continue;
        let matchedKey: string | null = null;
        if (empMap.has(e.id)) {
          matchedKey = e.id;
        } else {
          for (const [key, existing] of empMap.entries()) {
            if (
              (e.username && existing.username && e.username.trim().toLowerCase() === existing.username.trim().toLowerCase()) ||
              (e.email && existing.email && e.email.trim().toLowerCase() === existing.email.trim().toLowerCase())
            ) {
              matchedKey = key;
              break;
            }
          }
        }

        if (matchedKey) {
          const existing = empMap.get(matchedKey)!;
          empMap.set(matchedKey, {
            ...existing,
            ...e,
            id: existing.id || e.id,
            username: existing.username || e.username,
            fullName: existing.fullName || e.fullName,
            phone: e.phone || existing.phone,
            jobTitle: e.jobTitle || existing.jobTitle,
          });
        } else {
          empMap.set(e.id, e);
        }
      }

      const mergedList = Array.from(empMap.values());
      mergedList.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setEmployees(mergedList);
    };

    const unsubAppUsers = onSnapshot(
      collection(db, 'app_users'),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
        currentAppUsers = list;
        rebuildUnifiedEmployees();
      },
      (err) => {
        console.warn('app_users listener notice:', err);
      }
    );

    const unsubEmployees = onSnapshot(
      collection(db, 'employees'),
      (snapshot) => {
        const list: Employee[] = [];
        snapshot.forEach((d) => {
          if (DEMO_EMPLOYEE_IDS.has(d.id)) {
            // Delete demo document from Firestore
            deleteDoc(doc(db, 'employees', d.id)).catch(() => {});
          } else {
            list.push({ id: d.id, ...d.data() } as Employee);
          }
        });
        currentEmployees = list;
        rebuildUnifiedEmployees();
      },
      (err) => {
        console.warn('Employees snapshot error:', err);
      }
    );

    const unsubComputers = onSnapshot(
      collection(db, 'computers'),
      (snapshot) => {
        const list: Computer[] = [];
        snapshot.forEach((d) => {
          if (DEMO_COMPUTER_IDS.has(d.id)) {
            // Delete demo document from Firestore
            deleteDoc(doc(db, 'computers', d.id)).catch(() => {});
          } else {
            list.push({ id: d.id, ...d.data() } as Computer);
          }
        });
        list.sort((a, b) => a.assetTag.localeCompare(b.assetTag));
        setComputers(list);
      },
      (err) => {
        console.warn('Computers snapshot error:', err);
        handleFirestoreError(err, OperationType.GET, 'computers');
      }
    );

    const unsubTickets = onSnapshot(
      collection(db, 'tickets'),
      (snapshot) => {
        const list: Ticket[] = [];
        snapshot.forEach((d) => {
          if (DEMO_TICKET_IDS.has(d.id)) {
            // Delete demo document from Firestore
            deleteDoc(doc(db, 'tickets', d.id)).catch(() => {});
          } else {
            list.push({ id: d.id, ...d.data() } as Ticket);
          }
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTickets(list);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Tickets snapshot error:', err);
        handleFirestoreError(err, OperationType.GET, 'tickets');
      }
    );

    const unsubAudits = onSnapshot(
      collection(db, 'organization_audits'),
      (snapshot) => {
        const list: OrganizationAuditEntry[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as OrganizationAuditEntry));
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setOrganizationAuditLog(list);
      },
      (err) => {
        console.warn('Audits snapshot error:', err);
      }
    );

    const unsubSnapshots = onSnapshot(
      collection(db, 'inventory_snapshots'),
      (snapshot) => {
        const list: InventorySnapshot[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as InventorySnapshot));
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setInventorySnapshots(list);
      },
      (err) => {
        console.warn('Inventory snapshots listener notice:', err);
      }
    );

    const unsubInventoryAudits = onSnapshot(
      collection(db, 'inventory_audit_logs'),
      (snapshot) => {
        const list: InventoryAuditLog[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as InventoryAuditLog));
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setInventoryAuditLogs(list);
      },
      (err) => {
        console.warn('Inventory audit logs listener notice:', err);
      }
    );

    // Dedicated subscription to Firestore 'auditLogs' collection
    const unsubAuditLogs = AuditLogService.subscribeToAuditLogs((logs) => {
      setAuditLogs(logs);
    });

    // Auto-verify that master companies (AGIPL, ASSPL, ONYX) and 29 standard departments are in Firestore
    ensureMasterDataInFirestore().catch((err) => {
      console.warn('Master data auto-sync check error:', err);
    });

    return () => {
      unsubAppUsers();
      unsubEmployees();
      unsubComputers();
      unsubTickets();
      unsubAudits();
      unsubSnapshots();
      unsubInventoryAudits();
      unsubAuditLogs();
    };
  }, [currentUser, authLoading]);

  // CRUD for Tickets
  const createTicket = async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const id = `tck-${Date.now()}`;
    const initialTimeline: TicketTimelineEvent[] = [
      {
        id: `tl-${Date.now()}`,
        type: 'created',
        actorName: ticketData.requesterName || 'User',
        actorRole: 'employee',
        message: `Ticket created with ${ticketData.priority.toUpperCase()} priority`,
        timestamp: now,
      },
    ];

    const fullTicket: Ticket = {
      ...ticketData,
      id,
      timeline: ticketData.timeline || initialTimeline,
      attachments: ticketData.attachments || [],
      createdAt: now,
      updatedAt: now,
    };

    if (!currentUser) {
      setTickets((prev) => [fullTicket, ...prev]);
      return id;
    }

    try {
      const newDocRef = doc(collection(db, 'tickets'));
      const firestoreTicket = sanitizeForFirestore({ ...fullTicket, id: newDocRef.id });
      await setDoc(newDocRef, firestoreTicket);
      return newDocRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tickets');
    }
  };

  const updateTicket = async (
    id: string, 
    updates: Partial<Ticket>,
    timelineEvent?: Omit<TicketTimelineEvent, 'id' | 'timestamp'>
  ): Promise<void> => {
    const now = new Date().toISOString();

    const targetTicket = tickets.find((t) => t.id === id);
    let updatedTimeline = targetTicket?.timeline ? [...targetTicket.timeline] : [];

    if (timelineEvent) {
      updatedTimeline.push({
        ...timelineEvent,
        id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now,
      });
    }

    const mergedUpdates = {
      ...updates,
      ...(timelineEvent ? { timeline: updatedTimeline } : {}),
      updatedAt: now,
    };

    if (!currentUser) {
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...mergedUpdates } : t))
      );
      return;
    }

    try {
      const docRef = doc(db, 'tickets', id);
      await updateDoc(docRef, sanitizeForFirestoreUpdate(mergedUpdates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tickets/${id}`);
    }
  };

  const deleteTicket = async (id: string): Promise<void> => {
    if (!currentUser) {
      setTickets((prev) => prev.filter((t) => t.id !== id));
      return;
    }

    try {
      await deleteDoc(doc(db, 'tickets', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tickets/${id}`);
    }
  };

  const addTicketComment = async (
    ticketId: string, 
    commentData: Omit<TicketComment, 'id' | 'ticketId' | 'createdAt'>
  ): Promise<void> => {
    const now = new Date().toISOString();
    const newComment: TicketComment = {
      id: `comm-${Date.now()}`,
      ticketId,
      ...commentData,
      createdAt: now,
    };

    // Also add to timeline
    const timelineEvent: TicketTimelineEvent = {
      id: `tl-${Date.now()}`,
      type: 'comment_added',
      actorName: commentData.authorName,
      actorRole: commentData.authorRole,
      message: commentData.isInternal ? 'Added an internal technician note' : 'Added a comment/reply',
      timestamp: now,
    };

    if (!currentUser) {
      setCommentsMap((prev) => ({
        ...prev,
        [ticketId]: [...(prev[ticketId] || []), newComment],
      }));
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, updatedAt: now, timeline: [...(t.timeline || []), timelineEvent] }
            : t
        )
      );
      return;
    }

    try {
      const commentDocRef = doc(collection(db, 'tickets', ticketId, 'comments'));
      const commentWithId: TicketComment = {
        ...newComment,
        id: commentDocRef.id,
      };
      await setDoc(commentDocRef, sanitizeForFirestore(commentWithId));

      const targetTicket = tickets.find((t) => t.id === ticketId);
      const updatedTimeline = targetTicket?.timeline
        ? [...targetTicket.timeline, timelineEvent]
        : [timelineEvent];

      await updateDoc(doc(db, 'tickets', ticketId), sanitizeForFirestoreUpdate({
        updatedAt: now,
        timeline: updatedTimeline,
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `tickets/${ticketId}/comments`);
    }
  };

  const addTicketAttachment = async (ticketId: string, attachment: TicketAttachment): Promise<void> => {
    const now = new Date().toISOString();
    const timelineEvent: TicketTimelineEvent = {
      id: `tl-${Date.now()}`,
      type: 'attachment_added',
      actorName: attachment.uploadedByName,
      actorRole: 'employee',
      message: `Attached file: ${attachment.name}`,
      timestamp: now,
    };

    if (!currentUser) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                attachments: [...(t.attachments || []), attachment],
                timeline: [...(t.timeline || []), timelineEvent],
                updatedAt: now,
              }
            : t
        )
      );
      return;
    }

    try {
      const targetTicket = tickets.find((t) => t.id === ticketId);
      const newAttachments = targetTicket?.attachments
        ? [...targetTicket.attachments, attachment]
        : [attachment];
      const newTimeline = targetTicket?.timeline
        ? [...targetTicket.timeline, timelineEvent]
        : [timelineEvent];

      await updateDoc(doc(db, 'tickets', ticketId), sanitizeForFirestoreUpdate({
        attachments: newAttachments,
        timeline: newTimeline,
        updatedAt: now,
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tickets/${ticketId}`);
    }
  };

  const addTimelineEvent = async (
    ticketId: string,
    event: Omit<TicketTimelineEvent, 'id' | 'timestamp'>
  ): Promise<void> => {
    const now = new Date().toISOString();
    const newEvent: TicketTimelineEvent = {
      ...event,
      id: `tl-${Date.now()}`,
      timestamp: now,
    };

    if (!currentUser) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, timeline: [...(t.timeline || []), newEvent], updatedAt: now }
            : t
        )
      );
      return;
    }

    try {
      const targetTicket = tickets.find((t) => t.id === ticketId);
      const newTimeline = targetTicket?.timeline
        ? [...targetTicket.timeline, newEvent]
        : [newEvent];
      await updateDoc(doc(db, 'tickets', ticketId), sanitizeForFirestoreUpdate({
        timeline: newTimeline,
        updatedAt: now,
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tickets/${ticketId}`);
    }
  };

  const getTicketComments = (ticketId: string, callback: (comments: TicketComment[]) => void) => {
    if (!currentUser) {
      callback(commentsMap[ticketId] || []);
      return () => {};
    }

    return onSnapshot(
      collection(db, 'tickets', ticketId, 'comments'),
      (snapshot) => {
        const list: TicketComment[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as TicketComment));
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        callback(list);
      },
      (err) => {
        console.warn(`Error getting comments for ticket ${ticketId}:`, err);
        handleFirestoreError(err, OperationType.GET, `tickets/${ticketId}/comments`);
      }
    );
  };

  // CRUD for Computers
  const createComputer = async (
    compData: Omit<Computer, 'id' | 'createdAt' | 'updatedAt'>,
    auditEntry?: Omit<ComputerAuditEntry, 'id' | 'timestamp'>
  ): Promise<string> => {
    const now = new Date().toISOString();
    const id = `comp-${Date.now()}`;
    const initialAudits: ComputerAuditEntry[] = auditEntry
      ? [
          {
            ...auditEntry,
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: now,
          },
        ]
      : (compData.auditHistory || []);

    const fullComputer: Computer = {
      ...compData,
      id,
      auditHistory: initialAudits,
      createdAt: now,
      updatedAt: now,
    };

    if (!currentUser) {
      setComputers((prev) => [fullComputer, ...prev]);
      return id;
    }

    try {
      const newDocRef = doc(collection(db, 'computers'));
      const firestoreComp = sanitizeForFirestore({ ...fullComputer, id: newDocRef.id });
      await setDoc(newDocRef, firestoreComp);
      return newDocRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'computers');
    }
  };

  const updateComputer = async (
    id: string, 
    updates: Partial<Computer>,
    auditEntry?: Omit<ComputerAuditEntry, 'id' | 'timestamp'>
  ): Promise<void> => {
    const now = new Date().toISOString();
    const targetComp = computers.find((c) => c.id === id);
    let updatedAudit = targetComp?.auditHistory ? [...targetComp.auditHistory] : [];

    if (auditEntry) {
      updatedAudit.push({
        ...auditEntry,
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now,
      });
    }

    const mergedUpdates: Partial<Computer> = {
      ...updates,
      ...(auditEntry ? { auditHistory: updatedAudit } : {}),
      updatedAt: now,
    };

    if (!currentUser) {
      setComputers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...mergedUpdates } : c))
      );
      return;
    }

    try {
      const docRef = doc(db, 'computers', id);
      await updateDoc(docRef, sanitizeForFirestoreUpdate(mergedUpdates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `computers/${id}`);
    }
  };

  const deleteComputer = async (id: string): Promise<void> => {
    if (!currentUser) {
      setComputers((prev) => prev.filter((c) => c.id !== id));
      return;
    }

    try {
      await deleteDoc(doc(db, 'computers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `computers/${id}`);
    }
  };

  const assignComputer = async (
    id: string,
    employeeId: string,
    employeeName: string,
    companyId?: string,
    departmentId?: string,
    assignedDate?: string,
    actor?: { name: string; role: UserRole }
  ): Promise<void> => {
    const assignDate = assignedDate || new Date().toISOString().split('T')[0];
    const targetEmp = employees.find((e) => e.id === employeeId);
    const assignedUsername = targetEmp?.username || undefined;

    const auditEntry: Omit<ComputerAuditEntry, 'id' | 'timestamp'> = {
      type: 'assigned',
      actorName: actor?.name || 'IT Admin',
      actorRole: actor?.role || 'admin',
      message: `Assigned hardware asset to ${employeeName}${assignedUsername ? ` (@${assignedUsername})` : ''}`,
      newValue: employeeName,
    };

    await updateComputer(
      id,
      {
        status: 'assigned',
        assignedEmployeeId: employeeId,
        assignedEmployeeName: employeeName,
        assetUserName: assignedUsername,
        assignmentStatus: 'matched',
        companyId: companyId || targetEmp?.companyId || undefined,
        departmentId: departmentId || targetEmp?.departmentId || undefined,
        assignedDate: assignDate,
        returnedDate: undefined,
      },
      auditEntry
    );
  };

  const unassignComputer = async (
    id: string,
    returnedDate?: string,
    condition?: ComputerCondition,
    notes?: string,
    actor?: { name: string; role: UserRole }
  ): Promise<void> => {
    const retDate = returnedDate || new Date().toISOString().split('T')[0];
    const targetComp = computers.find((c) => c.id === id);
    const prevEmployee = targetComp?.assignedEmployeeName || 'Employee';

    const auditEntry: Omit<ComputerAuditEntry, 'id' | 'timestamp'> = {
      type: 'unassigned',
      actorName: actor?.name || 'IT Admin',
      actorRole: actor?.role || 'admin',
      message: `Device unassigned from ${prevEmployee} and returned to available inventory pool`,
      oldValue: prevEmployee,
      newValue: 'available',
    };

    await updateComputer(
      id,
      {
        status: 'available',
        assignedEmployeeId: undefined,
        assignedEmployeeName: undefined,
        assetUserName: undefined,
        assignmentStatus: undefined,
        returnedDate: retDate,
        ...(condition ? { condition } : {}),
        ...(notes ? { notes } : {}),
      },
      auditEntry
    );
  };

  const retireComputer = async (
    id: string,
    reason?: string,
    actor?: { name: string; role: UserRole }
  ): Promise<void> => {
    const auditEntry: Omit<ComputerAuditEntry, 'id' | 'timestamp'> = {
      type: 'retired',
      actorName: actor?.name || 'IT Admin',
      actorRole: actor?.role || 'admin',
      message: `Asset retired from active circulation${reason ? `: ${reason}` : ''}`,
      newValue: 'retired',
    };

    await updateComputer(
      id,
      {
        status: 'retired',
        assignedEmployeeId: undefined,
        assignedEmployeeName: undefined,
        returnedDate: new Date().toISOString().split('T')[0],
      },
      auditEntry
    );
  };

  const addComputerAttachment = async (
    id: string,
    attachment: ComputerAttachment,
    actor?: { name: string; role: UserRole }
  ): Promise<void> => {
    const targetComp = computers.find((c) => c.id === id);
    const newAttachments = targetComp?.attachments
      ? [...targetComp.attachments, attachment]
      : [attachment];

    const auditEntry: Omit<ComputerAuditEntry, 'id' | 'timestamp'> = {
      type: 'attachment_added',
      actorName: actor?.name || attachment.uploadedByName,
      actorRole: actor?.role || 'admin',
      message: `Uploaded ${attachment.category} document: ${attachment.name}`,
    };

    await updateComputer(id, { attachments: newAttachments }, auditEntry);
  };

  const addComputerAuditEntry = async (
    id: string,
    entry: Omit<ComputerAuditEntry, 'id' | 'timestamp'>
  ): Promise<void> => {
    await updateComputer(id, {}, entry);
  };

  // CRUD for Companies
  const createCompany = async (
    companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { name: string; role: UserRole }
  ): Promise<string> => {
    const trimmedName = companyData.name.trim();
    const trimmedCode = companyData.code.trim().toUpperCase();

    // Prevent duplicate companies by name or code
    const nameExists = companies.some(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      throw new Error(`A company with the name "${trimmedName}" already exists.`);
    }

    const codeExists = companies.some(
      (c) => c.code.trim().toUpperCase() === trimmedCode
    );
    if (codeExists) {
      throw new Error(`A company with code "${trimmedCode}" already exists.`);
    }

    const now = new Date().toISOString();
    const id = `comp-${Date.now()}`;
    const initialAudit: OrganizationAuditEntry = {
      id: `aud-${Date.now()}`,
      type: 'created',
      actorName: actor?.name || 'IT Admin',
      actorRole: actor?.role || 'admin',
      message: `Created corporate entity: ${trimmedName} (${trimmedCode})`,
      timestamp: now,
    };

    const fullCompany: Company = {
      ...companyData,
      name: trimmedName,
      code: trimmedCode,
      status: companyData.status || 'active',
      auditHistory: companyData.auditHistory || [initialAudit],
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (!currentUser) {
      setCompanies((prev) => [fullCompany, ...prev]);
      return id;
    }

    try {
      const newDocRef = doc(collection(db, 'companies'));
      const firestoreComp = sanitizeForFirestore({ ...fullCompany, id: newDocRef.id });
      await setDoc(newDocRef, firestoreComp);

      // Auto-provision standard master departments for the newly added company
      for (const deptName of MASTER_DEPARTMENTS) {
        const deptId = `dept-${newDocRef.id}-${deptName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
        const newDept = {
          id: deptId,
          name: deptName,
          code: deptName.length <= 4 ? deptName : undefined,
          companyId: newDocRef.id,
          status: 'active' as const,
          createdAt: now,
          updatedAt: now,
        };
        setDoc(doc(db, 'departments', deptId), sanitizeForFirestore(newDept)).catch(() => {});
      }

      return newDocRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'companies');
    }
  };

  const updateCompany = async (
    id: string,
    updates: Partial<Company>,
    auditEntry?: Omit<OrganizationAuditEntry, 'id' | 'timestamp'>
  ): Promise<void> => {
    const now = new Date().toISOString();
    const targetComp = companies.find((c) => c.id === id);
    let updatedAudit = targetComp?.auditHistory ? [...targetComp.auditHistory] : [];

    if (auditEntry) {
      updatedAudit.push({
        ...auditEntry,
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now,
      });
    }

    const mergedUpdates = {
      ...updates,
      ...(auditEntry ? { auditHistory: updatedAudit } : {}),
      updatedAt: now,
    };

    if (!currentUser) {
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...mergedUpdates } : c))
      );
      return;
    }

    try {
      const docRef = doc(db, 'companies', id);
      await updateDoc(docRef, sanitizeForFirestoreUpdate(mergedUpdates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `companies/${id}`);
    }
  };

  const archiveCompany = async (id: string, actor?: { name: string; role: UserRole }): Promise<void> => {
    const targetComp = companies.find((c) => c.id === id);
    await updateCompany(
      id,
      { status: 'inactive' },
      {
        type: 'archived',
        actorName: actor?.name || 'IT Admin',
        actorRole: actor?.role || 'admin',
        message: `Archived company ${targetComp?.name || ''}`,
      }
    );
  };

  const restoreCompany = async (id: string, actor?: { name: string; role: UserRole }): Promise<void> => {
    const targetComp = companies.find((c) => c.id === id);
    await updateCompany(
      id,
      { status: 'active' },
      {
        type: 'restored',
        actorName: actor?.name || 'IT Admin',
        actorRole: actor?.role || 'admin',
        message: `Restored company ${targetComp?.name || ''} to active status`,
      }
    );
  };

  const reassignCompanyRecords = async (
    sourceCompanyId: string,
    targetCompanyId: string,
    actor?: { name: string; role: UserRole }
  ): Promise<void> => {
    const targetComp = companies.find((c) => c.id === targetCompanyId);
    const sourceComp = companies.find((c) => c.id === sourceCompanyId);
    if (!targetComp || !sourceComp) return;

    const now = new Date().toISOString();
    const actorName = actor?.name || 'IT Admin';
    const actorRole = actor?.role || 'admin';

    // 1. Move departments
    setDepartments((prev) =>
      prev.map((d) => (d.companyId === sourceCompanyId ? { ...d, companyId: targetCompanyId, updatedAt: now } : d))
    );

    // 2. Move employees
    setEmployees((prev) =>
      prev.map((e) => (e.companyId === sourceCompanyId ? { ...e, companyId: targetCompanyId, updatedAt: now } : e))
    );

    // 3. Move computers
    setComputers((prev) =>
      prev.map((c) => (c.companyId === sourceCompanyId ? { ...c, companyId: targetCompanyId, updatedAt: now } : c))
    );

    // 4. Move tickets
    setTickets((prev) =>
      prev.map((t) => (t.companyId === sourceCompanyId ? { ...t, companyId: targetCompanyId, updatedAt: now } : t))
    );

    // Audit logs
    const auditEntry: OrganizationAuditEntry = {
      id: `aud-${Date.now()}`,
      type: 'reassigned',
      actorName,
      actorRole,
      message: `Reassigned all linked departments, employees, assets, and tickets to ${targetComp.name} (${targetComp.code})`,
      timestamp: now,
    };

    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id === sourceCompanyId) {
          return {
            ...c,
            auditHistory: [auditEntry, ...(c.auditHistory || [])],
            updatedAt: now,
          };
        }
        if (c.id === targetCompanyId) {
          return {
            ...c,
            auditHistory: [
              {
                id: `aud-${Date.now()}-tgt`,
                type: 'reassigned',
                actorName,
                actorRole,
                message: `Received reassigned organizational records from ${sourceComp.name}`,
                timestamp: now,
              },
              ...(c.auditHistory || []),
            ],
            updatedAt: now,
          };
        }
        return c;
      })
    );
  };

  const deleteCompany = async (id: string, actor?: { name: string; role: UserRole }): Promise<void> => {
    const targetComp = companies.find((c) => c.id === id);
    const now = new Date().toISOString();
    const deletionAudit: OrganizationAuditEntry = {
      id: `aud-${Date.now()}-del`,
      type: 'deleted',
      actorName: actor?.name || 'Administrator',
      actorRole: actor?.role || 'admin',
      message: `Permanently removed company: ${targetComp?.name || id} (${targetComp?.code || 'Entity'})`,
      timestamp: now,
    };
    setOrganizationAuditLog((prev) => [deletionAudit, ...prev]);

    if (!currentUser) {
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      return;
    }

    try {
      await deleteDoc(doc(db, 'companies', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `companies/${id}`);
    }
  };

  // CRUD for Departments
  const createDepartment = async (
    deptData: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { name: string; role: UserRole }
  ): Promise<string> => {
    const trimmedName = deptData.name.trim();

    // Prevent duplicate department within the same company
    const nameExists = departments.some(
      (d) =>
        d.companyId === deptData.companyId &&
        d.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      const parentCo = companies.find((c) => c.id === deptData.companyId);
      throw new Error(
        `Department "${trimmedName}" already exists for ${parentCo?.name || 'this company'}.`
      );
    }

    const now = new Date().toISOString();
    const id = `dept-${Date.now()}`;
    const initialAudit: OrganizationAuditEntry = {
      id: `aud-${Date.now()}`,
      type: 'created',
      actorName: actor?.name || 'IT Admin',
      actorRole: actor?.role || 'admin',
      message: `Created department: ${trimmedName}${deptData.code ? ` (${deptData.code})` : ''}`,
      timestamp: now,
    };

    const fullDept: Department = {
      ...deptData,
      name: trimmedName,
      status: deptData.status || 'active',
      auditHistory: deptData.auditHistory || [initialAudit],
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (!currentUser) {
      setDepartments((prev) => [fullDept, ...prev]);
      return id;
    }

    try {
      const newDocRef = doc(collection(db, 'departments'));
      const firestoreDept = sanitizeForFirestore({ ...fullDept, id: newDocRef.id });
      await setDoc(newDocRef, firestoreDept);
      return newDocRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'departments');
    }
  };

  const updateDepartment = async (
    id: string,
    updates: Partial<Department>,
    auditEntry?: Omit<OrganizationAuditEntry, 'id' | 'timestamp'>
  ): Promise<void> => {
    const now = new Date().toISOString();
    const targetDept = departments.find((d) => d.id === id);
    let updatedAudit = targetDept?.auditHistory ? [...targetDept.auditHistory] : [];

    if (auditEntry) {
      updatedAudit.push({
        ...auditEntry,
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now,
      });
    }

    const mergedUpdates = {
      ...updates,
      ...(auditEntry ? { auditHistory: updatedAudit } : {}),
      updatedAt: now,
    };

    if (!currentUser) {
      setDepartments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...mergedUpdates } : d))
      );
      return;
    }

    try {
      const docRef = doc(db, 'departments', id);
      await updateDoc(docRef, sanitizeForFirestoreUpdate(mergedUpdates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `departments/${id}`);
    }
  };

  const archiveDepartment = async (id: string, actor?: { name: string; role: UserRole }): Promise<void> => {
    const targetDept = departments.find((d) => d.id === id);
    await updateDepartment(
      id,
      { status: 'inactive' },
      {
        type: 'archived',
        actorName: actor?.name || 'IT Admin',
        actorRole: actor?.role || 'admin',
        message: `Archived department ${targetDept?.name || ''}`,
      }
    );
  };

  const restoreDepartment = async (id: string, actor?: { name: string; role: UserRole }): Promise<void> => {
    const targetDept = departments.find((d) => d.id === id);
    await updateDepartment(
      id,
      { status: 'active' },
      {
        type: 'restored',
        actorName: actor?.name || 'IT Admin',
        actorRole: actor?.role || 'admin',
        message: `Restored department ${targetDept?.name || ''} to active status`,
      }
    );
  };

  const reassignDepartmentRecords = async (
    sourceDeptId: string,
    targetDeptId: string,
    actor?: { name: string; role: UserRole }
  ): Promise<void> => {
    const targetDept = departments.find((d) => d.id === targetDeptId);
    const sourceDept = departments.find((d) => d.id === sourceDeptId);
    if (!targetDept || !sourceDept) return;

    const now = new Date().toISOString();
    const actorName = actor?.name || 'IT Admin';
    const actorRole = actor?.role || 'admin';

    // 1. Move employees
    setEmployees((prev) =>
      prev.map((e) => (e.departmentId === sourceDeptId ? { ...e, departmentId: targetDeptId, updatedAt: now } : e))
    );

    // 2. Move computers
    setComputers((prev) =>
      prev.map((c) => (c.departmentId === sourceDeptId ? { ...c, departmentId: targetDeptId, updatedAt: now } : c))
    );

    // 3. Move tickets
    setTickets((prev) =>
      prev.map((t) => (t.departmentId === sourceDeptId ? { ...t, departmentId: targetDeptId, updatedAt: now } : t))
    );

    // Audit logs
    const auditEntry: OrganizationAuditEntry = {
      id: `aud-${Date.now()}`,
      type: 'reassigned',
      actorName,
      actorRole,
      message: `Reassigned all linked employees, assets, and tickets from ${sourceDept.name} to ${targetDept.name}`,
      timestamp: now,
    };

    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id === sourceDeptId) {
          return {
            ...d,
            auditHistory: [auditEntry, ...(d.auditHistory || [])],
            updatedAt: now,
          };
        }
        if (d.id === targetDeptId) {
          return {
            ...d,
            auditHistory: [
              {
                id: `aud-${Date.now()}-tgt`,
                type: 'reassigned',
                actorName,
                actorRole,
                message: `Received reassigned records from ${sourceDept.name}`,
                timestamp: now,
              },
              ...(d.auditHistory || []),
            ],
            updatedAt: now,
          };
        }
        return d;
      })
    );
  };

  const deleteDepartment = async (id: string, actor?: { name: string; role: UserRole }): Promise<void> => {
    const targetDept = departments.find((d) => d.id === id);
    const now = new Date().toISOString();
    const deletionAudit: OrganizationAuditEntry = {
      id: `aud-${Date.now()}-del`,
      type: 'deleted',
      actorName: actor?.name || 'Administrator',
      actorRole: actor?.role || 'admin',
      message: `Permanently removed department: ${targetDept?.name || id}${targetDept?.code ? ` (${targetDept.code})` : ''}`,
      timestamp: now,
    };
    setOrganizationAuditLog((prev) => [deletionAudit, ...prev]);

    if (!currentUser) {
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      return;
    }

    try {
      await deleteDoc(doc(db, 'departments', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `departments/${id}`);
    }
  };

  // CRUD for Employees
  const createEmployee = async (empData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const id = `emp-${Date.now()}`;
    const fullEmp: Employee = {
      ...empData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (!currentUser) {
      setEmployees((prev) => [...prev, fullEmp]);
      return id;
    }

    try {
      const newDocRef = doc(collection(db, 'employees'));
      const firestoreEmp = sanitizeForFirestore({ ...fullEmp, id: newDocRef.id });
      await setDoc(newDocRef, firestoreEmp);
      return newDocRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'employees');
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<void> => {
    const now = new Date().toISOString();
    if (!currentUser) {
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: now } : e))
      );
      return;
    }

    try {
      if (id.startsWith('usr-')) {
        await updateDoc(doc(db, 'app_users', id), sanitizeForFirestoreUpdate({
          ...updates,
          updatedAt: now,
        })).catch(() => {});
      }
      const docRef = doc(db, 'employees', id);
      await updateDoc(docRef, sanitizeForFirestoreUpdate({
        ...updates,
        updatedAt: now,
      })).catch((err) => {
        if (!id.startsWith('usr-')) throw err;
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `employees/${id}`);
    }
  };

  const deleteEmployee = async (id: string): Promise<void> => {
    if (!currentUser) {
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      return;
    }

    try {
      if (id.startsWith('usr-')) {
        await deleteDoc(doc(db, 'app_users', id)).catch(() => {});
      }
      await deleteDoc(doc(db, 'employees', id)).catch(() => {});
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `employees/${id}`);
    }
  };

  // Physical Location Management
  const createLocation = async (
    locData: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { name: string; role: UserRole }
  ): Promise<string> => {
    const now = new Date().toISOString();
    const id = `loc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullLoc: Location = {
      ...locData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'locations', id), sanitizeForFirestore(fullLoc));
    } catch (err) {
      console.warn('Fallback saving location to Firestore:', err);
    }

    setLocations((prev) => {
      const updated = [...prev.filter((l) => l.id !== id), fullLoc];
      updated.sort((a, b) => a.name.localeCompare(b.name));
      return updated;
    });

    if (actor) {
      addOrganizationAuditEntry({
        type: 'created',
        actorName: actor.name,
        actorRole: actor.role,
        message: `Physical location ${fullLoc.name} (${fullLoc.building || 'General'}) registered by ${actor.name}`,
        timestamp: now,
      }).catch(() => {});
    }

    return id;
  };

  const updateLocation = async (
    id: string,
    updates: Partial<Location>,
    actor?: { name: string; role: UserRole }
  ): Promise<void> => {
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'locations', id), sanitizeForFirestoreUpdate({
        ...updates,
        updatedAt: now,
      }));
    } catch (err) {
      console.warn('Fallback updating location in Firestore:', err);
    }

    setLocations((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: now } : l))
    );

    if (actor) {
      addOrganizationAuditEntry({
        type: 'updated',
        actorName: actor.name,
        actorRole: actor.role,
        message: `Physical location "${updates.name || id}" updated by ${actor.name}`,
        timestamp: now,
      }).catch(() => {});
    }
  };

  const deleteLocation = async (id: string, actor?: { name: string; role: UserRole }): Promise<void> => {
    const now = new Date().toISOString();
    try {
      await deleteDoc(doc(db, 'locations', id));
    } catch (err) {
      console.warn('Fallback deleting location in Firestore:', err);
    }

    setLocations((prev) => prev.filter((l) => l.id !== id));

    if (actor) {
      addOrganizationAuditEntry({
        type: 'deleted',
        actorName: actor.name,
        actorRole: actor.role,
        message: `Physical location ${id} removed by ${actor.name}`,
        timestamp: now,
      }).catch(() => {});
    }
  };

  // Organization / System Audit Logging
  const addOrganizationAuditEntry = async (entry: Omit<OrganizationAuditEntry, 'id'>): Promise<void> => {
    const fullEntry: OrganizationAuditEntry = {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setOrganizationAuditLog((prev) => [fullEntry, ...prev]);

    if (currentUser) {
      try {
        await setDoc(doc(db, 'organization_audits', fullEntry.id), sanitizeForFirestore(fullEntry));
      } catch (err) {
        console.warn('Could not record organization audit entry to Firestore:', err);
      }
    }
  };

  // Master data auto-synchronization for AGIPL, ASSPL, ONYX and 29 departments
  const ensureMasterDataInFirestore = async (): Promise<void> => {
    try {
      const now = new Date().toISOString();
      const compSnap = await getDocs(collection(db, 'companies'));
      const existingCoMap = new Map<string, Company>();
      compSnap.forEach((d) => {
        existingCoMap.set(d.id, { id: d.id, ...d.data() } as Company);
      });

      const resolvedCo: { name: string; id: string }[] = [];

      for (const masterCo of MASTER_COMPANIES) {
        let matchedId: string | null = null;
        for (const [id, co] of existingCoMap.entries()) {
          if (
            (co.name && co.name.trim().toLowerCase() === masterCo.name.toLowerCase()) ||
            (co.code && co.code.trim().toUpperCase() === masterCo.code.toUpperCase())
          ) {
            matchedId = id;
            break;
          }
        }

        if (!matchedId) {
          const newDoc = {
            id: masterCo.id,
            name: masterCo.name,
            code: masterCo.code,
            contactEmail: masterCo.contactEmail,
            phone: '',
            address: '',
            status: 'active' as const,
            auditHistory: [
              {
                id: `aud-${Date.now()}-${masterCo.name.toLowerCase()}`,
                type: 'created' as const,
                actorName: 'System Setup',
                actorRole: 'admin' as UserRole,
                message: `Master corporate entity ${masterCo.name} initialized in database`,
                timestamp: now,
              },
            ],
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(doc(db, 'companies', masterCo.id), sanitizeForFirestore(newDoc));
          matchedId = masterCo.id;
          existingCoMap.set(masterCo.id, newDoc);
        }

        resolvedCo.push({ name: masterCo.name, id: matchedId });
      }

      const deptSnap = await getDocs(collection(db, 'departments'));
      const existingDeptKeys = new Set<string>();
      deptSnap.forEach((d) => {
        const data = d.data();
        if (data.companyId && data.name) {
          existingDeptKeys.add(`${data.companyId}::${data.name.trim().toLowerCase()}`);
        }
      });

      for (const co of resolvedCo) {
        for (const deptName of MASTER_DEPARTMENTS) {
          const key = `${co.id}::${deptName.trim().toLowerCase()}`;
          if (!existingDeptKeys.has(key)) {
            const deptSlug = deptName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const deptId = `dept-${co.name.toLowerCase()}-${deptSlug}`;
            const newDept = {
              id: deptId,
              name: deptName,
              code: deptName.length <= 4 ? deptName : undefined,
              companyId: co.id,
              status: 'active' as const,
              auditHistory: [
                {
                  id: `aud-${Date.now()}-${deptId}`,
                  type: 'created' as const,
                  actorName: 'System Setup',
                  actorRole: 'admin' as UserRole,
                  message: `Master department ${deptName} initialized for ${co.name}`,
                  timestamp: now,
                },
              ],
              createdAt: now,
              updatedAt: now,
            };
            await setDoc(doc(db, 'departments', deptId), sanitizeForFirestore(newDept));
            existingDeptKeys.add(key);
          }
        }
      }

      // 3. Initialize Master Physical Locations
      const locSnap = await getDocs(collection(db, 'locations'));
      const existingLocNames = new Set<string>();
      locSnap.forEach((d) => {
        const data = d.data();
        if (data.name) existingLocNames.add(data.name.trim().toLowerCase());
      });

      for (const mLoc of MASTER_LOCATIONS) {
        if (!existingLocNames.has(mLoc.name.trim().toLowerCase())) {
          const newLoc = {
            id: mLoc.id,
            name: mLoc.name,
            code: mLoc.code,
            building: mLoc.building,
            floor: mLoc.floor,
            room: mLoc.room || '',
            address: mLoc.address || '',
            description: mLoc.description || '',
            status: mLoc.status,
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(doc(db, 'locations', mLoc.id), sanitizeForFirestore(newLoc));
          existingLocNames.add(mLoc.name.trim().toLowerCase());
        }
      }
    } catch (err) {
      console.warn('Master data auto-sync notice:', err);
    }
  };

  // Helper: Chunked or batch write for large inventory operations
  const writeBatchChunks = async (operations: Array<(batch: any) => void>) => {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      const slice = operations.slice(i, i + CHUNK_SIZE);
      slice.forEach((op) => op(batch));
      await batch.commit();
    }
  };

  // Helper: Compute snapshot checksum for data integrity
  const calculateAssetsChecksum = (assetList: Computer[]): string => {
    let hash = 0;
    const str = `${assetList.length}:${assetList.map((a) => `${a.id}_${a.assetTag}_${a.status}_${a.updatedAt}`).join(';')}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `chk-${Math.abs(hash).toString(16)}-${assetList.length}`;
  };

  // Helper: Load full assets for a snapshot (resolving chunks if stored separately)
  const getFullSnapshotAssets = async (snapshot: InventorySnapshot): Promise<Computer[]> => {
    if (snapshot.assets && snapshot.assets.length > 0) {
      return snapshot.assets;
    }
    try {
      const snapDoc = await getDocs(collection(db, `inventory_snapshots/${snapshot.id}/chunks`));
      if (!snapDoc.empty) {
        const chunkAssets: Computer[] = [];
        snapDoc.forEach((d) => {
          const data = d.data();
          if (data.assets && Array.isArray(data.assets)) {
            chunkAssets.push(...data.assets);
          }
        });
        return chunkAssets;
      }
    } catch (e) {
      console.warn('Could not read snapshot subcollection chunks:', e);
    }
    return snapshot.assets || [];
  };

  // Inventory Administration, Snapshots & Rollbacks
  const createInventorySnapshot = async (params: {
    name: string;
    description: string;
    operationType: SnapshotOperationType;
    scopeCompanyId?: string;
    scopeCompanyName?: string;
    assetsToSnapshot?: Computer[];
    reason?: string;
  }): Promise<string> => {
    const now = new Date().toISOString();
    const snapshotId = `snp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    // Determine asset scope
    let targetAssets: Computer[] = params.assetsToSnapshot
      ? [...params.assetsToSnapshot]
      : [...computers];

    if (params.scopeCompanyId) {
      targetAssets = targetAssets.filter((c) => c.companyId === params.scopeCompanyId);
    }

    const checksum = calculateAssetsChecksum(targetAssets);
    const actorName = currentUser?.fullName || 'Administrator';
    const actorEmail = currentUser?.email || 'admin@system.internal';
    const actorRole = (currentUser?.role as UserRole) || 'admin';

    const newSnapshot: InventorySnapshot = {
      id: snapshotId,
      name: params.name,
      description: params.description || `Automatic backup snapshot prior to ${params.operationType}`,
      timestamp: now,
      createdByName: actorName,
      createdByEmail: actorEmail,
      createdByRole: actorRole,
      operationType: params.operationType,
      affectedCount: targetAssets.length,
      totalAssetsCount: computers.length,
      scopeCompanyId: params.scopeCompanyId,
      scopeCompanyName: params.scopeCompanyName,
      status: 'active',
      availableRecoveryActions: ['full_restore', 'selective_rollback', 'deleted_recovery'],
      assetsCount: targetAssets.length,
      assets: targetAssets,
      schemaVersion: 1,
      checksum,
    };

    // Safety verification: snapshot MUST succeed before proceeding with destructive operations
    if (currentUser) {
      try {
        // If dataset is very large (> 250 items), chunk into subcollection to avoid Firestore 1MB doc limit
        if (targetAssets.length > 250) {
          const metaDoc = { ...newSnapshot, assets: [] };
          await setDoc(doc(db, 'inventory_snapshots', snapshotId), sanitizeForFirestore(metaDoc));

          const CHUNK_SIZE = 200;
          for (let i = 0; i < targetAssets.length; i += CHUNK_SIZE) {
            const chunkSlice = targetAssets.slice(i, i + CHUNK_SIZE);
            const chunkId = `chunk_${Math.floor(i / CHUNK_SIZE)}`;
            await setDoc(
              doc(db, `inventory_snapshots/${snapshotId}/chunks`, chunkId),
              sanitizeForFirestore({ index: i, assets: chunkSlice })
            );
          }
        } else {
          await setDoc(doc(db, 'inventory_snapshots', snapshotId), sanitizeForFirestore(newSnapshot));
        }
      } catch (err: any) {
        console.error('Critical snapshot creation failed:', err);
        throw new Error(`Failed to create inventory snapshot: ${err?.message || 'Database write error'}. The destructive operation was safely aborted.`);
      }
    }

    // Record audit log
    const auditEntry: InventoryAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      action: 'create_snapshot',
      actorName,
      actorEmail,
      actorRole,
      scope: params.scopeCompanyName || (params.scopeCompanyId ? 'Company Scoped' : 'Organization-Wide'),
      affectedCount: targetAssets.length,
      affectedAssetIds: targetAssets.slice(0, 50).map((c) => c.id),
      details: `Created snapshot "${params.name}" (${params.operationType}) containing ${targetAssets.length} asset records. Checksum: ${checksum}. Reason: ${params.reason || 'Safety Backup'}`,
      snapshotId,
      status: 'success',
    };

    if (currentUser) {
      setDoc(doc(db, 'inventory_audit_logs', auditEntry.id), sanitizeForFirestore(auditEntry)).catch((e) =>
        console.warn('Audit log write notice:', e)
      );
    }

    setInventorySnapshots((prev) => [newSnapshot, ...prev]);
    setInventoryAuditLogs((prev) => [auditEntry, ...prev]);

    return snapshotId;
  };

  const rollbackSelectedAssets = async (
    snapshotId: string,
    assetIdsToRestore: string[],
    reason?: string
  ): Promise<{ restoredCount: number }> => {
    const targetSnapshot = inventorySnapshots.find((s) => s.id === snapshotId);
    if (!targetSnapshot) {
      throw new Error(`Snapshot with ID "${snapshotId}" was not found.`);
    }

    const snapshotAssets = await getFullSnapshotAssets(targetSnapshot);
    const assetsToRestore = snapshotAssets.filter((a) => assetIdsToRestore.includes(a.id));

    if (assetsToRestore.length === 0) {
      throw new Error('No matching asset records found in this snapshot to restore.');
    }

    // Safeguard: Create a pre_rollback snapshot of current inventory before modifying anything
    await createInventorySnapshot({
      name: `Pre-Rollback State (${new Date().toLocaleDateString()})`,
      description: `Automatic snapshot before selective rollback of ${assetsToRestore.length} assets from snapshot "${targetSnapshot.name}"`,
      operationType: 'pre_rollback',
      scopeCompanyId: targetSnapshot.scopeCompanyId,
      reason: reason || 'Safety backup prior to selective rollback',
    });

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || 'Administrator';
    const actorRole = (currentUser?.role as UserRole) || 'admin';

    if (currentUser) {
      await writeBatchChunks(
        assetsToRestore.map((asset) => (batch) => {
          const restoredAsset: Computer = {
            ...asset,
            updatedAt: now,
            auditHistory: [
              {
                id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: 'updated',
                actorName,
                actorRole,
                message: `Selectively restored to historical version from snapshot "${targetSnapshot.name}"`,
                timestamp: now,
              },
              ...(asset.auditHistory || []),
            ],
          };
          const ref = doc(db, 'computers', asset.id);
          batch.set(ref, sanitizeForFirestore(restoredAsset));
        })
      );
    } else {
      setComputers((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        assetsToRestore.forEach((a) => map.set(a.id, { ...a, updatedAt: now }));
        return Array.from(map.values());
      });
    }

    // Log in inventory audit
    const auditEntry: InventoryAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      action: 'rollback_selected',
      actorName,
      actorEmail: currentUser?.email || 'admin@system.internal',
      actorRole,
      scope: targetSnapshot.scopeCompanyName || 'Organization-Wide',
      affectedCount: assetsToRestore.length,
      affectedAssetIds: assetsToRestore.map((a) => a.id),
      details: `Rolled back ${assetsToRestore.length} selected assets to snapshot "${targetSnapshot.name}". Reason: ${reason || 'Administrator rollback'}`,
      snapshotId,
      status: 'success',
    };

    if (currentUser) {
      setDoc(doc(db, 'inventory_audit_logs', auditEntry.id), sanitizeForFirestore(auditEntry)).catch(() => {});
    }
    setInventoryAuditLogs((prev) => [auditEntry, ...prev]);

    // Save to dedicated Firestore 'auditLogs' collection via AuditLogService
    await AuditLogService.logSnapshotRestoration({
      actingUserId: currentUser?.id || 'usr-admin',
      actingUserName: actorName,
      actingUserRole: actorRole,
      actingUserEmail: currentUser?.email || 'admin@system.internal',
      affectedAssetCount: assetsToRestore.length,
      snapshotId,
      restorationType: 'selective',
      restoredCount: assetsToRestore.length,
      reason,
      details: `Rolled back ${assetsToRestore.length} selected assets to snapshot "${targetSnapshot.name}". Reason: ${reason || 'Administrator rollback'}`,
      metadata: { targetSnapshotName: targetSnapshot.name, assetIds: assetsToRestore.map((a) => a.id) },
    }).catch((e) => console.warn('AuditLogService logSnapshotRestoration notice:', e));

    return { restoredCount: assetsToRestore.length };
  };

  const restoreFullInventorySnapshot = async (
    snapshotId: string,
    previewOnly: boolean = false
  ): Promise<{ restoredCount: number; updatedCount: number; removedCount: number }> => {
    const targetSnapshot = inventorySnapshots.find((s) => s.id === snapshotId);
    if (!targetSnapshot) {
      throw new Error(`Snapshot with ID "${snapshotId}" was not found.`);
    }

    const snapshotAssets = await getFullSnapshotAssets(targetSnapshot);
    const currentMap = new Map(computers.map((c) => [c.id, c]));
    const snapshotMap = new Map(snapshotAssets.map((c) => [c.id, c]));

    let restoredCount = 0; // In snapshot but missing from active
    let updatedCount = 0;  // In both but modified
    let removedCount = 0;  // In active within scope but missing from snapshot

    const targetScopeCompany = targetSnapshot.scopeCompanyId;
    const activeAssetsInScope = targetScopeCompany
      ? computers.filter((c) => c.companyId === targetScopeCompany)
      : computers;

    snapshotAssets.forEach((snapAsset) => {
      const current = currentMap.get(snapAsset.id);
      if (!current) {
        restoredCount++;
      } else if (
        current.status !== snapAsset.status ||
        current.condition !== snapAsset.condition ||
        current.assignedEmployeeName !== snapAsset.assignedEmployeeName ||
        current.serialNumber !== snapAsset.serialNumber ||
        current.model !== snapAsset.model
      ) {
        updatedCount++;
      }
    });

    activeAssetsInScope.forEach((currAsset) => {
      if (!snapshotMap.has(currAsset.id)) {
        removedCount++;
      }
    });

    if (previewOnly) {
      return { restoredCount, updatedCount, removedCount };
    }

    // Safety: Backup current state before restoring full inventory
    await createInventorySnapshot({
      name: `Pre-Full Restore Backup (${new Date().toLocaleDateString()})`,
      description: `Safety snapshot created immediately prior to restoring full snapshot "${targetSnapshot.name}"`,
      operationType: 'pre_rollback',
      scopeCompanyId: targetScopeCompany,
      reason: `Safety backup prior to full restoration of snapshot ${snapshotId}`,
    });

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || 'Administrator';
    const actorRole = (currentUser?.role as UserRole) || 'admin';

    if (currentUser) {
      const ops: Array<(batch: any) => void> = [];

      // 1. Restore all snapshot assets
      snapshotAssets.forEach((snapAsset) => {
        const restoredAsset: Computer = {
          ...snapAsset,
          updatedAt: now,
          auditHistory: [
            {
              id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: 'updated',
              actorName,
              actorRole,
              message: `Full inventory restoration applied from snapshot "${targetSnapshot.name}"`,
              timestamp: now,
            },
            ...(snapAsset.auditHistory || []),
          ],
        };
        ops.push((batch) => {
          batch.set(doc(db, 'computers', snapAsset.id), sanitizeForFirestore(restoredAsset));
        });
      });

      // 2. Archive/retire assets created after snapshot within the same scope so they are cleanly set aside
      activeAssetsInScope.forEach((currAsset) => {
        if (!snapshotMap.has(currAsset.id)) {
          ops.push((batch) => {
            batch.update(doc(db, 'computers', currAsset.id), {
              isArchived: true,
              archivedAt: now,
              archivedByName: actorName,
              archivedReason: `Archived during full inventory restoration of snapshot "${targetSnapshot.name}"`,
              status: 'retired',
              updatedAt: now,
            });
          });
        }
      });

      await writeBatchChunks(ops);

      // Mark snapshot as restored
      updateDoc(doc(db, 'inventory_snapshots', snapshotId), {
        isRestored: true,
        restoredAt: now,
        restoredByName: actorName,
      }).catch(() => {});
    } else {
      // Local fallback
      setComputers(snapshotAssets);
    }

    // Record audit log
    const auditEntry: InventoryAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      action: 'restore_full_snapshot',
      actorName,
      actorEmail: currentUser?.email || 'admin@system.internal',
      actorRole,
      scope: targetSnapshot.scopeCompanyName || 'Organization-Wide',
      affectedCount: snapshotAssets.length,
      details: `Restored full hardware inventory to snapshot "${targetSnapshot.name}". Restored ${restoredCount} missing, updated ${updatedCount} altered, archived ${removedCount} newer records.`,
      snapshotId,
      status: 'success',
    };

    if (currentUser) {
      setDoc(doc(db, 'inventory_audit_logs', auditEntry.id), sanitizeForFirestore(auditEntry)).catch(() => {});
    }
    setInventoryAuditLogs((prev) => [auditEntry, ...prev]);

    // Save to dedicated Firestore 'auditLogs' collection via AuditLogService
    await AuditLogService.logSnapshotRestoration({
      actingUserId: currentUser?.id || 'usr-admin',
      actingUserName: actorName,
      actingUserRole: actorRole,
      actingUserEmail: currentUser?.email || 'admin@system.internal',
      affectedAssetCount: snapshotAssets.length,
      snapshotId,
      restorationType: 'full',
      restoredCount,
      updatedCount,
      removedCount,
      details: `Restored full hardware inventory to snapshot "${targetSnapshot.name}". Restored ${restoredCount} missing, updated ${updatedCount} altered, archived ${removedCount} newer records.`,
      metadata: { targetSnapshotName: targetSnapshot.name, restoredCount, updatedCount, removedCount },
    }).catch((e) => console.warn('AuditLogService logSnapshotRestoration notice:', e));

    return { restoredCount, updatedCount, removedCount };
  };

  const restoreDeletedAssets = async (
    snapshotId: string,
    assetIdsToRecover: string[]
  ): Promise<{ recoveredCount: number }> => {
    const targetSnapshot = inventorySnapshots.find((s) => s.id === snapshotId);
    if (!targetSnapshot) {
      throw new Error(`Snapshot with ID "${snapshotId}" was not found.`);
    }

    const snapshotAssets = await getFullSnapshotAssets(targetSnapshot);
    const assetsToRecover = snapshotAssets.filter((a) => assetIdsToRecover.includes(a.id));

    if (assetsToRecover.length === 0) {
      throw new Error('No matching asset records found to recover.');
    }

    // Safety: Backup before recovering deleted assets
    await createInventorySnapshot({
      name: `Pre-Recovery Backup (${new Date().toLocaleDateString()})`,
      description: `Automatic snapshot before recovering ${assetsToRecover.length} previously deleted assets from snapshot "${targetSnapshot.name}"`,
      operationType: 'pre_rollback',
      scopeCompanyId: targetSnapshot.scopeCompanyId,
      reason: 'Safety backup before recovering deleted hardware assets',
    });

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || 'Administrator';
    const actorRole = (currentUser?.role as UserRole) || 'admin';

    if (currentUser) {
      await writeBatchChunks(
        assetsToRecover.map((asset) => (batch) => {
          const recoveredAsset: Computer = {
            ...asset,
            isArchived: false,
            archivedAt: undefined,
            archivedByName: undefined,
            archivedReason: undefined,
            updatedAt: now,
            auditHistory: [
              {
                id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: 'created',
                actorName,
                actorRole,
                message: `Recovered deleted hardware asset from snapshot "${targetSnapshot.name}" with original Asset ID and specs`,
                timestamp: now,
              },
              ...(asset.auditHistory || []),
            ],
          };
          batch.set(doc(db, 'computers', asset.id), sanitizeForFirestore(recoveredAsset));
        })
      );
    } else {
      setComputers((prev) => [...prev, ...assetsToRecover]);
    }

    // Record audit log
    const auditEntry: InventoryAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      action: 'restore_deleted_assets',
      actorName,
      actorEmail: currentUser?.email || 'admin@system.internal',
      actorRole,
      scope: targetSnapshot.scopeCompanyName || 'Organization-Wide',
      affectedCount: assetsToRecover.length,
      affectedAssetIds: assetsToRecover.map((a) => a.id),
      details: `Recovered ${assetsToRecover.length} deleted assets from snapshot "${targetSnapshot.name}" retaining original IDs and specs.`,
      snapshotId,
      status: 'success',
    };

    if (currentUser) {
      setDoc(doc(db, 'inventory_audit_logs', auditEntry.id), sanitizeForFirestore(auditEntry)).catch(() => {});
    }
    setInventoryAuditLogs((prev) => [auditEntry, ...prev]);

    // Save to dedicated Firestore 'auditLogs' collection via AuditLogService
    await AuditLogService.logSnapshotRestoration({
      actingUserId: currentUser?.id || 'usr-admin',
      actingUserName: actorName,
      actingUserRole: actorRole,
      actingUserEmail: currentUser?.email || 'admin@system.internal',
      affectedAssetCount: assetsToRecover.length,
      snapshotId,
      restorationType: 'deleted_assets',
      restoredCount: assetsToRecover.length,
      details: `Recovered ${assetsToRecover.length} deleted assets from snapshot "${targetSnapshot.name}" retaining original IDs and specs.`,
      metadata: { targetSnapshotName: targetSnapshot.name, assetIds: assetsToRecover.map((a) => a.id) },
    }).catch((e) => console.warn('AuditLogService logSnapshotRestoration notice:', e));

    return { recoveredCount: assetsToRecover.length };
  };

  const deleteInventorySnapshot = async (snapshotId: string): Promise<void> => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can manage or delete inventory snapshots.');
    }

    const targetSnapshot = inventorySnapshots.find((s) => s.id === snapshotId);
    if (!targetSnapshot) return;

    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'inventory_snapshots', snapshotId));
      } catch (err) {
        console.warn('Snapshot deletion error:', err);
      }
    }

    setInventorySnapshots((prev) => prev.filter((s) => s.id !== snapshotId));

    // Audit log
    const auditEntry: InventoryAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      action: 'delete_asset',
      actorName: currentUser?.fullName || 'Administrator',
      actorEmail: currentUser?.email || 'admin@system.internal',
      actorRole: 'admin',
      scope: 'Organization-Wide',
      affectedCount: 1,
      details: `Removed historical snapshot "${targetSnapshot.name}" (${snapshotId}).`,
      snapshotId,
      status: 'success',
    };
    if (currentUser) {
      setDoc(doc(db, 'inventory_audit_logs', auditEntry.id), sanitizeForFirestore(auditEntry)).catch(() => {});
    }
    setInventoryAuditLogs((prev) => [auditEntry, ...prev]);
  };

  // Bulk Inventory Operations
  const bulkArchiveAssets = async (assetIds: string[], reason?: string): Promise<number> => {
    if (assetIds.length === 0) return 0;

    const targetAssets = computers.filter((c) => assetIds.includes(c.id));
    if (targetAssets.length === 0) return 0;

    // Snapshot before archiving
    await createInventorySnapshot({
      name: `Pre-Bulk Archive (${new Date().toLocaleDateString()})`,
      description: `Automatic snapshot before archiving ${targetAssets.length} assets`,
      operationType: 'pre_bulk_update',
      assetsToSnapshot: targetAssets,
      reason: reason || 'Safety backup prior to bulk archive',
    });

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || 'Administrator';
    const actorRole = (currentUser?.role as UserRole) || 'admin';

    if (currentUser) {
      await writeBatchChunks(
        targetAssets.map((asset) => (batch) => {
          batch.update(doc(db, 'computers', asset.id), {
            isArchived: true,
            archivedAt: now,
            archivedByName: actorName,
            archivedReason: reason || 'Bulk archive by administrator',
            status: 'retired',
            updatedAt: now,
          });
        })
      );
    } else {
      setComputers((prev) =>
        prev.map((c) =>
          assetIds.includes(c.id)
            ? { ...c, isArchived: true, archivedAt: now, archivedByName: actorName, status: 'retired', updatedAt: now }
            : c
        )
      );
    }

    const auditEntry: InventoryAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      action: 'bulk_archive',
      actorName,
      actorEmail: currentUser?.email || 'admin@system.internal',
      actorRole,
      scope: 'Selected Assets',
      affectedCount: targetAssets.length,
      affectedAssetIds: targetAssets.map((a) => a.id),
      details: `Archived ${targetAssets.length} hardware assets. Reason: ${reason || 'Bulk administrative action'}`,
      status: 'success',
    };

    if (currentUser) {
      setDoc(doc(db, 'inventory_audit_logs', auditEntry.id), sanitizeForFirestore(auditEntry)).catch(() => {});
    }
    setInventoryAuditLogs((prev) => [auditEntry, ...prev]);

    // Save to dedicated Firestore 'auditLogs' collection via AuditLogService
    await AuditLogService.recordAction({
      action: 'bulk_archive',
      actingUserId: currentUser?.id || 'usr-admin',
      actingUserName: actorName,
      actingUserRole: actorRole,
      actingUserEmail: currentUser?.email || 'admin@system.internal',
      affectedAssetCount: targetAssets.length,
      affectedAssetIds: targetAssets.map((a) => a.id),
      scope: 'Selected Assets',
      details: `Archived ${targetAssets.length} hardware assets. Reason: ${reason || 'Bulk administrative action'}`,
    }).catch((e) => console.warn('AuditLogService recordAction notice:', e));

    return targetAssets.length;
  };

  const bulkDeleteAssets = async (
    assetIds: string[],
    confirmationWord: string,
    reason?: string
  ): Promise<number> => {
    if (confirmationWord.trim().toUpperCase() !== 'DELETE') {
      throw new Error('Confirmation mismatch: You must explicitly type "DELETE" to permanently remove assets.');
    }

    if (assetIds.length === 0) return 0;

    const targetAssets = computers.filter((c) => assetIds.includes(c.id));
    if (targetAssets.length === 0) return 0;

    // Safeguard: Check IT Admin authorization scope
    const isSuperAdmin =
      currentUser?.email === 'rahulprashad80@gmail.com' ||
      currentUser?.username === 'rahulprasad' ||
      (!currentUser?.companyId && currentUser?.username !== 'sameertupe');

    if (!isSuperAdmin) {
      const authorizedCompanyId = currentUser?.companyId || 'comp-agipl';
      const unauthorized = targetAssets.filter((c) => c.companyId && c.companyId !== authorizedCompanyId);
      if (unauthorized.length > 0) {
        throw new Error(
          `Unauthorized: As an IT Admin, you can only delete hardware assets within your assigned company (${authorizedCompanyId}). Found ${unauthorized.length} assets outside your scope.`
        );
      }
    }

    // MANDATORY REQUIREMENT: Create recoverable snapshot BEFORE destructive deletion.
    // If snapshot fails, the exception will halt execution and prevent deletion!
    const snapshotId = await createInventorySnapshot({
      name: `Pre-Bulk Delete Backup (${new Date().toLocaleDateString()})`,
      description: `Automatic recoverable snapshot before deleting ${targetAssets.length} assets. Reason: ${reason || 'Bulk deletion'}`,
      operationType: 'pre_bulk_delete',
      assetsToSnapshot: targetAssets,
      reason: reason || 'Automatic safeguard backup prior to asset deletion',
    });

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || 'Administrator';
    const actorRole = (currentUser?.role as UserRole) || 'admin';

    // Delete ONLY from computers collection. Helpdesk tickets, employees, accounts, attachments are strictly preserved!
    if (currentUser) {
      await writeBatchChunks(
        targetAssets.map((asset) => (batch) => {
          batch.delete(doc(db, 'computers', asset.id));
        })
      );
    } else {
      setComputers((prev) => prev.filter((c) => !assetIds.includes(c.id)));
    }

    const auditEntry: InventoryAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      action: 'bulk_delete',
      actorName,
      actorEmail: currentUser?.email || 'admin@system.internal',
      actorRole,
      scope: isSuperAdmin ? 'Organization-Wide' : 'Company Scoped',
      affectedCount: targetAssets.length,
      affectedAssetIds: targetAssets.map((a) => a.id),
      details: `Permanently removed ${targetAssets.length} hardware assets. Pre-deletion recoverable snapshot created with ID: ${snapshotId}. Reason: ${reason || 'Administrator bulk deletion'}`,
      snapshotId,
      status: 'success',
    };

    if (currentUser) {
      setDoc(doc(db, 'inventory_audit_logs', auditEntry.id), sanitizeForFirestore(auditEntry)).catch(() => {});
    }
    setInventoryAuditLogs((prev) => [auditEntry, ...prev]);

    // Save to dedicated Firestore 'auditLogs' collection via AuditLogService
    await AuditLogService.logBulkDeletion({
      actingUserId: currentUser?.id || 'usr-admin',
      actingUserName: actorName,
      actingUserRole: actorRole,
      actingUserEmail: currentUser?.email || 'admin@system.internal',
      affectedAssetCount: targetAssets.length,
      assetIds: targetAssets.map((a) => a.id),
      isClearAll: false,
      scope: isSuperAdmin ? 'Organization-Wide' : 'Company Scoped',
      reason,
      snapshotId,
      details: `Permanently removed ${targetAssets.length} hardware assets. Pre-deletion recoverable snapshot created with ID: ${snapshotId}. Reason: ${reason || 'Administrator bulk deletion'}`,
    }).catch((e) => console.warn('AuditLogService logBulkDeletion notice:', e));

    return targetAssets.length;
  };

  const clearAllInventory = async (
    confirmationWord: string,
    reason?: string,
    targetCompanyId?: string
  ): Promise<number> => {
    if (confirmationWord.trim().toUpperCase() !== 'DELETE') {
      throw new Error('Confirmation mismatch: You must explicitly type "DELETE" to clear inventory records.');
    }

    const isSuperAdmin =
      currentUser?.email === 'rahulprashad80@gmail.com' ||
      currentUser?.username === 'rahulprasad' ||
      (!currentUser?.companyId && currentUser?.username !== 'sameertupe');

    // Super Admin can clear org-wide; IT Admin is strictly restricted to their company scope
    let assetsToClear = [...computers];
    if (!isSuperAdmin) {
      const authorizedCompanyId = currentUser?.companyId || 'comp-agipl';
      assetsToClear = computers.filter((c) => c.companyId === authorizedCompanyId);
      if (assetsToClear.length === 0) {
        throw new Error('No assets found in your authorized company scope to clear.');
      }
    } else if (targetCompanyId) {
      assetsToClear = computers.filter((c) => c.companyId === targetCompanyId);
    }

    if (assetsToClear.length === 0) {
      return 0;
    }

    // MANDATORY REQUIREMENT: Create recoverable snapshot BEFORE clearing.
    // If snapshot creation fails, the function throws and execution halts immediately!
    const snapshotId = await createInventorySnapshot({
      name: `Pre-Inventory Clear (${new Date().toLocaleDateString()})`,
      description: `Comprehensive recoverable backup taken immediately prior to clearing ${assetsToClear.length} inventory assets.`,
      operationType: 'pre_clear',
      assetsToSnapshot: assetsToClear,
      scopeCompanyId: isSuperAdmin ? targetCompanyId : (currentUser?.companyId || 'comp-agipl'),
      reason: reason || 'Inventory reset/clear operation',
    });

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || 'Administrator';
    const actorRole = (currentUser?.role as UserRole) || 'admin';

    // Clear ONLY computers. NEVER touch employees, tickets, or user accounts!
    if (currentUser) {
      await writeBatchChunks(
        assetsToClear.map((asset) => (batch) => {
          batch.delete(doc(db, 'computers', asset.id));
        })
      );
    } else {
      const clearIds = new Set(assetsToClear.map((c) => c.id));
      setComputers((prev) => prev.filter((c) => !clearIds.has(c.id)));
    }

    const auditEntry: InventoryAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      action: 'clear_inventory',
      actorName,
      actorEmail: currentUser?.email || 'admin@system.internal',
      actorRole,
      scope: isSuperAdmin && !targetCompanyId ? 'Organization-Wide (ALL COMPANIES)' : `Company: ${targetCompanyId || currentUser?.companyId}`,
      affectedCount: assetsToClear.length,
      details: `Cleared ${assetsToClear.length} hardware inventory records. Recoverable snapshot created: ${snapshotId}. Ticket references and employee accounts preserved. Reason: ${reason || 'Administrator clearing'}`,
      snapshotId,
      status: 'success',
    };

    if (currentUser) {
      setDoc(doc(db, 'inventory_audit_logs', auditEntry.id), sanitizeForFirestore(auditEntry)).catch(() => {});
    }
    setInventoryAuditLogs((prev) => [auditEntry, ...prev]);

    // Save to dedicated Firestore 'auditLogs' collection via AuditLogService
    await AuditLogService.logBulkDeletion({
      actingUserId: currentUser?.id || 'usr-admin',
      actingUserName: actorName,
      actingUserRole: actorRole,
      actingUserEmail: currentUser?.email || 'admin@system.internal',
      affectedAssetCount: assetsToClear.length,
      assetIds: assetsToClear.map((a) => a.id),
      isClearAll: true,
      scope: isSuperAdmin && !targetCompanyId ? 'Organization-Wide (ALL COMPANIES)' : `Company: ${targetCompanyId || currentUser?.companyId}`,
      reason,
      snapshotId,
      details: `Cleared ${assetsToClear.length} hardware inventory records. Recoverable snapshot created: ${snapshotId}. Ticket references and employee accounts preserved. Reason: ${reason || 'Administrator clearing'}`,
    }).catch((e) => console.warn('AuditLogService logBulkDeletion notice:', e));

    return assetsToClear.length;
  };

  const bulkUpdateAssets = async (
    assetIds: string[],
    updates: Partial<Computer>,
    reason?: string
  ): Promise<number> => {
    if (assetIds.length === 0) return 0;
    const targetAssets = computers.filter((c) => assetIds.includes(c.id));
    if (targetAssets.length === 0) return 0;

    // Snapshot before updating
    await createInventorySnapshot({
      name: `Pre-Bulk Update (${new Date().toLocaleDateString()})`,
      description: `Automatic snapshot before bulk updating ${targetAssets.length} assets`,
      operationType: 'pre_bulk_update',
      assetsToSnapshot: targetAssets,
      reason: reason || 'Safety backup prior to bulk update',
    });

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || 'Administrator';
    const actorRole = (currentUser?.role as UserRole) || 'admin';

    if (currentUser) {
      await writeBatchChunks(
        targetAssets.map((asset) => (batch) => {
          batch.update(doc(db, 'computers', asset.id), sanitizeForFirestoreUpdate({
            ...updates,
            updatedAt: now,
          }));
        })
      );
    } else {
      setComputers((prev) =>
        prev.map((c) => (assetIds.includes(c.id) ? { ...c, ...updates, updatedAt: now } : c))
      );
    }

    const auditEntry: InventoryAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      action: 'bulk_update',
      actorName,
      actorEmail: currentUser?.email || 'admin@system.internal',
      actorRole,
      scope: 'Selected Assets',
      affectedCount: targetAssets.length,
      affectedAssetIds: targetAssets.map((a) => a.id),
      details: `Bulk updated ${targetAssets.length} assets with: ${Object.keys(updates).join(', ')}. Reason: ${reason || 'Bulk modification'}`,
      status: 'success',
    };

    if (currentUser) {
      setDoc(doc(db, 'inventory_audit_logs', auditEntry.id), sanitizeForFirestore(auditEntry)).catch(() => {});
    }
    setInventoryAuditLogs((prev) => [auditEntry, ...prev]);

    // Save to dedicated Firestore 'auditLogs' collection via AuditLogService
    await AuditLogService.recordAction({
      action: 'bulk_update',
      actingUserId: currentUser?.id || 'usr-admin',
      actingUserName: actorName,
      actingUserRole: actorRole,
      actingUserEmail: currentUser?.email || 'admin@system.internal',
      affectedAssetCount: targetAssets.length,
      affectedAssetIds: targetAssets.map((a) => a.id),
      scope: 'Selected Assets',
      details: `Bulk updated ${targetAssets.length} assets with: ${Object.keys(updates).join(', ')}. Reason: ${reason || 'Bulk modification'}`,
      metadata: { fields: Object.keys(updates) },
    }).catch((e) => console.warn('AuditLogService recordAction notice:', e));

    return targetAssets.length;
  };

  // Safe Schema Upgrade
  const upgradeInventorySchema = async (targetVersion: number = 2): Promise<{
    success: boolean;
    upgradedCount: number;
    preview: SchemaUpgradePreview;
  }> => {
    if (computers.length === 0) {
      const emptyPreview: SchemaUpgradePreview = {
        currentVersion: 1,
        targetVersion,
        totalAssets: 0,
        addedFields: ['schemaVersion', 'procurementType', 'customFields', 'isArchived'],
        modifiedFields: ['manufacturer', 'processor', 'windowsVersion'],
        normalizedCount: 0,
        backfilledCount: 0,
        preservedUnknownCount: 0,
        sampleUpgradedAssets: [],
      };
      return { success: true, upgradedCount: 0, preview: emptyPreview };
    }

    // MANDATORY REQUIREMENT: Backup existing inventory before applying schema upgrade
    const snapshotId = await createInventorySnapshot({
      name: `Pre-Schema Upgrade v${targetVersion} Backup`,
      description: `Complete inventory snapshot before migrating schema to version ${targetVersion}`,
      operationType: 'pre_upgrade',
      reason: `Automated safety backup prior to inventory schema migration to v${targetVersion}`,
    });

    const now = new Date().toISOString();
    let normalizedCount = 0;
    let backfilledCount = 0;
    let preservedUnknownCount = 0;

    const upgradedAssets: Computer[] = computers.map((asset) => {
      let isNormalized = false;
      let isBackfilled = false;

      // 1. Normalize aliases to 28 standard fields without losing original data
      const manufacturer = asset.manufacturer || asset.brand || 'Generic';
      const processor = asset.processor || asset.cpu || '';
      const procurementType = asset.procurementType || asset.newOrOld || 'New (NH)';
      const windowsVersion = asset.windowsVersion || asset.os || '';
      const warrantyEnd = asset.warrantyEnd || asset.warrantyExpiration || '';

      if (!asset.manufacturer || !asset.processor || !asset.procurementType) {
        isNormalized = true;
      }

      // 2. Preserve any unknown or custom fields in customFields map
      const standardKeys = new Set([
        'id', 'assetTag', 'companyId', 'company', 'type', 'assetNumber',
        'condition', 'assignedEmployeeName', 'assetUserName', 'departmentId',
        'department', 'location', 'ipAddress', 'serialNumber', 'brand',
        'manufacturer', 'model', 'cpu', 'processor', 'purchaseDate',
        'procurementType', 'newOrOld', 'storage', 'ram', 'os', 'windowsVersion',
        'msOffice', 'escan', 'motherboard', 'display', 'displaySize', 'lanCard',
        'upsBattery', 'warrantyStart', 'warrantyExpiration', 'warrantyEnd',
        'hostname', 'specs', 'purchaseCost', 'vendor', 'status',
        'assignedEmployeeId', 'assignedDate', 'returnedDate', 'attachments',
        'auditHistory', 'notes', 'createdAt', 'updatedAt', 'isArchived',
        'archivedAt', 'archivedByName', 'archivedReason', 'schemaVersion', 'customFields'
      ]);

      const extractedCustom: Record<string, any> = { ...(asset.customFields || {}) };
      Object.entries(asset).forEach(([key, val]) => {
        if (!standardKeys.has(key) && val !== undefined) {
          extractedCustom[key] = val;
          preservedUnknownCount++;
        }
      });

      // 3. Backfill defaults for missing required standard fields
      const assetNumber = asset.assetNumber || asset.assetTag;
      if (!asset.assetNumber) isBackfilled = true;

      if (isNormalized) normalizedCount++;
      if (isBackfilled) backfilledCount++;

      return {
        ...asset,
        schemaVersion: targetVersion,
        manufacturer,
        brand: manufacturer,
        processor,
        cpu: processor,
        procurementType,
        newOrOld: procurementType,
        windowsVersion,
        os: windowsVersion,
        warrantyEnd,
        warrantyExpiration: warrantyEnd || asset.warrantyExpiration,
        assetNumber,
        customFields: extractedCustom,
        updatedAt: now,
      };
    });

    const preview: SchemaUpgradePreview = {
      currentVersion: 1,
      targetVersion,
      totalAssets: computers.length,
      addedFields: [
        'schemaVersion',
        'procurementType',
        'windowsVersion',
        'customFields',
        'isArchived',
        'assetNumber'
      ],
      modifiedFields: ['manufacturer', 'processor', 'windowsVersion', 'warrantyEnd'],
      normalizedCount,
      backfilledCount,
      preservedUnknownCount,
      sampleUpgradedAssets: upgradedAssets.slice(0, 5),
    };

    // Apply upgrade to database
    if (currentUser) {
      await writeBatchChunks(
        upgradedAssets.map((asset) => (batch) => {
          batch.set(doc(db, 'computers', asset.id), sanitizeForFirestore(asset));
        })
      );
    } else {
      setComputers(upgradedAssets);
    }

    // Record audit log
    const auditEntry: InventoryAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      action: 'upgrade_schema',
      actorName: currentUser?.fullName || 'Administrator',
      actorEmail: currentUser?.email || 'admin@system.internal',
      actorRole: (currentUser?.role as UserRole) || 'admin',
      scope: 'Organization-Wide',
      affectedCount: upgradedAssets.length,
      details: `Upgraded inventory schema to version ${targetVersion}. Normalized ${normalizedCount} assets, backfilled ${backfilledCount}, preserved ${preservedUnknownCount} custom fields. Pre-upgrade snapshot ID: ${snapshotId}`,
      snapshotId,
      status: 'success',
      metadata: { targetVersion, normalizedCount, backfilledCount },
    };

    if (currentUser) {
      setDoc(doc(db, 'inventory_audit_logs', auditEntry.id), sanitizeForFirestore(auditEntry)).catch(() => {});
    }
    setInventoryAuditLogs((prev) => [auditEntry, ...prev]);

    // Save to dedicated Firestore 'auditLogs' collection via AuditLogService
    await AuditLogService.logInventoryUpgrade({
      actingUserId: currentUser?.id || 'usr-admin',
      actingUserName: currentUser?.fullName || 'Administrator',
      actingUserRole: (currentUser?.role as UserRole) || 'admin',
      actingUserEmail: currentUser?.email || 'admin@system.internal',
      affectedAssetCount: upgradedAssets.length,
      targetVersion,
      normalizedCount,
      backfilledCount,
      preservedUnknownCount,
      snapshotId,
      details: `Upgraded inventory schema to version ${targetVersion}. Normalized ${normalizedCount} assets, backfilled ${backfilledCount}, preserved ${preservedUnknownCount} custom fields. Pre-upgrade snapshot ID: ${snapshotId}`,
      metadata: { targetVersion, normalizedCount, backfilledCount, preservedUnknownCount },
    }).catch((e) => console.warn('AuditLogService logInventoryUpgrade notice:', e));

    return {
      success: true,
      upgradedCount: upgradedAssets.length,
      preview,
    };
  };

  // Safe Seeding / Master Data Synchronization
  const seedDatabase = async (_force: boolean = false): Promise<void> => {
    setIsSeeding(true);
    try {
      await ensureMasterDataInFirestore();
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <DataContext.Provider
      value={{
        companies,
        departments,
        employees,
        computers,
        tickets,
        isLoading,
        error,
        createTicket,
        updateTicket,
        deleteTicket,
        addTicketComment,
        getTicketComments,
        addTicketAttachment,
        addTimelineEvent,
        createComputer,
        updateComputer,
        deleteComputer,
        assignComputer,
        unassignComputer,
        retireComputer,
        addComputerAttachment,
        addComputerAuditEntry,
        createCompany,
        updateCompany,
        deleteCompany,
        archiveCompany,
        restoreCompany,
        reassignCompanyRecords,
        createDepartment,
        updateDepartment,
        deleteDepartment,
        archiveDepartment,
        restoreDepartment,
        reassignDepartmentRecords,
        organizationAuditLog,
        addOrganizationAuditEntry,
        createEmployee,
        updateEmployee,
        deleteEmployee,
        locations,
        createLocation,
        updateLocation,
        deleteLocation,
        inventorySnapshots,
        inventoryAuditLogs,
        auditLogs,
        recordAuditLog: (params: RecordActionParams) => AuditLogService.recordAction(params),
        createInventorySnapshot,
        rollbackSelectedAssets,
        restoreFullInventorySnapshot,
        restoreDeletedAssets,
        deleteInventorySnapshot,
        bulkArchiveAssets,
        bulkDeleteAssets,
        clearAllInventory,
        bulkUpdateAssets,
        upgradeInventorySchema,
        seedDatabase,
        isSeeding,
        isLiveSync,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
