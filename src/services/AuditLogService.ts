import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { sanitizeForFirestore } from '../firebase/utils';
import { AuditLog, AuditLogAction } from '../types';

export const AUDIT_LOGS_COLLECTION = 'auditLogs';
const LOCAL_AUDIT_LOGS_STORAGE_KEY = 'it_desk_audit_logs_v1';

export interface RecordActionParams {
  action: AuditLogAction;
  actingUserId: string;
  actingUserName?: string;
  actingUserEmail?: string;
  actingUserRole?: string;
  affectedAssetCount: number;
  details?: string;
  snapshotId?: string;
  scope?: string;
  affectedAssetIds?: string[];
  status?: 'success' | 'failure' | 'pending';
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface BulkDeletionParams {
  actingUserId: string;
  actingUserName?: string;
  actingUserEmail?: string;
  actingUserRole?: string;
  affectedAssetCount: number;
  assetIds?: string[];
  isClearAll?: boolean;
  scope?: string;
  reason?: string;
  snapshotId?: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface InventoryUpgradeParams {
  actingUserId: string;
  actingUserName?: string;
  actingUserEmail?: string;
  actingUserRole?: string;
  affectedAssetCount: number;
  targetVersion?: number;
  normalizedCount?: number;
  backfilledCount?: number;
  preservedUnknownCount?: number;
  snapshotId?: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface SnapshotRestorationParams {
  actingUserId: string;
  actingUserName?: string;
  actingUserEmail?: string;
  actingUserRole?: string;
  affectedAssetCount: number;
  snapshotId: string;
  restorationType: 'selective' | 'full' | 'deleted_assets' | 'manual_rollback';
  restoredCount?: number;
  updatedCount?: number;
  removedCount?: number;
  details?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

class AuditLogServiceImpl {
  /**
   * Primary method to record an administrative action into the Firestore 'auditLogs' collection.
   * Can be invoked via logAction or recordAction.
   */
  async logAction(params: RecordActionParams): Promise<AuditLog> {
    return this.recordAction(params);
  }

  async recordAction(params: RecordActionParams): Promise<AuditLog> {
    const now = params.timestamp || new Date().toISOString();
    const logId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const logEntry: AuditLog = {
      id: logId,
      action: params.action,
      actingUserId: params.actingUserId,
      actingUserName: params.actingUserName || 'Administrator',
      actingUserEmail: params.actingUserEmail || '',
      actingUserRole: params.actingUserRole || 'admin',
      timestamp: now,
      affectedAssetCount: Number.isFinite(params.affectedAssetCount) ? params.affectedAssetCount : 0,
      details: params.details || '',
      snapshotId: params.snapshotId,
      scope: params.scope || 'Organization-Wide',
      affectedAssetIds: params.affectedAssetIds,
      status: params.status || 'success',
      metadata: params.metadata || {},
      createdAt: now,
    };

    // Save to local storage cache for offline resiliency
    this.saveToLocalCache(logEntry);

    // Save directly to Firestore 'auditLogs' collection
    try {
      const docRef = doc(db, AUDIT_LOGS_COLLECTION, logId);
      await setDoc(docRef, sanitizeForFirestore(logEntry));
    } catch (err) {
      console.warn(`[AuditLogService] Firestore write to '${AUDIT_LOGS_COLLECTION}' notice:`, err);
    }

    return logEntry;
  }

  /**
   * Records bulk asset deletion or complete inventory clear operation.
   */
  async logBulkDeletion(params: BulkDeletionParams): Promise<AuditLog> {
    const action: AuditLogAction = params.isClearAll ? 'clear_inventory' : 'bulk_delete';
    const defaultDetails = params.isClearAll
      ? `Permanently cleared ${params.affectedAssetCount} hardware inventory records.${params.snapshotId ? ` Safeguard snapshot: ${params.snapshotId}.` : ''}${params.reason ? ` Reason: ${params.reason}` : ''}`
      : `Bulk deleted ${params.affectedAssetCount} hardware assets.${params.snapshotId ? ` Pre-deletion snapshot: ${params.snapshotId}.` : ''}${params.reason ? ` Reason: ${params.reason}` : ''}`;

    return this.recordAction({
      action,
      actingUserId: params.actingUserId,
      actingUserName: params.actingUserName,
      actingUserEmail: params.actingUserEmail,
      actingUserRole: params.actingUserRole,
      affectedAssetCount: params.affectedAssetCount,
      affectedAssetIds: params.assetIds,
      scope: params.scope || (params.isClearAll ? 'Organization-Wide' : 'Selected Assets'),
      snapshotId: params.snapshotId,
      details: params.details || defaultDetails,
      metadata: {
        isClearAll: !!params.isClearAll,
        reason: params.reason,
        deletedAssetCount: params.affectedAssetCount,
        ...(params.metadata || {}),
      },
    });
  }

  /**
   * Records an inventory schema migration / upgrade operation.
   */
  async logInventoryUpgrade(params: InventoryUpgradeParams): Promise<AuditLog> {
    const version = params.targetVersion ?? 2;
    const defaultDetails = `Upgraded hardware inventory schema to v${version} across ${params.affectedAssetCount} assets. Normalized ${params.normalizedCount ?? 0}, backfilled ${params.backfilledCount ?? 0}, preserved ${params.preservedUnknownCount ?? 0} custom fields.${params.snapshotId ? ` Pre-upgrade snapshot: ${params.snapshotId}` : ''}`;

    return this.recordAction({
      action: 'upgrade_schema',
      actingUserId: params.actingUserId,
      actingUserName: params.actingUserName,
      actingUserEmail: params.actingUserEmail,
      actingUserRole: params.actingUserRole,
      affectedAssetCount: params.affectedAssetCount,
      snapshotId: params.snapshotId,
      details: params.details || defaultDetails,
      metadata: {
        targetVersion: version,
        normalizedCount: params.normalizedCount ?? 0,
        backfilledCount: params.backfilledCount ?? 0,
        preservedUnknownCount: params.preservedUnknownCount ?? 0,
        ...(params.metadata || {}),
      },
    });
  }

  /**
   * Records a snapshot rollback / restoration operation.
   */
  async logSnapshotRestoration(params: SnapshotRestorationParams): Promise<AuditLog> {
    let action: AuditLogAction = 'snapshot_restore';
    if (params.restorationType === 'selective') {
      action = 'rollback_selected';
    } else if (params.restorationType === 'full') {
      action = 'restore_full_snapshot';
    } else if (params.restorationType === 'deleted_assets') {
      action = 'restore_deleted_assets';
    }

    const defaultDetails = `Restored inventory from snapshot ${params.snapshotId} (${params.restorationType} mode). Affected assets: ${params.affectedAssetCount}.${params.reason ? ` Reason: ${params.reason}` : ''}`;

    return this.recordAction({
      action,
      actingUserId: params.actingUserId,
      actingUserName: params.actingUserName,
      actingUserEmail: params.actingUserEmail,
      actingUserRole: params.actingUserRole,
      affectedAssetCount: params.affectedAssetCount,
      snapshotId: params.snapshotId,
      details: params.details || defaultDetails,
      metadata: {
        restorationType: params.restorationType,
        restoredCount: params.restoredCount,
        updatedCount: params.updatedCount,
        removedCount: params.removedCount,
        reason: params.reason,
        ...(params.metadata || {}),
      },
    });
  }

  /**
   * Fetches recent audit logs from Firestore 'auditLogs' collection with local fallback.
   */
  async getAuditLogs(limitCount: number = 100): Promise<AuditLog[]> {
    try {
      const q = query(
        collection(db, AUDIT_LOGS_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const results: AuditLog[] = [];
        snapshot.forEach((d) => {
          results.push({ id: d.id, ...d.data() } as AuditLog);
        });
        return results;
      }
    } catch (err) {
      console.warn('[AuditLogService] Error fetching audit logs from Firestore:', err);
    }

    return this.getLocalCache().slice(0, limitCount);
  }

  /**
   * Subscribes to real-time updates from the Firestore 'auditLogs' collection.
   */
  subscribeToAuditLogs(
    callback: (logs: AuditLog[]) => void,
    limitCount: number = 100
  ): Unsubscribe {
    try {
      const q = query(
        collection(db, AUDIT_LOGS_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const logs: AuditLog[] = [];
          snapshot.forEach((d) => {
            logs.push({ id: d.id, ...d.data() } as AuditLog);
          });
          callback(logs);
        },
        (err) => {
          console.warn('[AuditLogService] Real-time listener notice:', err);
          callback(this.getLocalCache().slice(0, limitCount));
        }
      );
    } catch (err) {
      console.warn('[AuditLogService] subscribe error, using fallback:', err);
      callback(this.getLocalCache().slice(0, limitCount));
      return () => {};
    }
  }

  private saveToLocalCache(entry: AuditLog) {
    try {
      const current = this.getLocalCache();
      const updated = [entry, ...current.filter((l) => l.id !== entry.id)].slice(0, 300);
      localStorage.setItem(LOCAL_AUDIT_LOGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      // LocalStorage quota or parsing error
    }
  }

  private getLocalCache(): AuditLog[] {
    try {
      const raw = localStorage.getItem(LOCAL_AUDIT_LOGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  }
}

export const AuditLogService = new AuditLogServiceImpl();
export default AuditLogService;
