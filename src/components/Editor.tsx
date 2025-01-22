import { Editor as MonacoEditor } from '@monaco-editor/react';

interface EditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
}

export function Editor({ value, language, onChange }: EditorProps) {
  return (
    <MonacoEditor
      height="100%"
      language={language}
      value={value}
      onChange={(value) => onChange(value || '')}
      theme="vs-dark"
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        wordWrap: 'on',
        automaticLayout: true,
        tabSize: 2,
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        formatOnPaste: true,
        formatOnType: true
      }}
    />
  );
}