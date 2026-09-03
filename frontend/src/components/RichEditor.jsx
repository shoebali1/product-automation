import React, { useEffect, useRef } from "react";
import RichEditorClass from "../../richeditor.js";

const getAuthToken = () => {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
};

const getAuthHeaders = () => ({});

export default function RichTextEditor({
  id,
  value = "",
  token,
  onChange,
  placeholder,
  height = "320px",
  disabled = false,
}) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const isInternalChangeRef = useRef(false);

  valueRef.current = value;
  onChangeRef.current = onChange;

  const effectiveToken = token || getAuthToken() || "";

  useEffect(() => {
    let isMounted = true;

    const createEditorInstance = (EditorConstructor) => {
      if (!containerRef.current || !EditorConstructor || !isMounted) return;

      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }

      const initialValue = valueRef.current || "";

      editorRef.current = new EditorConstructor(containerRef.current, {
        value: initialValue,
        height: height || "320px",
        placeholder: placeholder || "Type your content here...",
        readOnly: disabled,
        imageApi: {
          uploadUrl: `${import.meta.env.VITE_API_BASE_URL || "/api/"}editor-image/upload`,
          listUrl: `${import.meta.env.VITE_API_BASE_URL || "/api/"}editor-image/all`,
          deleteUrl: `${import.meta.env.VITE_API_BASE_URL || "/api/"}editor-image/delete`,
          headers: {
            ...getAuthHeaders(),
            ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
          },
        },
        onChange: (html) => {
          isInternalChangeRef.current = true;
          if (typeof onChangeRef.current === "function") {
            onChangeRef.current(html);
          }
        },
      });

      // Explicitly size wrapEl so bodyEl flexes and displays content in normal view
      if (editorRef.current?.wrapEl) {
        editorRef.current.wrapEl.style.height = height || "320px";
        editorRef.current.wrapEl.style.minHeight = height || "320px";
      }

      if (initialValue && editorRef.current.setHTML) {
        editorRef.current.setHTML(initialValue);
      }

      if (disabled && editorRef.current.editorEl) {
        editorRef.current.editorEl.setAttribute("contenteditable", "false");
      }
    };

    const Editor = RichEditorClass || (typeof window !== "undefined" ? window.RichEditor : null);
    if (Editor) {
      createEditorInstance(Editor);
    }

    return () => {
      isMounted = false;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [effectiveToken, height, placeholder, disabled]);

  // Sync content when value prop changes externally
  const prevValue = useRef(value);
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      prevValue.current = value;
      return;
    }

    if (editorRef.current && value !== prevValue.current) {
      const isFocused = containerRef.current && containerRef.current.contains(document.activeElement);
      if (!isFocused) {
        const currentHTML = editorRef.current.getHTML ? editorRef.current.getHTML() : "";
        if (currentHTML !== value) {
          if (editorRef.current.setHTML) {
            editorRef.current.setHTML(value || "");
          }
        }
      }
    }
    prevValue.current = value;
  }, [value]);

  return (
    <div
      className={`re-container-wrap ${disabled ? "pointer-events-none opacity-85" : ""}`}
      id={id}
      ref={containerRef}
      style={{
        height: height || "320px",
        minHeight: height || "320px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    />
  );
}

export { RichTextEditor as RichEditor };
