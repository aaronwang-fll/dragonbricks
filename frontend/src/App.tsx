import { useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { EditorPanel } from './components/editor/EditorPanel';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { SettingsPage } from './components/settings/SettingsPage';
import { FirmwareWizard } from './components/firmware';

type Page = 'main' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('main');

  if (currentPage === 'settings') {
    return <SettingsPage onBack={() => setCurrentPage('main')} />;
  }

  return (
    <div className="h-screen flex flex-col bg-blue-300 dark:bg-blue-950">
      <Header onSettingsClick={() => setCurrentPage('settings')} />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 flex">
          <EditorPanel />
          <PreviewPanel />
        </main>
      </div>
      <StatusBar />
      <FirmwareWizard />
    </div>
  );
}

export default App;
