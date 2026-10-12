import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AppUser, UserRole, UserProfile } from '../types';
import { hashPassword, verifyPassword, createInitialAdminUsers } from '../utils/crypto';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { sanitizeForFirestore, sanitizeForFirestoreUpdate } from '../firebase/utils';

const SESSION_KEY = 'it_desk_auth_session_v1';
const LOCAL_USERS_KEY = 'it_desk_local_users_v1';

interface AuthContextType {
  currentUser: AppUser | null;
  userProfile: UserProfile | null;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  isLoading: boolean;
  users: AppUser[];
  hasAnyUsers: boolean;
  login: (
    usernameOrEmail: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean; user?: AppUser }>;
  changePassword: (
    userId: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  createUser: (
    userData: Omit<AppUser, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginDate' | 'passwordHash' | 'salt'>,
    initialPassword: string
  ) => Promise<string>;
  updateUser: (id: string, updates: Partial<AppUser>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  resetUserPassword: (id: string, newPassword: string, forceResetNextLogin?: boolean) => Promise<void>;
  createFirstAdmin: (adminData: {
    fullName: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  registerEmployee: (data: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    companyId?: string;
    companyName?: string;
    departmentId?: string;
    departmentName?: string;
    role?: any;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  approveUser: (id: string) => Promise<void>;
  switchPersona: (role: UserRole) => void;
  isSimulatedRole: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active role is simulated role if set, else currentUser's actual role, else 'employee'
  const activeRole: UserRole = simulatedRole || currentUser?.role || 'admin';
  const isSimulatedRole = simulatedRole !== null && simulatedRole !== currentUser?.role;

  // Convert currentUser to UserProfile for backward-compatibility with existing views
  const userProfile: UserProfile | null = currentUser
    ? {
        id: currentUser.id,
        email: currentUser.email,
        displayName: currentUser.fullName,
        role: activeRole,
        companyId: currentUser.companyId,
        departmentId: currentUser.departmentId,
        createdAt: currentUser.createdAt,
        updatedAt: currentUser.updatedAt,
        username: currentUser.username,
      }
    : null;

  // 1. Load users & initialize initial admins if none exist
  useEffect(() => {
    let isMounted = true;

    async function initUsers() {
      try {
        setIsLoading(true);

        // Try to fetch from Firestore
        let loadedUsers: AppUser[] = [];
        try {
          const snapshot = await getDocs(collection(db, 'app_users'));
          if (!snapshot.empty) {
            snapshot.forEach((d) => {
              loadedUsers.push({ id: d.id, ...d.data() } as AppUser);
            });
          }
        } catch (fbErr) {
          console.warn('Firestore user fetch failed, checking local storage:', fbErr);
        }

        // If Firestore had no users, check localStorage
        if (loadedUsers.length === 0) {
          const localStored = localStorage.getItem(LOCAL_USERS_KEY);
          if (localStored) {
            try {
              loadedUsers = JSON.parse(localStored);
            } catch (e) {
              console.warn('Could not parse local users:', e);
            }
          }
        }

        // If STILL no users exist, automatically provision the two required initial admin accounts:
        // sameertupe and rahulprasad (with hashed passwords for 'Acculate@' and mustChangePassword = true)
        if (loadedUsers.length === 0) {
          const initialAdmins = await createInitialAdminUsers();
          loadedUsers = initialAdmins;

          // Save to localStorage
          localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(initialAdmins));

          // Also attempt to persist into Firestore
          try {
            for (const admin of initialAdmins) {
              await setDoc(doc(db, 'app_users', admin.id), sanitizeForFirestore(admin));
            }
          } catch (writeErr) {
            console.warn('Could not write initial admins to Firestore:', writeErr);
          }
        }

        if (isMounted) {
          setUsers(loadedUsers);

          // Check if there is an active session
          const sessionUserId = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
          if (sessionUserId) {
            const found = loadedUsers.find((u) => u.id === sessionUserId);
            if (found && found.status === 'active') {
              setCurrentUser(found);
            } else {
              // Deactivated or not found
              sessionStorage.removeItem(SESSION_KEY);
              localStorage.removeItem(SESSION_KEY);
              setCurrentUser(null);
            }
          } else {
            // Require sign in! No auto-login without credentials
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Error initializing authentication:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initUsers();

    // Subscribe to Firestore app_users for live updates if available
    const unsub = onSnapshot(
      collection(db, 'app_users'),
      (snapshot) => {
        if (!snapshot.empty) {
          const liveList: AppUser[] = [];
          snapshot.forEach((d) => liveList.push({ id: d.id, ...d.data() } as AppUser));
          setUsers(liveList);
          localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(liveList));

          // Keep current logged-in user in sync
          setCurrentUser((prev) => {
            if (!prev) return null;
            const updated = liveList.find((u) => u.id === prev.id);
            if (!updated || updated.status === 'inactive') {
              sessionStorage.removeItem(SESSION_KEY);
              localStorage.removeItem(SESSION_KEY);
              return null;
            }
            return updated;
          });
        }
      },
      (err) => {
        console.warn('Firestore live users listener notice:', err);
      }
    );

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Save users locally whenever they change
  const persistUsersLocally = (updated: AppUser[]) => {
    setUsers(updated);
    try {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local users save error', e);
    }
  };

  // Login handler
  const login = async (
    usernameOrEmail: string,
    password: string
  ): Promise<{ success: boolean; error?: string; mustChangePassword?: boolean; user?: AppUser }> => {
    setIsLoading(true);
    try {
      const q = usernameOrEmail.trim().toLowerCase();
      const foundUser = users.find(
        (u) =>
          u.username.toLowerCase() === q ||
          u.email.toLowerCase() === q
      );

      if (!foundUser) {
        return { success: false, error: 'Invalid username or password. Please verify your credentials.' };
      }

      if (foundUser.status === 'pending_approval') {
        return {
          success: false,
          error: 'Your account registration is pending IT Administrator approval. Access will be granted once an authorized IT Admin approves your request.',
        };
      }

      if (foundUser.status === 'inactive') {
        return { success: false, error: 'This user account is inactive. Please contact an IT administrator.' };
      }

      // Verify cryptographic hash
      const isValid = await verifyPassword(password, foundUser.passwordHash, foundUser.salt);
      if (!isValid) {
        return { success: false, error: 'Invalid username or password. Please verify your credentials.' };
      }

      // Check if user is forced to change password on first login
      if (foundUser.mustChangePassword) {
        return { success: true, mustChangePassword: true, user: foundUser };
      }

      // Normal login success: update last login date
      const now = new Date().toISOString();
      const updatedUser: AppUser = {
        ...foundUser,
        lastLoginDate: now,
        updatedAt: now,
      };

      try {
        await updateDoc(doc(db, 'app_users', foundUser.id), sanitizeForFirestoreUpdate({
          lastLoginDate: now,
          updatedAt: now,
        }));
      } catch (e) {
        console.warn('Could not update last login date in Firestore:', e);
      }

      persistUsersLocally(users.map((u) => (u.id === foundUser.id ? updatedUser : u)));
      setCurrentUser(updatedUser);
      sessionStorage.setItem(SESSION_KEY, foundUser.id);
      localStorage.setItem(SESSION_KEY, foundUser.id);
      setSimulatedRole(null);

      return { success: true, mustChangePassword: false, user: updatedUser };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err?.message || 'Login failed due to a system error.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Change password handler (used for mandatory first-login reset or profile settings)
  const changePassword = async (
    userId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters in length.' };
    }

    try {
      const { hash, salt } = await hashPassword(newPassword);
      const now = new Date().toISOString();

      const target = users.find((u) => u.id === userId);
      if (!target) {
        return { success: false, error: 'User record not found.' };
      }

      const updatedUser: AppUser = {
        ...target,
        passwordHash: hash,
        salt,
        mustChangePassword: false,
        lastLoginDate: now,
        updatedAt: now,
      };

      try {
        await updateDoc(doc(db, 'app_users', userId), sanitizeForFirestoreUpdate({
          passwordHash: hash,
          salt,
          mustChangePassword: false,
          lastLoginDate: now,
          updatedAt: now,
        }));
      } catch (e) {
        console.warn('Could not update password in Firestore, saving locally:', e);
      }

      persistUsersLocally(users.map((u) => (u.id === userId ? updatedUser : u)));
      setCurrentUser(updatedUser);
      sessionStorage.setItem(SESSION_KEY, userId);
      localStorage.setItem(SESSION_KEY, userId);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update password.' };
    }
  };

  // Logout handler
  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setSimulatedRole(null);
  };

  // Create First Admin Account (when no users exist)
  const createFirstAdmin = async (adminData: {
    fullName: string;
    username: string;
    email: string;
    password: string;
  }) => {
    const { hash, salt } = await hashPassword(adminData.password);
    const now = new Date().toISOString();
    const newAdmin: AppUser = {
      id: `usr-admin-${Date.now()}`,
      fullName: adminData.fullName.trim(),
      username: adminData.username.trim().toLowerCase(),
      email: adminData.email.trim().toLowerCase(),
      passwordHash: hash,
      salt,
      role: 'admin',
      status: 'active',
      mustChangePassword: false,
      lastLoginDate: now,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'app_users', newAdmin.id), sanitizeForFirestore(newAdmin));
    } catch (e) {
      console.warn('Could not write first admin to Firestore, saving locally:', e);
    }

    persistUsersLocally([newAdmin]);
    setCurrentUser(newAdmin);
    sessionStorage.setItem(SESSION_KEY, newAdmin.id);
    localStorage.setItem(SESSION_KEY, newAdmin.id);
  };

  // Admin user creation
  const createUser = async (
    userData: Omit<AppUser, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginDate' | 'passwordHash' | 'salt'>,
    initialPassword: string
  ): Promise<string> => {
    // Validation
    const cleanUsername = userData.username.trim().toLowerCase();
    const cleanEmail = userData.email.trim().toLowerCase();

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      throw new Error(`Username "${cleanUsername}" is already taken.`);
    }
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error(`Email address "${cleanEmail}" is already registered.`);
    }

    const { hash, salt } = await hashPassword(initialPassword);
    const now = new Date().toISOString();
    const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Enforce role authorization: only administrators can create elevated roles
    const safeRole: UserRole = (currentUser && currentUser.role === 'admin') ? userData.role : 'employee';
    const safeStatus = (currentUser && currentUser.role === 'admin') ? (userData.status || 'active') : 'pending_approval';

    const newUser: AppUser = {
      ...userData,
      id,
      username: cleanUsername,
      email: cleanEmail,
      role: safeRole,
      status: safeStatus,
      passwordHash: hash,
      salt,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'app_users', id), sanitizeForFirestore(newUser));
    } catch (e) {
      console.warn('Could not save user to Firestore:', e);
    }

    persistUsersLocally([...users, newUser]);
    return id;
  };

  // Public employee registration (strictly enforces role: 'employee' and status: 'pending_approval')
  const registerEmployee = async (data: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    companyId?: string;
    companyName?: string;
    departmentId?: string;
    departmentName?: string;
    role?: any;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const cleanFullName = data.fullName.trim();
      const cleanUsername = data.username.trim().toLowerCase();
      const cleanEmail = data.email.trim().toLowerCase();

      if (!cleanFullName || !cleanUsername || !cleanEmail || !data.password) {
        return { success: false, error: 'All fields are required.' };
      }

      if (cleanUsername.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters.' };
      }

      if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
        return { success: false, error: 'Username can only contain letters, numbers, dots, and hyphens.' };
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { success: false, error: 'Please enter a valid email address.' };
      }

      if (data.password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters in length.' };
      }

      if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
        return { success: false, error: `Username "${cleanUsername}" is already taken.` };
      }

      if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: `Email "${cleanEmail}" is already registered.` };
      }

      const { hash, salt } = await hashPassword(data.password);
      const now = new Date().toISOString();
      const id = `usr-emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // CRITICAL BACKEND & DATABASE ENFORCEMENT:
      // Always enforce role: 'employee' and status: 'pending_approval'
      // Discard any role, elevated permissions, or team escalation requested by self-registration
      const newEmployee: AppUser = {
        id,
        fullName: cleanFullName,
        username: cleanUsername,
        email: cleanEmail,
        passwordHash: hash,
        salt,
        role: 'employee',
        status: 'pending_approval',
        companyId: data.companyId || undefined,
        companyName: data.companyName || undefined,
        departmentId: data.departmentId || undefined,
        departmentName: data.departmentName || undefined,
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await setDoc(doc(db, 'app_users', id), sanitizeForFirestore(newEmployee));
      } catch (e) {
        console.warn('Could not save registered employee to Firestore:', e);
      }

      persistUsersLocally([...users, newEmployee]);

      return {
        success: true,
        message: 'Your employee registration has been submitted successfully! Your account is awaiting IT Admin approval before you can sign in.',
      };
    } catch (err: any) {
      console.error('Registration error:', err);
      return { success: false, error: err?.message || 'Registration failed. Please try again.' };
    }
  };

  // Admin approval of employee accounts
  const approveUser = async (id: string): Promise<void> => {
    if (activeRole !== 'admin' && currentUser?.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can approve employee accounts.');
    }
    const target = users.find((u) => u.id === id);
    if (!target) throw new Error('User not found.');

    await updateUser(id, { status: 'active' });
  };

  // Admin update user
  const updateUser = async (id: string, updates: Partial<AppUser>): Promise<void> => {
    // SECURITY RESTRICTION: Only administrator can change roles or status
    if (updates.role !== undefined && (!currentUser || currentUser.role !== 'admin')) {
      throw new Error('Unauthorized: Only administrators can grant or modify user roles.');
    }
    if (updates.status !== undefined && (!currentUser || currentUser.role !== 'admin')) {
      throw new Error('Unauthorized: Only administrators can modify account status.');
    }

    // If username or email is being changed, check uniqueness
    if (updates.username) {
      const cleanUser = updates.username.trim().toLowerCase();
      if (users.some((u) => u.id !== id && u.username.toLowerCase() === cleanUser)) {
        throw new Error(`Username "${cleanUser}" is already taken.`);
      }
      updates.username = cleanUser;
    }
    if (updates.email) {
      const cleanEmail = updates.email.trim().toLowerCase();
      if (users.some((u) => u.id !== id && u.email.toLowerCase() === cleanEmail)) {
        throw new Error(`Email "${cleanEmail}" is already registered.`);
      }
      updates.email = cleanEmail;
    }

    const now = new Date().toISOString();
    const merged = { ...updates, updatedAt: now };

    try {
      await updateDoc(doc(db, 'app_users', id), sanitizeForFirestoreUpdate(merged));
    } catch (e) {
      console.warn('Could not update user in Firestore:', e);
    }

    persistUsersLocally(
      users.map((u) => (u.id === id ? { ...u, ...merged } : u))
    );

    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...merged } : null));
    }
  };

  // Admin delete user
  const deleteUser = async (id: string): Promise<void> => {
    if (currentUser?.id === id) {
      throw new Error('You cannot delete your own logged-in administrator account.');
    }

    try {
      await deleteDoc(doc(db, 'app_users', id));
    } catch (e) {
      console.warn('Could not delete user in Firestore:', e);
    }

    persistUsersLocally(users.filter((u) => u.id !== id));
  };

  // Toggle active/inactive
  const toggleUserStatus = async (id: string): Promise<void> => {
    if (currentUser?.id === id) {
      throw new Error('You cannot deactivate your own active session account.');
    }
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const newStatus = target.status === 'active' ? 'inactive' : 'active';
    await updateUser(id, { status: newStatus });
  };

  // Reset user password
  const resetUserPassword = async (
    id: string,
    newPassword: string,
    forceResetNextLogin = true
  ): Promise<void> => {
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    const { hash, salt } = await hashPassword(newPassword);
    const now = new Date().toISOString();
    const updates = {
      passwordHash: hash,
      salt,
      mustChangePassword: forceResetNextLogin,
      updatedAt: now,
    };

    try {
      await updateDoc(doc(db, 'app_users', id), sanitizeForFirestoreUpdate(updates));
    } catch (e) {
      console.warn('Could not reset password in Firestore:', e);
    }

    persistUsersLocally(
      users.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  };

  // Switch persona (for quick testing of other roles if current user is admin)
  const switchPersona = (role: UserRole) => {
    setSimulatedRole(role);
  };

  const setActiveRole = (role: UserRole) => {
    setSimulatedRole(role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        activeRole,
        setActiveRole,
        isLoading,
        users,
        hasAnyUsers: users.length > 0,
        login,
        changePassword,
        logout,
        createUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        resetUserPassword,
        createFirstAdmin,
        registerEmployee,
        approveUser,
        switchPersona,
        isSimulatedRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
