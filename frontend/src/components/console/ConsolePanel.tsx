import { useEffect, useMemo, useRef } from 'react';
import { useConsoleStore } from '../../stores/consoleStore';
import { useConnectionStore } from '../../stores/connectionStore';

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function ConsolePanel() {
  const {
    entries,
    isOpen,
    height,
    autoScroll,
    clear,
    setOpen,
    setHeight,
    setAutoScroll,
  } = useConsoleStore();

  const { status } = useConnectionStore();

  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const connectionLabel = useMemo(() => {
    if (status === 'connected') return 'Connected';
    if (status === 'connecting') return 'Connecting…';
    if (status === 'error') return 'Error';
    return 'Disconnected';
  }, [status]);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (!autoScroll) return;
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries.length, autoScroll]);

  // If the user scrolls up, disable auto-scroll (like many terminals)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
      if (!nearBottom && autoScroll) setAutoScroll(false);
      if (nearBottom && !autoScroll) setAutoScroll(true);
    };

    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [autoScroll, setAutoScroll]);

  return (
    <section
      className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col"
      style={{ height: isOpen ? height : 36 }}
    >
      <div className="h-9 flex items-center justify-between px-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={() => setOpen(!isOpen)}
          className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"
          aria-label={isOpen ? 'Collapse console' : 'Expand console'}
        >
          <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
          Console
          <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">({connectionLabel})</span>
        </button>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300 select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
          <button
            onClick={clear}
            className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
          >
            Clear
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          ref={scrollerRef}
          className="flex-1 overflow-auto font-mono text-xs px-3 py-2 space-y-1"
        >
          {entries.length === 0 && (
            <div className="text-gray-500 dark:text-gray-400">No output yet. Run a program to see print() output here.</div>
          )}

          {entries.map((e) => {
            const color =
              e.type === 'stderr'
                ? 'text-red-600 dark:text-red-400'
                : e.type === 'status'
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-800 dark:text-gray-100';

            return (
              <div key={e.id} className="flex gap-3">
                <span className="w-20 shrink-0 text-gray-400 dark:text-gray-500">{formatTime(e.ts)}</span>
                <pre className={`whitespace-pre-wrap break-words ${color}`}>{e.text}</pre>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}

      {/* Resize handle (top edge) */}
      {isOpen && (
        <div
          onMouseDown={(ev) => {
            const startY = ev.clientY;
            const startHeight = height;

            const onMove = (e: MouseEvent) => {
              const delta = startY - e.clientY; // dragging up increases height
              const next = Math.max(80, Math.min(500, startHeight + delta));
              setHeight(next);
            };

            const onUp = () => {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            ev.preventDefault();
          }}
          className="h-2 cursor-row-resize bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
          aria-label="Resize console"
        />
      )}
    </section>
  );
}
