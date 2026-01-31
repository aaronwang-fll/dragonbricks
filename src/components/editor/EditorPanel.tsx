import { useEditorStore } from '../../stores/editorStore';
import { ResizeHandle } from '../shared/ResizeHandle';
import { SetupSection } from './SetupSection';
import { MainSection } from './MainSection';
import { RoutinesSection } from './RoutinesSection';

export function EditorPanel() {
  const { setupHeight, routinesHeight, setSetupHeight, setRoutinesHeight } =
    useEditorStore();

  const handleSetupResize = (delta: number) => {
    setSetupHeight(Math.max(80, Math.min(300, setupHeight + delta)));
  };

  const handleRoutinesResize = (delta: number) => {
    setRoutinesHeight(Math.max(50, Math.min(400, routinesHeight - delta)));
  };

  return (
    <div className="flex-1 flex flex-col border-r border-gray-200">
      <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50 border-b border-gray-200">
        Setup
      </div>
      <div style={{ height: setupHeight }}>
        <SetupSection />
      </div>

      <ResizeHandle direction="vertical" onResize={handleSetupResize} />

      <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50 border-b border-gray-200">
        Main
      </div>
      <MainSection />

      <ResizeHandle direction="vertical" onResize={handleRoutinesResize} />

      <div style={{ height: routinesHeight, minHeight: 50 }}>
        <RoutinesSection />
      </div>
    </div>
  );
}
