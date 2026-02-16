import { useState } from 'react';
import { useParser } from '../../hooks/useParser';
import { useEditorStore } from '../../stores/editorStore';

export function PythonPanel() {
  const { generateFullProgram } = useParser();
  const currentProgram = useEditorStore((state) => state.currentProgram);
  const [copied, setCopied] = useState(false);

  const generatedCode = generateFullProgram();
  const code = generatedCode || `# No commands yet
# Enter commands in the Main section
# Example: "move forward 200mm"`;

  const sanitizeFilename = (name?: string): string => {
    if (!name) return '';

    return name
      .trim()
      .replace(/\.py$/i, '')
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_-]/g, '')
      .replace(/_+/g, '_')
      .replace(/^[_-]+|[_-]+$/g, '');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const filename = sanitizeFilename(currentProgram?.name) || 'main';
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const lines = code.split('\n');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Python</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Download as .py file"
          >
            Download
          </button>
        </div>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto p-3 bg-gray-50 dark:bg-gray-900">
        <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {lines.map((line, i) => (
            <div key={i} className="flex leading-5">
              <span className="w-8 text-gray-400 dark:text-gray-600 select-none text-right pr-2">{i + 1}</span>
              <span className={
                line.startsWith('#') ? 'text-gray-400 dark:text-gray-500' :
                line.startsWith('from ') || line.startsWith('import ') ? 'text-purple-600 dark:text-purple-400' :
                line.includes('def ') ? 'text-blue-600 dark:text-blue-400' :
                line.includes('=') ? 'text-blue-600 dark:text-blue-300' :
                'text-gray-700 dark:text-gray-300'
              }>
                {line || ' '}
              </span>
            </div>
          ))}
        </pre>
      </div>

      {/* Footer status */}
      <div className="px-3 py-1 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {lines.length} lines
      </div>
    </div>
  );
}
