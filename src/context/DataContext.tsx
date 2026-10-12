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
  Computer, 
  ComputerAttachment,
  ComputerAuditEntry,
  ComputerCondition,
  ComputerStatus,
  ComputerType,
  OrganizationAuditEntry,
  Ticket, 
  TicketComment,
  TicketAttachment,
  TicketTimelineEvent,
  TicketStatus,
  TicketPriority,
  UserRole,
} from '../types';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { sanitizeForFirestore, sanitizeForFirestoreUpdate } from '../firebase/utils';
import { MASTER_COMPANIES, MASTER_DEPARTMENTS } from '../constants/masterData';
import { useAuth } from './AuthContext';

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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>(getDefaultCompanies);
  const [departments, setDepartments] = useState<Department[]>(getDefaultDepartments);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<string, TicketComment[]>>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiveSync, setIsLiveSync] = useState<boolean>(false);

  const [organizationAuditLog, setOrganizationAuditLog] = useState<OrganizationAuditEntry[]>([]);

  // 1. Immediately subscribe to public companies & departments master data (no auth required)
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

    // Auto-verify and write master data to Firestore without duplicates
    ensureMasterDataInFirestore().catch((err) => {
      console.warn('Master data auto-sync notice:', err);
    });

    return () => {
      unsubCompanies();
      unsubDepartments();
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
        list.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setEmployees(list);
      },
      (err) => {
        console.warn('Employees snapshot error:', err);
        handleFirestoreError(err, OperationType.GET, 'employees');
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

    // Auto-verify that master companies (AGIPL, ASSPL, ONYX) and 29 standard departments are in Firestore
    ensureMasterDataInFirestore().catch((err) => {
      console.warn('Master data auto-sync check error:', err);
    });

    return () => {
      unsubEmployees();
      unsubComputers();
      unsubTickets();
      unsubAudits();
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
    const auditEntry: Omit<ComputerAuditEntry, 'id' | 'timestamp'> = {
      type: 'assigned',
      actorName: actor?.name || 'IT Admin',
      actorRole: actor?.role || 'admin',
      message: `Assigned hardware asset to ${employeeName}`,
      newValue: employeeName,
    };

    await updateComputer(
      id,
      {
        status: 'assigned',
        assignedEmployeeId: employeeId,
        assignedEmployeeName: employeeName,
        companyId: companyId || undefined,
        departmentId: departmentId || undefined,
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
      const docRef = doc(db, 'employees', id);
      await updateDoc(docRef, sanitizeForFirestoreUpdate({
        ...updates,
        updatedAt: now,
      }));
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
      await deleteDoc(doc(db, 'employees', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `employees/${id}`);
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
    } catch (err) {
      console.warn('Master data auto-sync notice:', err);
    }
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
