"use client";

import React, { useRef, useEffect, useCallback } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { TemplateFile } from "../lib/path-to-json";
import {
  configureMonaco,
  defaultEditorOptions,
  getEditorLanguage,
} from "@/features/playground/lib/editor-config";
import { isValueExpired } from "next/dist/client/components/segment-cache/cache-map";

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
  }, [activeFile]);

  return <div className="h-full relative">
    {/* AI thinging */}


    <Editor
        height={"100%"}
        value={Content}
        onChange={(value)=>onContentChange(value || "")}
        onMount={handleEditorDidMount}
        language={activeFile ? getEditorLanguage(activeFile.fileExtension || "") : "plaintext"}
        //@ts-ignore
        options={{
        ...defaultEditorOptions,
        rulers: [],                     
        renderWhitespace: "none",
        guides: {
        indentation: false,          
        bracketPairs: false,
    },
  }}
    
    />
  </div>;
};

export default PlaygroundEditor;




