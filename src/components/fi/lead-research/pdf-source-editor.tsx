"use client";

import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { useTheme } from "next-themes";
import { useMemo } from "react";

const extensions = [
  javascript({ jsx: true }),
  EditorView.lineWrapping,
  EditorState.transactionFilter.of(transaction => transaction.newDoc.length > 60_000 ? [] : transaction),
  EditorView.theme({
    "&": { fontSize: "13px", backgroundColor: "transparent" },
    ".cm-scroller": { fontFamily: "var(--font-geist-mono, monospace)", lineHeight: "1.7" },
    ".cm-content": { padding: "16px 0" },
    ".cm-gutters": { backgroundColor: "transparent", borderRight: "1px solid var(--border)", paddingRight: "8px" },
    "&.cm-focused": { outline: "none" },
  }),
];

export default function PdfSourceEditor({ value, onChange, label, disabled }: { value: string; onChange: (value: string) => void; label: string; disabled?: boolean }) {
  const { resolvedTheme } = useTheme();
  const accessibleExtensions = useMemo(() => [...extensions, EditorView.contentAttributes.of({ "aria-label": label, spellcheck: "false" })], [label]);
  return <CodeMirror value={value} onChange={onChange} height="70vh" minHeight="384px" theme={resolvedTheme === "dark" ? oneDark : "light"} extensions={accessibleExtensions} editable={!disabled} readOnly={disabled}
    basicSetup={{ lineNumbers: true, foldGutter: true, bracketMatching: true, closeBrackets: true, autocompletion: true, highlightActiveLine: true, searchKeymap: true, tabSize: 2 }} indentWithTab />;
}
