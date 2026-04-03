import { useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { EditorPanel } from './components/editor/EditorPanel';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { SettingsPage } from './components/settings/SettingsPage';
import { FirmwareWizard } from './components/firmware';
import { RecordingManager } from './components/recording/RecordingManager';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { ConsolePanel } from './components/console';
import { UberCodePage } from './components/ubercode/UberCodePage';
import { WaypointPage } from './components/waypoint/WaypointPage';
import { api } from './lib/api';
import { useAuthStore } from './stores/authStore';

type Page = 'login' | 'register' | 'main' | 'settings' | 'ubercode' | 'waypoint';

function App() {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [isInitializingAuth, setIsInitializingAuth] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const validateAuth = async () => {
      const token = api.getToken();

      if (!token) {
        clearUser();
        if (!cancelled) {
          setCurrentPage('login');
          setIsInitializingAuth(false);
        }
        return;
      }

      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth check timed out')), 5000),
        );
        const user = await Promise.race([api.getCurrentUser(), timeout]);
        if (cancelled) {
          return;
        }
        setUser(user);
        setCurrentPage('main');
      } catch {
        api.logout();
        clearUser();
        if (!cancelled) {
          setCurrentPage('login');
        }
      } finally {
        if (!cancelled) {
          setIsInitializingAuth(false);
        }
      }
    };

    void validateAuth();

    return () => {
      cancelled = true;
    };
  }, [clearUser, setUser]);

  if (isInitializingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-blue-300 dark:bg-blue-950">
        <p className="text-sm text-gray-700 dark:text-gray-200">Checking session...</p>
      </div>
    );
  }

  if (currentPage === 'login') {
    return (
      <LoginPage
        onSuccess={() => setCurrentPage('main')}
        onSwitchToRegister={() => setCurrentPage('register')}
        onContinueAsGuest={() => setCurrentPage('main')}
      />
    );
  }

  if (currentPage === 'register') {
    return (
      <RegisterPage
        onSuccess={() => setCurrentPage('main')}
        onSwitchToLogin={() => setCurrentPage('login')}
      />
    );
  }

  if (currentPage === 'settings') {
    return <SettingsPage onBack={() => setCurrentPage('main')} />;
  }

  if (currentPage === 'ubercode') {
    return <UberCodePage onBack={() => setCurrentPage('main')} />;
  }

  if (currentPage === 'waypoint') {
    return <WaypointPage onBack={() => setCurrentPage('main')} />;
  }

  return (
    <div className="h-screen flex flex-col bg-blue-300 dark:bg-blue-950">
      <Header
        onSettingsClick={() => setCurrentPage('settings')}
        onNavigateToLogin={() => setCurrentPage('login')}
        onUberCodeClick={() => setCurrentPage('ubercode')}
        onWaypointClick={() => setCurrentPage('waypoint')}
      />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <div className="flex-1 flex min-h-0">
            <EditorPanel />
            <PreviewPanel />
          </div>
          <ConsolePanel />
        </main>
      </div>
      <StatusBar />
      <FirmwareWizard />
      <RecordingManager />
    </div>
  );
}

export default App;
