import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { MASTER_COMPANIES, MASTER_DEPARTMENTS } from '../src/constants/masterData';
import { sanitizeForFirestore } from '../src/firebase/utils';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function seedMasterData() {
  const now = new Date().toISOString();
  console.log('--- Checking & Seeding Master Data ---');

  // 1. Fetch existing companies
  const companySnap = await getDocs(collection(db, 'companies'));
  const existingCompanies = new Map<string, { id: string; name: string; code: string }>();
  companySnap.forEach((d) => {
    const data = d.data();
    existingCompanies.set(d.id, { id: d.id, name: data.name, code: data.code });
  });

  const resolvedCompanyIds: { name: string; id: string }[] = [];

  for (const masterCo of MASTER_COMPANIES) {
    let matchedCompanyId: string | null = null;
    for (const [id, co] of existingCompanies.entries()) {
      if (
        (co.name && co.name.trim().toLowerCase() === masterCo.name.toLowerCase()) ||
        (co.code && co.code.trim().toUpperCase() === masterCo.code.toUpperCase())
      ) {
        matchedCompanyId = id;
        break;
      }
    }

    if (!matchedCompanyId) {
      console.log(`Creating master company: ${masterCo.name} (${masterCo.code})`);
      const newCoDoc = {
        id: masterCo.id,
        name: masterCo.name,
        code: masterCo.code,
        contactEmail: masterCo.contactEmail,
        phone: '',
        address: '',
        status: 'active',
        auditHistory: [
          {
            id: `aud-${Date.now()}-${slugify(masterCo.name)}`,
            type: 'created',
            actorName: 'System Setup',
            actorRole: 'admin',
            message: `Master corporate entity ${masterCo.name} initialized in database`,
            timestamp: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'companies', masterCo.id), sanitizeForFirestore(newCoDoc));
      matchedCompanyId = masterCo.id;
      existingCompanies.set(masterCo.id, { id: masterCo.id, name: masterCo.name, code: masterCo.code });
    } else {
      console.log(`Company already exists: ${masterCo.name} [ID: ${matchedCompanyId}]`);
    }

    resolvedCompanyIds.push({ name: masterCo.name, id: matchedCompanyId });
  }

  // 2. Fetch existing departments
  const deptSnap = await getDocs(collection(db, 'departments'));
  const existingDepts = new Set<string>(); // key: `${companyId}::${name.toLowerCase()}`
  deptSnap.forEach((d) => {
    const data = d.data();
    if (data.companyId && data.name) {
      existingDepts.add(`${data.companyId}::${data.name.trim().toLowerCase()}`);
    }
  });

  let createdDeptsCount = 0;

  for (const co of resolvedCompanyIds) {
    for (const deptName of MASTER_DEPARTMENTS) {
      const key = `${co.id}::${deptName.trim().toLowerCase()}`;
      if (!existingDepts.has(key)) {
        const deptId = `dept-${slugify(co.name)}-${slugify(deptName)}`;
        const deptDoc = {
          id: deptId,
          name: deptName,
          code: deptName.length <= 4 ? deptName : undefined,
          companyId: co.id,
          status: 'active',
          auditHistory: [
            {
              id: `aud-${Date.now()}-${slugify(co.name)}-${slugify(deptName)}`,
              type: 'created',
              actorName: 'System Setup',
              actorRole: 'admin',
              message: `Master department ${deptName} initialized for ${co.name}`,
              timestamp: now,
            },
          ],
          createdAt: now,
          updatedAt: now,
        };

        await setDoc(doc(db, 'departments', deptId), sanitizeForFirestore(deptDoc));
        existingDepts.add(key);
        createdDeptsCount++;
      }
    }
  }

  console.log(`Master Data synchronization completed. Created ${createdDeptsCount} new department records.`);
}

if (process.argv[1]?.endsWith('seedMasterData.ts')) {
  seedMasterData()
    .then(() => {
      console.log('Seeding script finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding script failed:', err);
      process.exit(1);
    });
}
