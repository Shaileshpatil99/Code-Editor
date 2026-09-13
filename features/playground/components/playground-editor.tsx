"use client";

import React, { useRef, useEffect } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { TemplateFile } from "../lib/path-to-json";
import {
  configureMonaco,
  defaultEditorOptions,
  getEditorLanguage,
} from "@/features/playground/lib/editor-config";
import { useEditorSettings } from "@/features/settings/hooks/useEditorSettings";

interface PlaygroundEditorProps {
  activeFile: TemplateFile | undefined;
  Content: string;
  onContentChange: (value: string) => void;
}

const PlaygroundEditor = ({
  activeFile,
  Content,
  onContentChange,
}: PlaygroundEditorProps) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const { settings } = useEditorSettings();

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    configureMonaco(monaco);
    updateEditorLanguage();
  };

  const updateEditorLanguage = () => {
    if (!activeFile || !monacoRef.current || !editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const language = getEditorLanguage(activeFile.fileExtension || "");
    try {
      monacoRef.current.editor.setModelLanguage(model, language);
    } catch (error) {
      console.warn("Failed to set Editor language", error);
    }
  };

  useEffect(() => {
    updateEditorLanguage();
  }, [activeFile])

  // Update Monaco options dynamically when settings change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        tabSize: settings.tabSize,
        minimap: { enabled: settings.minimap },
        wordWrap: settings.wordWrap,
        lineNumbers: settings.lineNumbers,
        cursorStyle: settings.cursorStyle,
        cursorBlinking: settings.cursorBlinking,
        bracketPairColorization: { enabled: settings.bracketPairColorization },
      });
    }
  }, [settings]);

  return (
    <div className="h-full relative">
      <Editor
        height={"100%"}
        value={Content}
        onChange={(value) => onContentChange(value || "")}
        onMount={handleEditorDidMount}
        language={activeFile ? getEditorLanguage(activeFile.fileExtension || "") : "plaintext"}
        //@ts-ignore
        options={{
          ...defaultEditorOptions,
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily,
          tabSize: settings.tabSize,
          minimap: { enabled: settings.minimap },
          wordWrap: settings.wordWrap,
          lineNumbers: settings.lineNumbers,
          cursorStyle: settings.cursorStyle,
          cursorBlinking: settings.cursorBlinking,
          bracketPairColorization: { enabled: settings.bracketPairColorization },
          rulers: [],
          renderWhitespace: "none",
          guides: {
            indentation: false,
            bracketPairs: settings.bracketPairColorization,
          },
        }}
      />
    </div>
  );
};

export default PlaygroundEditor;
