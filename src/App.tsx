/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { NotificationProvider } from './context/NotificationContext';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { TicketsView } from './components/tickets/TicketsView';
import { InventoryView } from './components/inventory/InventoryView';
import { CompaniesView } from './components/companies/CompaniesView';
import { DepartmentsView } from './components/departments/DepartmentsView';
import { EmployeesView } from './components/employees/EmployeesView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { UsersView } from './components/users/UsersView';
import { InventoryRollbackView } from './components/inventory/InventoryRollbackView';
import { SignInView } from './components/auth/SignInView';
import { FirstAdminSetupView } from './components/auth/FirstAdminSetupView';
import { ForceChangePasswordModal } from './components/auth/ForceChangePasswordModal';
import { CreateTicketModal } from './components/tickets/CreateTicketModal';
import { TicketDetailModal } from './components/tickets/TicketDetailModal';
import { ComputerDetailModal } from './components/inventory/ComputerDetailModal';
import { ComputerModal } from './components/inventory/ComputerModal';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { ToastContainer } from './components/common/ToastContainer';
import { Ticket, Computer, AppUser } from './types';
import { Loader2 } from 'lucide-react';

const MainPortal: React.FC = () => {
  const { activeRole } = useAuth();
  const { isLoading: dataLoading } = useData();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Search state
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Modals state
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedAssetForTicket, setSelectedAssetForTicket] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedComputer, setSelectedComputer] = useState<Computer | null>(null);
  const [computerToEdit, setComputerToEdit] = useState<Computer | null>(null);
  const [isEditComputerModalOpen, setIsEditComputerModalOpen] = useState(false);

  // Keyboard shortcut for Global Search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle role restrictions on tabs
  useEffect(() => {
    if (activeRole !== 'admin' && (currentTab === 'users' || currentTab === 'inventory_history' || currentTab === 'email_notifications')) {
      setCurrentTab('dashboard');
    } else if (activeRole === 'employee') {
      if (['companies', 'departments', 'employees', 'reports', 'users', 'inventory_history', 'email_notifications'].includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    }
  }, [activeRole, currentTab]);

  if (dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500">Connecting to IT Operations Database...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView
            onSelectTicket={(ticket) => setSelectedTicket(ticket)}
            onSelectComputer={(comp) => setSelectedComputer(comp)}
            onOpenNewTicketModal={() => setIsNewTicketOpen(true)}
            onOpenRegisterAssetModal={() => {
              setComputerToEdit(null);
              setIsEditComputerModalOpen(true);
            }}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        );
      case 'tickets':
        return (
          <TicketsView
            onSelectComputer={(comp) => setSelectedComputer(comp)}
          />
        );
      case 'inventory':
        return (
          <InventoryView
            onSelectTicket={(ticket) => setSelectedTicket(ticket)}
            onOpenCreateTicketWithAsset={(asset) => {
              setSelectedAssetForTicket(asset.id);
              setIsNewTicketOpen(true);
            }}
            onNavigateToHistory={() => setCurrentTab('inventory_history')}
          />
        );
      case 'inventory_history':
        return (
          <InventoryRollbackView
            onBackToInventory={() => setCurrentTab('inventory')}
            onSelectComputer={(comp) => setSelectedComputer(comp)}
          />
        );
      case 'companies':
        return (
          <CompaniesView
            onSelectTicket={(ticket) => setSelectedTicket(ticket)}
            onSelectComputer={(comp) => setSelectedComputer(comp)}
          />
        );
      case 'departments':
        return (
          <DepartmentsView
            onSelectTicket={(ticket) => setSelectedTicket(ticket)}
            onSelectComputer={(comp) => setSelectedComputer(comp)}
          />
        );
      case 'employees':
        return (
          <EmployeesView
            onSelectComputer={(comp) => setSelectedComputer(comp)}
          />
        );
      case 'users':
        return <UsersView />;
      case 'reports':
        return <ReportsView />;
      case 'email_notifications':
        return <SettingsView defaultSubTab="email" onNavigateTab={(tab) => setCurrentTab(tab as NavigationTab)} />;
      case 'settings':
        return <SettingsView onNavigateTab={(tab) => setCurrentTab(tab as NavigationTab)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenNewTicketModal={() => setIsNewTicketOpen(true)}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          onSelectTicket={(ticket) => setSelectedTicket(ticket)}
          onSelectComputer={(comp) => setSelectedComputer(comp)}
        />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onSelectTicket={(ticket) => setSelectedTicket(ticket)}
        onSelectComputer={(comp) => setSelectedComputer(comp)}
        onNavigateTab={(tab) => {
          setCurrentTab(tab);
          setIsGlobalSearchOpen(false);
        }}
      />

      {/* Floating Toast Feedback */}
      <ToastContainer />

      {/* Global Modals */}
      <CreateTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => {
          setIsNewTicketOpen(false);
          setSelectedAssetForTicket('');
        }}
        defaultAssetId={selectedAssetForTicket}
      />

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onSelectComputer={(comp) => setSelectedComputer(comp)}
        />
      )}

      {selectedComputer && (
        <ComputerDetailModal
          computer={selectedComputer}
          isOpen={!!selectedComputer}
          onClose={() => setSelectedComputer(null)}
          onEdit={(comp) => {
            setComputerToEdit(comp);
            setIsEditComputerModalOpen(true);
          }}
          onOpenTicketForAsset={(comp) => {
            setSelectedAssetForTicket(comp.id);
            setIsNewTicketOpen(true);
          }}
          onSelectTicket={(ticket) => setSelectedTicket(ticket)}
        />
      )}

      {isEditComputerModalOpen && (
        <ComputerModal
          computer={computerToEdit}
          isOpen={isEditComputerModalOpen}
          onClose={() => setIsEditComputerModalOpen(false)}
        />
      )}
    </div>
  );
};

const RootApp: React.FC = () => {
  const { currentUser, isLoading: authLoading, hasAnyUsers } = useAuth();
  const [forcedPasswordUser, setForcedPasswordUser] = useState<AppUser | null>(null);
  const [isFirstAdminSetupMode, setIsFirstAdminSetupMode] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs font-medium text-slate-400">Verifying security credentials & session...</p>
      </div>
    );
  }

  // 1. If no user accounts exist yet in database, show First Admin Setup page
  if (!hasAnyUsers || isFirstAdminSetupMode) {
    return (
      <>
        <FirstAdminSetupView onSuccess={() => setIsFirstAdminSetupMode(false)} />
        <ToastContainer />
      </>
    );
  }

  // 2. If user is not authenticated, block portal access and require Sign In
  if (!currentUser) {
    return (
      <>
        <SignInView
          onMustChangePassword={(u) => setForcedPasswordUser(u)}
          onOpenFirstAdminSetup={!hasAnyUsers ? () => setIsFirstAdminSetupMode(true) : undefined}
        />
        {forcedPasswordUser && (
          <ForceChangePasswordModal
            user={forcedPasswordUser}
            isOpen={!!forcedPasswordUser}
            onSuccess={() => setForcedPasswordUser(null)}
          />
        )}
        <ToastContainer />
      </>
    );
  }

  // 3. If logged-in user is flagged to force password change on next login
  if (currentUser.mustChangePassword) {
    return (
      <>
        <ForceChangePasswordModal
          user={currentUser}
          isOpen={true}
          onSuccess={() => {}}
        />
        <ToastContainer />
      </>
    );
  }

  // 4. Fully authenticated session: grant portal access
  return <MainPortal />;
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <NotificationProvider>
          <RootApp />
        </NotificationProvider>
      </DataProvider>
    </AuthProvider>
  );
}
