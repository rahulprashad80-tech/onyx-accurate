export interface MasterCompanyDef {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
}

export const MASTER_COMPANIES: MasterCompanyDef[] = [
  {
    id: 'comp-agipl',
    name: 'AGIPL',
    code: 'AGIPL',
    contactEmail: 'contact@agipl.internal',
  },
  {
    id: 'comp-asspl',
    name: 'ASSPL',
    code: 'ASSPL',
    contactEmail: 'contact@asspl.internal',
  },
  {
    id: 'comp-onyx',
    name: 'ONYX',
    code: 'ONYX',
    contactEmail: 'contact@onyx.internal',
  },
];

export const MASTER_DEPARTMENTS: string[] = [
  'SALES',
  'ADMINISTRATION',
  'CUSTOMER SUPPORT',
  'ASSEMBLY',
  'COSTING',
  'DEMO ROOM',
  'DISPATCH',
  'DESIGN',
  'ENGINEERING',
  'ELECTRONICS',
  'EXPORT',
  'FINANCE',
  'IT',
  'HR',
  'MACHINE SHOP',
  'MAINTENANCE',
  'MARKETING',
  'PLANNING',
  'OSS',
  'PURCHASE',
  'PRODUCTION',
  'QUALITY',
  'QUARTA',
  'R&D',
  'PROJECTS',
  'TPI',
  'STORES',
  'SECURITY',
  'TPM',
];

export interface MasterLocationDef {
  id: string;
  name: string;
  code: string;
  building: string;
  floor: string;
  room?: string;
  address?: string;
  description?: string;
  status: 'active' | 'inactive';
}

export const MASTER_LOCATIONS: MasterLocationDef[] = [
  {
    id: 'loc-it-storage',
    name: 'IT Storage Lab',
    code: 'LOC-IT-LAB',
    building: 'HQ Main Tower',
    floor: 'Floor 1',
    room: 'Room 102 (Secure Inventory Bay)',
    address: '100 Tech Center Blvd, Suite 100',
    description: 'Central staging area for new, unassigned, and incoming computer hardware.',
    status: 'active',
  },
  {
    id: 'loc-server-room',
    name: 'Server Room 101',
    code: 'LOC-SRV-101',
    building: 'HQ Main Tower',
    floor: 'Basement B1',
    room: 'Rack Suite A-D',
    address: '100 Tech Center Blvd, Suite B1',
    description: 'Primary datacenter housing core server nodes, network routers, and switches.',
    status: 'active',
  },
  {
    id: 'loc-eng-workstations',
    name: 'Engineering Lab',
    code: 'LOC-ENG-FL3',
    building: 'HQ Tower B',
    floor: 'Floor 3',
    room: 'East Wing Lab 304',
    address: '102 Tech Center Blvd, Floor 3',
    description: 'Developer workstations, QA testing docks, and high-performance CAD rigs.',
    status: 'active',
  },
  {
    id: 'loc-exec-suites',
    name: 'Executive Boardroom & Suites',
    code: 'LOC-EXEC-FL4',
    building: 'HQ Main Tower',
    floor: 'Floor 4',
    room: 'Boardroom 401 & C-Suite',
    address: '100 Tech Center Blvd, Floor 4',
    description: 'Executive management presentation laptops, conference displays, and docks.',
    status: 'active',
  },
  {
    id: 'loc-ops-hub',
    name: 'Operations Hub',
    code: 'LOC-OPS-FL2',
    building: 'West Campus',
    floor: 'Floor 2',
    room: 'Open Operations Floor 210',
    address: '105 Industrial Way, Floor 2',
    description: 'Logistics, scheduling, dispatch, and plant monitoring workstations.',
    status: 'active',
  },
  {
    id: 'loc-customer-support',
    name: 'Customer Support Bay',
    code: 'LOC-CS-FL2',
    building: 'West Campus',
    floor: 'Floor 2',
    room: 'Support Pods 1-16',
    address: '105 Industrial Way, Floor 2',
    description: 'Customer success and technical support call center laptops and dual monitors.',
    status: 'active',
  },
  {
    id: 'loc-prod-floor',
    name: 'Production Floor Workstations',
    code: 'LOC-MFG-01',
    building: 'Manufacturing Unit 1',
    floor: 'Ground Floor',
    room: 'Quality & Assembly Station',
    address: '200 Plant Road, Bay 3',
    description: 'Ruggedized shop-floor terminals for CNC inspection and assembly logging.',
    status: 'active',
  },
  {
    id: 'loc-remote',
    name: 'Remote / Work From Home',
    code: 'LOC-WFH',
    building: 'Remote Distributed',
    floor: 'N/A',
    room: 'Home Office',
    address: 'Remote Telecommute',
    description: 'Laptops and peripheral monitors assigned to remote staff.',
    status: 'active',
  },
];

