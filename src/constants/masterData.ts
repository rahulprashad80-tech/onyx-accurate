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
