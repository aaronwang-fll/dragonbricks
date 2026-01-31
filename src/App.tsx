import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { EditorPanel } from './components/editor/EditorPanel';
import { PreviewPanel } from './components/preview/PreviewPanel';

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex">
          <EditorPanel />
          <PreviewPanel />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
