import { AppUser } from '../types';

/**
 * Secure password hashing using the standard Web Crypto API (SHA-256 with salt)
 * Plain text passwords are NEVER stored in the database.
 */

export async function generateSalt(length = 16): Promise<string> {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  const salt = existingSalt || (await generateSalt());
  const encoder = new TextEncoder();
  // Combine unique salt with password
  const data = encoder.encode(`${salt}:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return { hash, salt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const result = await hashPassword(password, salt);
  return result.hash === hash;
}

export async function createInitialAdminUsers(): Promise<AppUser[]> {
  const salt1 = 'salt_sameertupe_9876';
  const { hash: hash1, salt: s1 } = await hashPassword('Acculate@', salt1);
  const salt2 = 'salt_rahulprasad_5432';
  const { hash: hash2, salt: s2 } = await hashPassword('Acculate@', salt2);

  const now = new Date().toISOString();
  return [
    {
      id: 'usr-admin-sameertupe',
      fullName: 'Sameer Tupe',
      username: 'sameertupe',
      email: 'sameertupe@acculate.internal',
      passwordHash: hash1,
      salt: s1,
      role: 'admin',
      status: 'active',
      mustChangePassword: false,
      companyId: 'comp-agipl',
      companyName: 'AGIPL',
      departmentId: 'dept-agipl-it',
      departmentName: 'IT',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr-admin-rahulprasad',
      fullName: 'Rahul Prasad',
      username: 'rahulprasad',
      email: 'rahulprashad80@gmail.com',
      passwordHash: hash2,
      salt: s2,
      role: 'admin',
      status: 'active',
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
