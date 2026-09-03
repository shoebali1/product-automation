/**
 * RichEditor — production-grade, zero-dependency rich text editor (Vanilla JS).
 * Single UMD bundle with runtime CSS injection matching CKEditor 5 premium features.
 */

// ─── CSS INJECTION ───────────────────────────────────────────────────────────
const STYLES = `
.re-wrap {
  --re-bg: #ffffff;
  --re-border: #e5e7eb;
  --re-toolbar-bg: #f9fafb;
  --re-accent: #7C3AED;
  --re-accent-hover: #6d28d9;
  --re-accent-light: #ede9fe;
  --re-text: #111827;
  --re-muted: #6b7280;
  --re-radius: 8px;
  --re-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-family: var(--re-font);
  border: 1px solid var(--re-border);
  border-radius: var(--re-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--re-bg);
  color: var(--re-text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
}
.re-wrap *, .re-wrap *::before, .re-wrap *::after {
  box-sizing: border-box;
}
.re-wrap.re-fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  inset: 0 !important;
  z-index: 999999 !important;
  border-radius: 0 !important;
  border: none !important;
  height: 100vh !important;
  height: 100dvh !important;
  width: 100vw !important;
  max-height: none !important;
  max-width: none !important;
  margin: 0 !important;
  transform: none !important;
  box-shadow: none !important;
}
.re-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  padding: 6px 10px;
  background: var(--re-toolbar-bg);
  border-bottom: 1px solid var(--re-border);
  user-select: none;
  min-height: 44px;
  flex-shrink: 0;
  position: relative;
  z-index: 5;
}
.re-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  border-radius: 5px;
  cursor: pointer;
  color: #374151;
  padding: 0;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.re-btn:hover {
  background: #e5e7eb;
  color: var(--re-text);
}
.re-btn.re-active {
  background: var(--re-accent-light);
  color: var(--re-accent);
  font-weight: 600;
}
.re-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.re-btn svg {
  width: 17px;
  height: 17px;
  fill: currentColor;
  pointer-events: none;
}
.re-sep {
  width: 1px;
  height: 20px;
  background: var(--re-border);
  margin: 0 4px;
  flex-shrink: 0;
}
.re-select {
  height: 30px;
  border: 1px solid var(--re-border);
  border-radius: 5px;
  background: #ffffff;
  color: var(--re-text);
  font-size: 13px;
  padding: 0 6px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
}
.re-select:focus {
  border-color: var(--re-accent);
  box-shadow: 0 0 0 2px var(--re-accent-light);
}
.re-color-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.re-color-wrapper input[type="color"] {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  inset: 0;
}
.re-color-bar {
  width: 16px;
  height: 3px;
  border-radius: 1px;
  margin-top: 1px;
  background: currentColor;
}
.re-body {
  flex: 1 1 0px;
  min-height: 0;
  min-width: 0;
  overflow-y: auto !important;
  overflow-x: hidden;
  position: relative;
  background: #ffffff;
  z-index: 1;
  scrollbar-width: thin;
  scrollbar-color: #64748b #f1f5f9;
}
.re-body::-webkit-scrollbar {
  width: 12px !important;
  height: 12px !important;
  display: block !important;
}
.re-body::-webkit-scrollbar-track {
  background: #f1f5f9 !important;
  border-radius: 6px !important;
}
.re-body::-webkit-scrollbar-thumb {
  background: #64748b !important;
  border-radius: 6px !important;
  border: 2px solid #f1f5f9 !important;
}
.re-body::-webkit-scrollbar-thumb:hover {
  background: #334155 !important;
}
.re-editor {
  outline: none;
  padding: 20px 24px;
  min-height: 150px;
  line-height: 1.7;
  word-break: break-word;
  color: var(--re-text);
  font-size: 15px;
  box-sizing: border-box;
}
.re-editor:empty:before {
  content: attr(data-placeholder);
  color: #9ca3af;
  pointer-events: none;
  display: block;
}
.re-editor h1 { font-size: 2.1em; font-weight: 700; margin: 0.67em 0 0.4em; color: #111827; }
.re-editor h2 { font-size: 1.65em; font-weight: 700; margin: 0.75em 0 0.4em; color: #1f2937; }
.re-editor h3 { font-size: 1.3em; font-weight: 600; margin: 0.83em 0 0.4em; color: #374151; }
.re-editor h4 { font-size: 1.1em; font-weight: 600; margin: 1em 0 0.4em; }
.re-editor h5 { font-size: 0.95em; font-weight: 600; margin: 1em 0 0.4em; }
.re-editor h6 { font-size: 0.85em; font-weight: 600; margin: 1em 0 0.4em; text-transform: uppercase; color: #6b7280; }
.re-editor p { margin: 0 0 1em; }
.re-editor ul, .re-editor ol { margin: 0.5em 0 1em; padding-left: 1.8em; }
.re-editor ul { list-style-type: disc; }
.re-editor ol { list-style-type: decimal; }
.re-editor li { margin: 0.25em 0; line-height: 1.7; }
.re-editor ul ul { list-style-type: circle; }
.re-editor ul ul ul { list-style-type: square; }
.re-editor ol ol { list-style-type: lower-alpha; }
.re-editor ol ol ol { list-style-type: lower-roman; }
/* Google Docs supplies its own inline typography and spacing. These low-specificity
   resets stop the editor theme from changing pasted headings and paragraphs. */
.re-editor a {
  color: #2563eb;
  text-decoration: underline;
  cursor: pointer;
  word-break: break-word;
}
.re-editor a:hover {
  color: #1d4ed8;
}
.re-editor .re-google-doc-block {
  color: inherit;
  line-height: inherit;
  text-transform: none;
}
.re-editor h1.re-google-doc-block, .re-editor h2.re-google-doc-block, .re-editor h3.re-google-doc-block, .re-editor h4.re-google-doc-block, .re-editor h5.re-google-doc-block, .re-editor h6.re-google-doc-block {
  font-weight: 700;
}
.re-editor p.re-google-doc-block, .re-editor h1.re-google-doc-block, .re-editor h2.re-google-doc-block, .re-editor h3.re-google-doc-block, .re-editor h4.re-google-doc-block, .re-editor h5.re-google-doc-block, .re-editor h6.re-google-doc-block {
  margin: 0;
}
.re-editor .re-attachment {
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:8px 12px;
  margin:4px 0;
  border:1px solid #cbd5e1;
  border-radius:6px;
  color:#2563eb;
  text-decoration:none;
  background:#f8fafc;
}
.re-editor .re-attachment:hover { background:#eff6ff; }
.re-editor blockquote {
  border-left: 4px solid var(--re-accent);
  margin: 1.2em 0;
  padding: 0.6em 1.2em;
  background: var(--re-accent-light);
  color: #4b5563;
  border-radius: 0 6px 6px 0;
  font-style: italic;
}
.re-editor pre {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 14px 18px;
  border-radius: 6px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  margin: 1em 0;
  position: relative;
}
.re-editor code {
  background: #f3f4f6;
  color: #d97706;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9em;
}
.re-editor pre code {
  background: transparent;
  color: inherit;
  padding: 0;
}
.re-editor .re-table-wrap {
  overflow-x: auto;
  margin: 1.2em 0;
  max-width: 100%;
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
}
.re-editor .re-table-wrap::-webkit-scrollbar {
  height: 8px;
}
.re-editor .re-table-wrap::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}
.re-editor .re-table-wrap::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 4px;
}
.re-editor .re-table-wrap::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
.re-editor table {
  border-collapse: collapse;
  width: 100%;
  min-width: 100%;
  margin: 1.2em 0;
  table-layout: auto;
}
.re-editor td, .re-editor th {
  border: 1px solid #d1d5db;
  padding: 8px 12px;
  min-width: 50px;
  position: relative;
  word-break: break-word;
  overflow-wrap: break-word;
}
.re-editor th {
  background: #f3f4f6;
  font-weight: 600;
  text-align: left;
}
.re-editor td.re-selected, .re-editor th.re-selected {
  outline: 2px solid var(--re-accent);
  background: rgba(124, 58, 237, 0.08);
}
.re-editor img {
  max-width: 100%;
  height: auto;
  cursor: pointer;
  border-radius: 6px;
  transition: outline 0.15s;
  display: inline-block;
}
.re-editor img.re-img-selected {
  outline: 3px solid var(--re-accent);
}
.re-editor img.re-img-left {
  float: left;
  margin: 0 1.2em 1.2em 0;
}
.re-editor img.re-img-right {
  float: right;
  margin: 0 0 1.2em 1.2em;
}
.re-editor img.re-img-center {
  display: block;
  margin: 1.2em auto;
}
.re-editor img.re-img-top {
  display: block;
  margin: 0 auto 1.2em;
}
.re-editor img.re-img-bottom {
  display: block;
  margin: 1.2em auto 0;
}
.re-editor .re-img-resize-wrap.re-img-left {
  float: left;
  margin: 0 1.2em 1.2em 0;
}
.re-editor .re-img-resize-wrap.re-img-right {
  float: right;
  margin: 0 0 1.2em 1.2em;
}
.re-editor .re-img-resize-wrap.re-img-center,
.re-editor .re-img-resize-wrap.re-img-top,
.re-editor .re-img-resize-wrap.re-img-bottom {
  display: block;
  width: fit-content;
}
.re-editor .re-img-resize-wrap.re-img-center {
  margin: 1.2em auto;
}
.re-editor .re-img-resize-wrap.re-img-top {
  margin: 0 auto 1.2em;
}
.re-editor .re-img-resize-wrap.re-img-bottom {
  margin: 1.2em auto 0;
}
/* Image resize handles */
.re-img-resize-wrap {
  position: relative;
  display: inline-block;
  line-height: 0;
}
.re-img-resize-wrap img {
  display: block;
  max-width: 100%;
}
.re-resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #7C3AED;
  border: 2px solid #ffffff;
  border-radius: 2px;
  z-index: 10;
  cursor: nwse-resize;
  box-shadow: 0 0 3px rgba(0,0,0,0.3);
  touch-action: none;
}
.re-resize-handle.re-h-tl { top: -5px; left: -5px; cursor: nwse-resize; }
.re-resize-handle.re-h-tr { top: -5px; right: -5px; cursor: nesw-resize; }
.re-resize-handle.re-h-bl { bottom: -5px; left: -5px; cursor: nesw-resize; }
.re-resize-handle.re-h-br { bottom: -5px; right: -5px; cursor: nwse-resize; }
.re-img-size-input {
  width: 60px;
  height: 24px;
  border: 1px solid #475569;
  border-radius: 4px;
  background: #1e293b;
  color: #f1f5f9;
  font-size: 12px;
  text-align: center;
  padding: 0 4px;
  outline: none;
  font-family: inherit;
}
.re-img-size-input:focus {
  border-color: #7C3AED;
}
.re-editor figure {
  margin: 1.2em 0;
  display: inline-block;
  max-width: 100%;
  text-align: center;
}
.re-editor figcaption {
  text-align: center;
  font-size: 0.85em;
  color: #6b7280;
  margin-top: 6px;
  font-style: italic;
}
.re-editor .re-media-wrap {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
  overflow: hidden;
  margin: 1.2em 0;
  border-radius: 8px;
  background: #000;
}
.re-editor .re-media-wrap iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.re-editor .re-mention {
  color: var(--re-accent);
  font-weight: 600;
  background: var(--re-accent-light);
  border-radius: 4px;
  padding: 2px 6px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  user-select: none;
}
.re-source {
  display: none;
  flex: 1;
  padding: 20px 24px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 14px;
  line-height: 1.6;
  border: none;
  outline: none;
  resize: none;
  background: #1e1e2e;
  color: #a6adc8;
  width: 100%;
  min-height: 250px;
}
.re-source.re-visible {
  display: block;
}
.re-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  border-top: 1px solid var(--re-border);
  font-size: 12px;
  color: var(--re-muted);
  background: var(--re-toolbar-bg);
  flex-shrink: 0;
  z-index: 5;
}
.re-footer-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #e5e7eb;
  color: #374151;
  font-weight: 500;
  font-size: 11px;
}
.re-footer-badge.re-active {
  background: var(--re-accent-light);
  color: var(--re-accent);
}
/* Modals */
.re-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.5);
  backdrop-filter: blur(2px);
  z-index: 10000000 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: reFadeIn 0.15s ease-out;
  --re-accent: #7C3AED;
  --re-accent-hover: #6d28d9;
  --re-accent-light: #ede9fe;
  --re-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
@keyframes reFadeIn { from { opacity: 0; } to { opacity: 1; } }
.re-modal {
  background: #ffffff;
  border-radius: 10px;
  padding: 24px;
  width: 100%;
  max-width: 440px;
  max-height: calc(100vh - 32px);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  font-family: var(--re-font);
  color: #111827;
}
.re-modal h3 {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}
.re-modal label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #374151;
}
.re-modal input[type="text"], .re-modal input[type="url"], .re-modal input[type="number"], .re-modal select, .re-modal textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  margin-bottom: 14px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.re-modal input[type="file"] {
  width: 100%;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  margin-bottom: 14px;
  background: #f9fafb;
  cursor: pointer;
}
.re-modal input:focus, .re-modal select:focus, .re-modal textarea:focus {
  border-color: var(--re-accent);
  box-shadow: 0 0 0 3px var(--re-accent-light);
}
.re-modal .re-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 400;
  cursor: pointer;
  margin-bottom: 14px;
}
.re-modal .re-checkbox-label input {
  width: 16px;
  height: 16px;
  accent-color: var(--re-accent);
}
.re-modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}
.re-btn-primary {
  padding: 8px 18px;
  background: #7C3AED;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.re-btn-primary:hover {
  background: #6d28d9;
}
.re-btn-secondary {
  padding: 8px 18px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.re-btn-secondary:hover {
  background: #e5e7eb;
}
/* Image manager */
.re-image-manager .re-modal { max-width: 920px; padding: 0; overflow: hidden; }
.re-im-head { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid #e5e7eb; }
.re-im-head h3 { margin:0; }
.re-im-close { border:0; background:transparent; font-size:25px; cursor:pointer; color:#64748b; }
.re-im-tabs { display:flex; gap:4px; padding:12px 22px 0; border-bottom:1px solid #e5e7eb; }
.re-im-tab { border:0; background:transparent; padding:10px 14px; cursor:pointer; font-weight:600; color:#64748b; border-bottom:2px solid transparent; }
.re-im-tab.re-active { color:#7C3AED; border-bottom-color:#7C3AED; }
.re-im-panel { display:none; padding:20px 22px; min-height:390px; max-height:65vh; overflow:auto; }
.re-im-panel.re-active { display:block; }
.re-im-drop { border:2px dashed #cbd5e1; border-radius:12px; padding:38px 20px; text-align:center; background:#f8fafc; transition:.15s; }
.re-im-drop.re-drag { border-color:#7C3AED; background:#f5f3ff; }
.re-im-drop strong { display:block; margin-bottom:7px; font-size:16px; }
.re-im-file { position:absolute; width:1px; height:1px; opacity:0; }
.re-im-queue { display:grid; gap:10px; margin-top:16px; }
.re-im-upload { display:grid; grid-template-columns:52px 1fr auto; gap:12px; align-items:center; border:1px solid #e5e7eb; border-radius:9px; padding:9px; }
.re-im-upload img { width:52px; height:52px; border-radius:6px; object-fit:cover; background:#f1f5f9; }
.re-im-name { font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.re-im-meta { font-size:11px; color:#64748b; margin-top:3px; }
.re-im-progress { height:5px; background:#e2e8f0; border-radius:5px; margin-top:7px; overflow:hidden; }
.re-im-progress span { display:block; height:100%; background:#7C3AED; transition:width .15s; }
.re-im-tools { display:flex; gap:10px; margin-bottom:16px; }
.re-im-search { flex:1; margin:0 !important; }
.re-im-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(145px,1fr)); gap:14px; }
.re-im-card { position:relative; border:2px solid transparent; border-radius:10px; overflow:hidden; background:#f8fafc; cursor:pointer; text-align:left; padding:0; color:#0f172a; }
.re-im-card.re-selected { border-color:#7C3AED; box-shadow:0 0 0 2px #ede9fe; }
.re-im-card img { width:100%; height:120px; display:block; object-fit:cover; background:#e2e8f0; }
.re-im-card-info { padding:8px; }
.re-im-card-name { display:block; font-size:12px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.re-im-card-meta { font-size:10px; color:#64748b; }
.re-im-delete { position:absolute; top:6px; right:6px; width:28px; height:28px; border:0; border-radius:6px; background:rgba(15,23,42,.8); color:white; cursor:pointer; }
.re-im-empty { text-align:center; color:#64748b; padding:70px 10px; }
.re-im-foot { display:flex; justify-content:flex-end; gap:10px; padding:14px 22px; border-top:1px solid #e5e7eb; background:#f8fafc; }
.re-toast-wrap { position:fixed; right:18px; bottom:18px; z-index:100005; display:grid; gap:8px; }
.re-toast { background:#0f172a; color:white; padding:11px 15px; border-radius:8px; box-shadow:0 8px 24px #0003; font:13px var(--re-font); animation:reFadeIn .15s; }
.re-toast.re-error { background:#b91c1c; }
@media(max-width:600px){ .re-image-manager{padding:0}.re-image-manager .re-modal{height:100%;max-width:none;border-radius:0}.re-im-panel{max-height:calc(100vh - 190px)}.re-im-grid{grid-template-columns:repeat(2,minmax(0,1fr))} }
/* Mentions dropdown */
.re-mention-dropdown {
  position: absolute;
  background: #ffffff;
  border: 1px solid var(--re-border);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
  z-index: 10000;
  min-width: 200px;
  max-width: calc(100vw - 24px);
  max-height: 220px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px;
}
.re-mention-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 6px;
  color: #111827;
  transition: background 0.15s, color 0.15s;
}
.re-mention-item:hover, .re-mention-item.re-mention-active {
  background: var(--re-accent-light);
  color: var(--re-accent);
}
.re-mention-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--re-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.re-footer-badge.re-active {
  background: var(--re-accent-light);
  color: var(--re-accent);
  font-weight: 600;
}
/* Floating Context Toolbars (Table / Image) */
.re-floating-toolbar {
  position: absolute;
  background: #1e293b;
  color: #ffffff;
  border-radius: 6px;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 1000000 !important;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  max-width: calc(100vw - 12px);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.re-floating-toolbar::-webkit-scrollbar { height: 0; display: none; }
.re-floating-toolbar .re-btn {
  color: #f1f5f9;
  width: 26px;
  height: 26px;
}
.re-floating-toolbar .re-btn:hover {
  background: #334155;
  color: #ffffff;
}

/* ─── RESPONSIVE: TABLET ──────────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .re-toolbar {
    padding: 6px 8px;
  }
  .re-editor {
    padding: 18px 18px;
  }
  .re-source {
    padding: 18px 18px;
  }
}

/* ─── RESPONSIVE: MOBILE ──────────────────────────────────────────────────── */
@media (max-width: 640px) {
  /* Never let a configured pixel height push the editor past the screen. */
  .re-wrap:not(.re-fullscreen) {
    max-height: 85vh;
    max-height: 85dvh;
  }
  /* One swipeable row keeps every tool reachable without eating the viewport. */
  .re-toolbar {
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    gap: 2px;
    padding: 5px 8px;
    min-height: 46px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }
  .re-toolbar::-webkit-scrollbar { height: 0; display: none; }
  .re-btn {
    width: 34px;
    height: 34px;
  }
  .re-btn svg {
    width: 18px;
    height: 18px;
  }
  .re-sep {
    margin: 0 2px;
  }
  /* 16px avoids the iOS focus zoom; the cap stops long font names widening the row. */
  .re-select {
    height: 34px;
    font-size: 16px;
    max-width: 112px;
  }
  .re-editor {
    padding: 14px 16px;
    font-size: 16px;
    min-height: 180px;
  }
  .re-editor h1 { font-size: 1.7em; }
  .re-editor h2 { font-size: 1.42em; }
  .re-editor h3 { font-size: 1.2em; }
  .re-editor blockquote {
    margin: 1em 0;
    padding: 0.5em 0.9em;
  }
  .re-editor pre {
    padding: 12px 14px;
    font-size: 12.5px;
  }
  .re-editor td, .re-editor th {
    padding: 6px 9px;
  }
  .re-editor .re-media-wrap {
    margin: 1em 0;
  }
  .re-source {
    padding: 14px 16px;
    font-size: 16px;
    min-height: 180px;
  }
  .re-footer {
    padding: 6px 10px;
    gap: 8px;
    font-size: 11px;
  }
  .re-footer-right {
    text-align: right;
  }
  .re-modal-overlay {
    padding: 10px;
  }
  .re-modal {
    padding: 18px;
    border-radius: 12px;
    max-height: calc(100vh - 20px);
    max-height: calc(100dvh - 20px);
  }
  .re-modal h3 {
    font-size: 16px;
    margin-bottom: 14px;
  }
  .re-modal input[type="text"], .re-modal input[type="url"], .re-modal input[type="number"],
  .re-modal input[type="search"], .re-modal select, .re-modal textarea {
    font-size: 16px;
  }
  .re-modal-actions .re-btn-primary, .re-modal-actions .re-btn-secondary {
    flex: 1;
    padding: 11px 14px;
  }
  .re-floating-toolbar {
    max-width: calc(100vw - 8px);
  }
  .re-mention-dropdown {
    max-width: calc(100vw - 16px);
  }
  .re-mention-item {
    padding: 10px 12px;
    font-size: 15px;
  }
  .re-toast-wrap {
    left: 12px;
    right: 12px;
    bottom: 12px;
  }
  .re-im-tools {
    flex-wrap: wrap;
  }
  .re-im-drop {
    padding: 26px 14px;
  }
  .re-im-foot .re-btn-primary, .re-im-foot .re-btn-secondary {
    flex: 1;
  }
}

/* ─── RESPONSIVE: TOUCH INPUT ─────────────────────────────────────────────── */
@media (pointer: coarse) {
  .re-resize-handle {
    width: 16px;
    height: 16px;
  }
  .re-resize-handle.re-h-tl { top: -8px; left: -8px; }
  .re-resize-handle.re-h-tr { top: -8px; right: -8px; }
  .re-resize-handle.re-h-bl { bottom: -8px; left: -8px; }
  .re-resize-handle.re-h-br { bottom: -8px; right: -8px; }
  .re-floating-toolbar {
    padding: 5px 7px;
    gap: 5px;
  }
  .re-floating-toolbar .re-btn {
    width: 32px;
    height: 32px;
  }
  .re-img-size-input {
    height: 30px;
    font-size: 13px;
  }
  .re-im-delete {
    width: 32px;
    height: 32px;
  }
  .re-im-close {
    padding: 0 6px;
    min-width: 34px;
  }
}
`;

const GOOGLE_FONT_FAMILIES = [
  'ABeeZee', 'Abel', 'Abril Fatface', 'Alegreya', 'Amatic SC', 'Anton', 'Archivo',
  'Archivo Narrow', 'Arimo', 'Arsenal', 'Assistant', 'Barlow', 'Barlow Condensed',
  'Bebas Neue', 'Bitter', 'Bree Serif', 'Bungee', 'Cabin', 'Cairo', 'Caveat',
  'Chakra Petch', 'Cinzel', 'Comfortaa', 'Cormorant Garamond', 'Crimson Text',
  'DM Sans', 'Dancing Script', 'Domine', 'EB Garamond', 'Exo 2', 'Figtree',
  'Fira Code', 'Fira Sans', 'Fjalla One', 'Gloria Hallelujah', 'Great Vibes',
  'Heebo', 'IBM Plex Mono', 'IBM Plex Sans', 'IBM Plex Serif', 'Inconsolata',
  'Indie Flower', 'Inter', 'Jost', 'Josefin Sans', 'Kalam', 'Kanit', 'Karla',
  'Lato', 'Libre Baskerville', 'Libre Franklin', 'Lobster', 'Lora', 'Manrope',
  'Merriweather', 'Merriweather Sans', 'Montserrat', 'Mukta', 'Nanum Gothic',
  'Noto Sans', 'Noto Serif', 'Nunito', 'Nunito Sans', 'Open Sans', 'Orbitron',
  'Oswald', 'Pacifico', 'Passion One', 'Patrick Hand', 'Permanent Marker',
  'Play', 'Playfair Display', 'Plus Jakarta Sans', 'Poiret One', 'Poppins',
  'Press Start 2P', 'Prompt', 'Public Sans', 'Quicksand', 'Raleway', 'Righteous',
  'Roboto', 'Roboto Condensed', 'Roboto Mono', 'Roboto Slab', 'Rock Salt', 'Rubik',
  'Sacramento', 'Satisfy', 'Shadows Into Light', 'Signika', 'Slabo 27px',
  'Source Code Pro', 'Source Sans 3', 'Space Grotesk', 'Space Mono', 'Spectral',
  'Teko', 'Titillium Web', 'Ubuntu', 'Unbounded', 'Varela Round', 'Work Sans',
  'Yanone Kaffeesatz', 'Yellowtail', 'Zilla Slab'
];

function injectGoogleFonts() {
  if (typeof document === 'undefined' || document.getElementById('re-google-fonts')) return;
  const link = document.createElement('link');
  link.id = 're-google-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?' + GOOGLE_FONT_FAMILIES
    .map(font => `family=${encodeURIComponent(font)}`)
    .join('&') + '&display=swap';
  document.head.appendChild(link);
}

function injectStyles() {
  injectGoogleFonts();
  if (typeof document !== 'undefined' && !document.getElementById('re-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 're-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }
}

// ─── SVG ICONS ───────────────────────────────────────────────────────────────
const ICONS = {
  bold: `<svg viewBox="0 0 24 24"><path d="M15.6 10.79c.92-.67 1.4-1.61 1.4-2.79 0-2.43-1.97-4.2-4.85-4.2H6v15h7.68c2.69 0 4.67-1.8 4.67-4.26 0-1.72-.94-2.97-2.75-3.75zM9.5 5.7h3.1c1.35 0 2.15.67 2.15 1.7 0 1.1-.8 1.8-2.15 1.8H9.5V5.7zm3.6 10.1H9.5v-3.7h3.6c1.48 0 2.35.72 2.35 1.85 0 1.15-.87 1.85-2.35 1.85z"/></svg>`,
  italic: `<svg viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>`,
  underline: `<svg viewBox="0 0 24 24"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>`,
  strikethrough: `<svg viewBox="0 0 24 24"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>`,
  subscript: `<svg viewBox="0 0 24 24"><path d="M5.82 5.5H8.3l2.85 4.3 2.85-4.3h2.48l-4.08 5.8 4.33 6.2h-2.53L11.15 11.2l-3.05 6.3H5.56l4.35-6.2-4.09-5.8zm13.43 10.63c.43-.22.75-.54.96-.96.21-.42.32-.9.32-1.44 0-.85-.29-1.52-.87-2.01-.58-.49-1.37-.73-2.37-.73-.83 0-1.54.16-2.13.47v1.85c.61-.39 1.25-.58 1.93-.58.46 0 .82.1 1.08.3.26.2.39.49.39.87 0 .34-.11.6-.33.78-.22.18-.59.35-1.12.51l-.74.22c-.75.22-1.3.52-1.66.9-.36.38-.54.88-.54 1.5 0 .8.29 1.44.87 1.92.58.48 1.35.72 2.31.72.78 0 1.5-.18 2.16-.54v-1.8c-.62.4-1.27.6-1.95.6-.43 0-.77-.09-1.02-.27-.25-.18-.38-.44-.38-.78 0-.3.12-.54.36-.72.24-.18.63-.35 1.17-.51l.73-.21z"/></svg>`,
  superscript: `<svg viewBox="0 0 24 24"><path d="M5.82 9H8.3l2.85 4.3L14 9h2.48l-4.08 5.8 4.33 6.2h-2.53L11.15 14.7l-3.05 6.3H5.56l4.35-6.2L5.82 9zm13.43-1.63c.43-.22.75-.54.96-.96.21-.42.32-.9.32-1.44 0-.85-.29-1.52-.87-2.01-.58-.49-1.37-.73-2.37-.73-.83 0-1.54.16-2.13.47v1.85c.61-.39 1.25-.58 1.93-.58.46 0 .82.1 1.08.3.26.2.39.49.39.87 0 .34-.11.6-.33.78-.22.18-.59.35-1.12.51l-.74.22c-.75.22-1.3.52-1.66.9-.36.38-.54.88-.54 1.5 0 .8.29 1.44.87 1.92.58.48 1.35.72 2.31.72.78 0 1.5-.18 2.16-.54V8.17c-.62.4-1.27.6-1.95.6-.43 0-.77-.09-1.02-.27-.25-.18-.38-.44-.38-.78 0-.3.12-.54.36-.72.24-.18.63-.35 1.17-.51l.73-.21z"/></svg>`,
  textColor: `<svg viewBox="0 0 24 24"><path d="M9.62 16h4.75l.93 2.5h2.2L13.25 6H10.7L6.5 18.5h2.19l.93-2.5zm2.38-6.41L13.48 14H10.51l1.49-4.41z"/></svg>`,
  bgColor: `<svg viewBox="0 0 24 24"><path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5zM0 20h24v4H0z"/></svg>`,
  alignLeft: `<svg viewBox="0 0 24 24"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>`,
  alignCenter: `<svg viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4-8v2h18V7H3zm2 6h14v-2H5v2zm-2 8h18v-2H3v2zM7 3v2h10V3H7z"/></svg>`,
  alignRight: `<svg viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>`,
  alignJustify: `<svg viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zM3 3v2h18V3H3z"/></svg>`,
  bulletList: `<svg viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>`,
  orderedList: `<svg viewBox="0 0 24 24"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>`,
  indent: `<svg viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/></svg>`,
  outdent: `<svg viewBox="0 0 24 24"><path d="M11 17h10v-2H11v2zm-8-5l4 4V8l-4 4zm0 9h18v-2H3v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/></svg>`,
  blockquote: `<svg viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>`,
  hr: `<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>`,
  link: `<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>`,
  unlink: `<svg viewBox="0 0 24 24"><path d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.25-.74 2.32-1.8 2.81l1.43 1.43C21.04 15.02 22 13.62 22 12c0-2.76-2.24-5-5-5zM2 4.27l3.11 3.11C3.8 8.08 3 9.44 3 11c0 2.76 2.24 5 5 5h4v-1.9H8c-1.71 0-3.1-1.39-3.1-3.1 0-1.28.78-2.37 1.89-2.83L12.59 14H8v2h6.17l4.56 4.56 1.27-1.27L3.27 3 2 4.27z"/></svg>`,
  table: `<svg viewBox="0 0 24 24"><path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 2v3H4V5h16zm-11 5h5v4H9v-4zm-5 4v-4h3v4H4zm0 2h3v4H4v-4zm5 4v-4h5v4H9zm7 0v-4h4v4h-4zm4-6h-4v-4h4v4z"/></svg>`,
  image: `<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
  mediaEmbed: `<svg viewBox="0 0 24 24"><path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>`,
  codeBlock: `<svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
  codeSpan: `<svg viewBox="0 0 24 24"><path d="M8 16l-4-4 4-4 1.41 1.41L6.83 12l2.58 2.59L8 16zm8 0l-1.41-1.41L17.17 12l-2.58-2.59L16 8l4 4-4 4zM14.2 4l-4.4 16h-2L12.2 4h2z"/></svg>`,
  clearFormatting: `<svg viewBox="0 0 24 24"><path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.27 5zM6 5v.18L8.82 8h2.4L9.37 12.11l1.45 1.45L13.8 7h4.2V5H6z"/></svg>`,
  findReplace: `<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM10 7H9v2H7v1h2v2h1v-2h2V9h-2V7z"/></svg>`,
  plainTextPaste: `<svg viewBox="0 0 24 24"><path d="M19 2h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 16H5V4h2v3h10V4h2v14zM8 12h8v2H8zm0-4h8v2H8z"/></svg>`,
  sourceView: `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`,
  undo: `<svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>`,
  redo: `<svg viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>`,
};

// ─── DEFAULT TOOLBAR GROUPS ──────────────────────────────────────────────────
const DEFAULT_TOOLBAR = [
  'undo', 'redo', '|',
  'heading', 'fontFamily', 'fontSize', '|',
  'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'codeSpan', 'clearFormatting', '|',
  'textColor', 'bgColor', '|',
  'alignLeft', 'alignCenter', 'alignRight', 'alignJustify', '|',
  'bulletList', 'orderedList', 'indent', 'outdent', '|',
  'blockquote', 'hr', 'link', 'table', 'image', 'mediaEmbed', 'codeBlock', '|',
  'findReplace', 'plainTextPaste', 'sourceView', 'fullscreen'
];

// ─── RICH EDITOR CLASS ───────────────────────────────────────────────────────
class RichEditor {
  /**
   * @param {string|HTMLElement} target
   * @param {Object} options
   */
  constructor(target, options = {}) {
    injectStyles();

    this.container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!this.container) {
      throw new Error(`[RichEditor] Target element "${target}" not found.`);
    }

    this.options = Object.assign({
      placeholder: 'Type your content here...',
      height: '350px',
      readOnly: false,
      toolbar: DEFAULT_TOOLBAR,
      mentions: [],
      imageApi: {
        uploadUrl: 'https://uat.surginatal.com/Admin/users/dashboard/editor-image/upload',
        listUrl: 'https://uat.surginatal.com/Admin/users/dashboard/editor-image/all',
        deleteUrl: 'https://uat.surginatal.com/Admin/users/dashboard/editor-image/delete',
        headers: {},
      },
      fileUpload: {
        enabled: false,
        allowedTypes: ['application/pdf', '.doc', '.docx', '.zip'],
        maxFileSize: 50 * 1024 * 1024,
      },
      onImageUpload: null,
      onImageDelete: null,
      onChange: null,
      onReady: null,
    }, options);

    this.history = [];
    this.historyIndex = -1;
    this.isPlainTextPaste = false;
    this.isSourceView = false;
    this.isFullScreen = false;
    this.activeImg = null;
    this.mentionDropdown = null;
    this.mentionFilteredList = [];
    this.mentionActiveIndex = 0;
    this._imageRequests = new Set();
    this._imageObjectUrls = new Set();
    this._imageManager = null;

    this.initDOM();
    this.bindEvents();
    this.saveHistoryState();

    if (typeof this.options.onReady === 'function') {
      this.options.onReady(this);
    }
  }

  // ─── INITIALIZATION ────────────────────────────────────────────────────────
  initDOM() {
    this.wrapEl = document.createElement('div');
    this.wrapEl.className = 're-wrap';
    this.wrapEl.style.height = '100%';
    this.wrapEl.style.maxHeight = '100%';

    // Build Toolbar
    this.toolbarEl = document.createElement('div');
    this.toolbarEl.className = 're-toolbar';
    this.toolbarEl.setAttribute('role', 'toolbar');
    this.toolbarEl.setAttribute('aria-label', 'Editor Toolbar');
    this.buildToolbar();
    if (this.options.readOnly) {
      this.toolbarEl.querySelectorAll('button, select, input').forEach(control => {
        if (control.dataset.action !== 'fullscreen') control.disabled = true;
      });
    }

    // Editor Body & ContentEditable
    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 're-body';

    this.editorEl = document.createElement('div');
    this.editorEl.className = 're-editor';
    this.editorEl.contentEditable = this.options.readOnly ? 'false' : 'true';
    this.editorEl.setAttribute('aria-readonly', String(this.options.readOnly));
    this.editorEl.setAttribute('spellcheck', 'true');
    this.editorEl.setAttribute('data-placeholder', this.options.placeholder);
    this.editorEl.setAttribute('role', 'textbox');
    this.editorEl.setAttribute('aria-multiline', 'true');

    // Source Code Textarea
    this.sourceEl = document.createElement('textarea');
    this.sourceEl.className = 're-source';
    this.sourceEl.readOnly = this.options.readOnly;
    this.sourceEl.setAttribute('aria-label', 'HTML Source Code');

    // Footer with Word Count and Badges
    this.footerEl = document.createElement('div');
    this.footerEl.className = 're-footer';
    this.footerEl.innerHTML = `
      <div class="re-footer-left">
        <span class="re-footer-badge" id="re-paste-badge">Plain Paste: OFF</span>
      </div>
      <div class="re-footer-right" id="re-counter">0 words | 0 characters</div>
    `;

    this.bodyEl.appendChild(this.editorEl);
    this.bodyEl.appendChild(this.sourceEl);

    this.wrapEl.appendChild(this.toolbarEl);
    this.wrapEl.appendChild(this.bodyEl);
    this.wrapEl.appendChild(this.footerEl);

    this.container.innerHTML = '';
    this.container.appendChild(this.wrapEl);

    // Initial content if any in target container or set HTML
    if (this.options.value) {
      this.setHTML(this.options.value);
    }
  }

  buildToolbar() {
    const items = this.options.toolbar;
    items.forEach(item => {
      if (item === '|') {
        const sep = document.createElement('div');
        sep.className = 're-sep';
        this.toolbarEl.appendChild(sep);
        return;
      }

      switch (item) {
        case 'heading':
          this.toolbarEl.appendChild(this.createHeadingSelect());
          break;
        case 'fontFamily':
          this.toolbarEl.appendChild(this.createFontSelect());
          break;
        case 'fontSize':
          this.toolbarEl.appendChild(this.createSizeSelect());
          break;
        case 'textColor':
          this.toolbarEl.appendChild(this.createColorPicker('textColor', 'Text Color', 'foreColor'));
          break;
        case 'bgColor':
          this.toolbarEl.appendChild(this.createColorPicker('bgColor', 'Background Color', 'hiliteColor'));
          break;
        default:
          if (ICONS[item]) {
            const btn = this.createButton(item);
            this.toolbarEl.appendChild(btn);
          }
          break;
      }
    });
  }

  createButton(name) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 're-btn';
    btn.dataset.action = name;
    btn.title = this.getLabel(name);
    btn.setAttribute('aria-label', this.getLabel(name));
    btn.innerHTML = ICONS[name] || '';

    // Prevent mousedown from stealing focus/selection from the editor
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleAction(name);
    });
    return btn;
  }

  getLabel(name) {
    const labels = {
      bold: 'Bold (Ctrl+B)', italic: 'Italic (Ctrl+I)', underline: 'Underline (Ctrl+U)',
      strikethrough: 'Strikethrough', subscript: 'Subscript', superscript: 'Superscript',
      alignLeft: 'Align Left', alignCenter: 'Align Center', alignRight: 'Align Right', alignJustify: 'Justify',
      bulletList: 'Bullet List', orderedList: 'Numbered List', indent: 'Indent', outdent: 'Outdent',
      blockquote: 'Blockquote', hr: 'Horizontal Line', link: 'Insert Link (Ctrl+K)',
      table: 'Insert Table', image: 'Insert Image', mediaEmbed: 'Embed Media', codeBlock: 'Code Block',
      codeSpan: 'Inline Code', clearFormatting: 'Clear Formatting', findReplace: 'Find & Replace (Ctrl+Shift+F)',
      plainTextPaste: 'Toggle Plain Text Paste', sourceView: 'Source Code View', fullscreen: 'Full Screen',
      undo: 'Undo (Ctrl+Z)', redo: 'Redo (Ctrl+Y)'
    };
    return labels[name] || name;
  }

  createHeadingSelect() {
    const select = document.createElement('select');
    select.className = 're-select';
    select.title = 'Paragraph Format';
    select.setAttribute('aria-label', 'Paragraph Format');
    const options = [
      { label: 'Paragraph', val: 'p' },
      { label: 'Heading 1', val: 'h1' },
      { label: 'Heading 2', val: 'h2' },
      { label: 'Heading 3', val: 'h3' },
      { label: 'Heading 4', val: 'h4' },
      { label: 'Heading 5', val: 'h5' },
      { label: 'Heading 6', val: 'h6' },
      { label: 'Preformatted', val: 'pre' }
    ];
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.val;
      o.textContent = opt.label;
      select.appendChild(o);
    });

    select.addEventListener('change', () => {
      const val = select.value;
      this.execCommand('formatBlock', `<${val}>`);
    });
    this.headingSelect = select;
    return select;
  }

  createFontSelect() {
    const select = document.createElement('select');
    select.className = 're-select';
    select.title = 'Font Family';
    select.setAttribute('aria-label', 'Font Family');
    const fonts = [
      'sans-serif', 'Arial', 'Calibri', 'Cambria', 'Comic Sans MS', 'Courier New',
      'Georgia', 'Helvetica', 'Impact', 'Lucida Console', 'Palatino Linotype',
      'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana',
      ...GOOGLE_FONT_FAMILIES
    ];
    fonts.forEach(f => {
      const o = document.createElement('option');
      o.value = f;
      o.textContent = f;
      o.style.fontFamily = `"${f}", sans-serif`;
      select.appendChild(o);
    });
    select.addEventListener('change', () => {
      this.execCommand('fontName', select.value);
    });
    this.fontSelect = select;
    return select;
  }

  createSizeSelect() {
    const select = document.createElement('select');
    select.className = 're-select';
    select.title = 'Font Size';
    select.setAttribute('aria-label', 'Font Size');
    const sizes = [
      { label: 'Small', val: '2' },
      { label: 'Normal', val: '3' },
      { label: 'Medium', val: '4' },
      { label: 'Large', val: '5' },
      { label: 'Huge', val: '6' }
    ];
    sizes.forEach(s => {
      const o = document.createElement('option');
      o.value = s.val;
      o.textContent = s.label;
      if (s.val === '3') o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', () => {
      this.execCommand('fontSize', select.value);
    });
    this.sizeSelect = select;
    return select;
  }

  createColorPicker(name, label, command) {
    const wrap = document.createElement('div');
    wrap.className = 're-color-wrapper';
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 're-btn';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    
    const bar = document.createElement('div');
    bar.className = 're-color-bar';
    bar.style.backgroundColor = name === 'textColor' ? '#111827' : '#fef08a';
    
    btn.innerHTML = ICONS[name];
    btn.appendChild(bar);

    const input = document.createElement('input');
    input.type = 'color';
    input.value = name === 'textColor' ? '#111827' : '#fef08a';

    input.addEventListener('input', () => {
      bar.style.backgroundColor = input.value;
      this.execCommand(command, input.value);
    });

    wrap.appendChild(btn);
    wrap.appendChild(input);
    this.colorPickers = this.colorPickers || {};
    this.colorPickers[name] = { input, bar };
    return wrap;
  }

  // ─── EVENTS & LISTENERS ───────────────────────────────────────────────────
  bindEvents() {
    // Input / History
    this.editorEl.addEventListener('input', () => {
      if (this._isPasting) return;
      this.updateCounters();
      this.saveHistoryState();
      this.triggerChange();
      this.checkMentionTrigger();
      this.updateToolbarState();
    });

    const onCaretMove = () => this.updateToolbarState();
    this.editorEl.addEventListener('keyup', onCaretMove);
    this.editorEl.addEventListener('mouseup', onCaretMove);
    this.editorEl.addEventListener('click', onCaretMove);
    this.editorEl.addEventListener('focus', onCaretMove);

    // Keydown Shortcuts & Mention / Table navigation
    this.editorEl.addEventListener('keydown', (e) => {
      // Mentions Navigation
      if (this.mentionDropdown) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.mentionActiveIndex = (this.mentionActiveIndex + 1) % this.mentionFilteredList.length;
          this.updateMentionActiveItem();
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.mentionActiveIndex = (this.mentionActiveIndex - 1 + this.mentionFilteredList.length) % this.mentionFilteredList.length;
          this.updateMentionActiveItem();
          return;
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const selected = this.mentionFilteredList[this.mentionActiveIndex];
          if (selected) {
            this.insertMention(selected);
            this.hideMentionDropdown();
          }
          return;
        } else if (e.key === 'Escape') {
          this.hideMentionDropdown();
          return;
        }
      }

      // Table Tab / Shift+Tab cell navigation
      if (e.key === 'Tab') {
        const cell = this.getSelectedElement()?.closest('td, th');
        if (cell && this.editorEl.contains(cell)) {
          e.preventDefault();
          const table = cell.closest('table');
          if (table) {
            const allCells = Array.from(table.querySelectorAll('td, th'));
            const currentIndex = allCells.indexOf(cell);
            if (e.shiftKey) {
              if (currentIndex > 0) {
                this.placeCaretInCell(allCells[currentIndex - 1]);
              }
            } else {
              if (currentIndex < allCells.length - 1) {
                this.placeCaretInCell(allCells[currentIndex + 1]);
              } else {
                const lastRow = table.rows[table.rows.length - 1];
                const newRow = document.createElement('tr');
                for (let i = 0; i < lastRow.children.length; i++) {
                  const newCell = document.createElement(lastRow.children[i].tagName.toLowerCase() === 'th' ? 'td' : 'td');
                  newCell.innerHTML = '<br>';
                  newRow.appendChild(newCell);
                }
                lastRow.parentElement.appendChild(newRow);
                if (newRow.children[0]) this.placeCaretInCell(newRow.children[0]);
                this.saveHistoryState();
                this.triggerChange();
              }
            }
            return;
          }
        }
      }

      // Keyboard Delete for selected image
      if (this.activeImg && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        const wrap = this.activeImg.closest('.re-img-resize-wrap');
        if (wrap) wrap.remove(); else this.activeImg.remove();
        this.activeImg = null;
        this.hideFloatingToolbar();
        this.removeResizeHandles();
        this.saveHistoryState();
        this.triggerChange();
        return;
      }

      // Keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'b') { e.preventDefault(); this.execCommand('bold'); }
        else if (key === 'i') { e.preventDefault(); this.execCommand('italic'); }
        else if (key === 'u') { e.preventDefault(); this.execCommand('underline'); }
        else if (key === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
        else if (key === 'y') { e.preventDefault(); this.redo(); }
        else if (key === 'k') { e.preventDefault(); this.openLinkModal(); }
        else if (key === 'f' && e.shiftKey) { e.preventDefault(); this.openFindReplaceModal(); }
      }
    });

    // Selection change for toolbar state updates (bound so we can remove on destroy)
    this._selectionChangeHandler = () => {
      const selection = window.getSelection();
      const anchor = selection && selection.anchorNode;
      if (anchor && (anchor === this.editorEl || this.editorEl.contains(anchor))) {
        this.updateToolbarState();
      }
    };
    document.addEventListener('selectionchange', this._selectionChangeHandler);

    // Hide floating toolbars when scrolling editor body or window
    this._onScrollHandler = () => this.hideFloatingToolbar();
    this.bodyEl.addEventListener('scroll', this._onScrollHandler, { passive: true });
    window.addEventListener('scroll', this._onScrollHandler, { capture: true, passive: true });

    // Paste Handling
    this.editorEl.addEventListener('paste', (e) => this.handlePaste(e));

    // Image & Table Click selection
    this.editorEl.addEventListener('click', (e) => this.handleEditorClick(e));

    // Sync Source text modifications
    this.sourceEl.addEventListener('input', () => {
      if (this.options.readOnly) return;
      this.editorEl.innerHTML = this.sanitizeHTML(this.sourceEl.value);
      this.updateCounters();
      this.triggerChange();
    });
  }

  placeCaretInCell(cell) {
    this.editorEl.focus();
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    this.activeCell = cell;
    this.showTableToolbar(cell);
  }

  // ─── COMMAND EXECUTION & STATE ─────────────────────────────────────────────
  execCommand(cmd, val = null) {
    if (this.options.readOnly) return;

    // Save current selection before focusing (safety net)
    const sel = window.getSelection();
    let savedRange = null;
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // Only save if the selection is within the editor
      if (this.editorEl.contains(range.startContainer) || this.editorEl === range.startContainer) {
        savedRange = range.cloneRange();
      }
    }

    this.editorEl.focus();

    // Restore selection if it was lost during focus
    if (savedRange) {
      const currentSel = window.getSelection();
      if (!currentSel || currentSel.rangeCount === 0 ||
          (!this.editorEl.contains(currentSel.anchorNode) && this.editorEl !== currentSel.anchorNode)) {
        currentSel.removeAllRanges();
        currentSel.addRange(savedRange);
      }
    }

    document.execCommand(cmd, false, val);
    this.updateToolbarState();
    this.saveHistoryState();
    this.triggerChange();
  }

  isFormatActive(cmd) {
    if (cmd === 'bold') return this.isBoldActive();
    if (document.queryCommandState(cmd)) return true;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;
    const tagMap = {
      italic: ['i', 'em'],
      underline: ['u'],
      strikethrough: ['s', 'strike', 'del'],
      justifyLeft: [], justifyCenter: [], justifyRight: [], justifyFull: []
    };
    const targetTags = tagMap[cmd] || [];
    while (node && node !== this.editorEl) {
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (targetTags.includes(tag)) return true;
      node = node.parentNode;
    }
    return false;
  }

  isBoldActive() {
    if (document.queryCommandState('bold')) return true;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;
    while (node && node !== this.editorEl) {
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (['b', 'strong', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th'].includes(tag)) return true;
      try {
        const weight = window.getComputedStyle(node).fontWeight;
        if (weight === 'bold' || parseInt(weight, 10) >= 600) return true;
      } catch (e) {
        // Silently skip if computed style unavailable
      }
      node = node.parentNode;
    }
    return false;
  }

  updateToolbarState() {
    if (this.isSourceView) return;

    const commands = [
      'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript',
      'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
      'insertUnorderedList', 'insertOrderedList'
    ];

    const commandMap = {
      alignLeft: 'justifyLeft', alignCenter: 'justifyCenter',
      alignRight: 'justifyRight', alignJustify: 'justifyFull',
      bulletList: 'insertUnorderedList', orderedList: 'insertOrderedList'
    };

    this.toolbarEl.querySelectorAll('.re-btn').forEach(btn => {
      const action = btn.dataset.action;
      const cmd = commandMap[action] || action;
      if (commands.includes(cmd)) {
        if (this.isFormatActive(cmd)) {
          btn.classList.add('re-active');
        } else {
          btn.classList.remove('re-active');
        }
      }
    });

    // Update Font Family Select
    if (this.fontSelect) {
      const fontName = document.queryCommandValue('fontName') || '';
      const normalizedFont = fontName.replace(/^['"]|['"]$/g, '').trim().toLowerCase();
      const matchingFont = Array.from(this.fontSelect.options).find(option =>
        option.value.toLowerCase() === normalizedFont ||
        option.value.toLowerCase().replace(/\s+/g, '') === normalizedFont.replace(/\s+/g, '')
      );
      this.fontSelect.value = matchingFont ? matchingFont.value : '';
    }

    // Update Font Size Select
    if (this.sizeSelect) {
      const sizeValue = document.queryCommandValue('fontSize');
      const matchingSize = Array.from(this.sizeSelect.options).find(option => option.value === sizeValue);
      this.sizeSelect.value = matchingSize ? matchingSize.value : '';
    }

    // Update Text and Background Color Pickers
    const colorCommands = { textColor: 'foreColor', bgColor: 'hiliteColor' };
    Object.entries(colorCommands).forEach(([name, command]) => {
      const picker = this.colorPickers && this.colorPickers[name];
      if (!picker) return;
      const color = this.normalizeToolbarColor(document.queryCommandValue(command));
      if (color) {
        picker.input.value = color;
        picker.bar.style.backgroundColor = color;
      }
    });

    // Update Heading Select
    if (this.headingSelect) {
      const parentBlock = this.getClosestBlockElement();
      if (parentBlock) {
        const tag = parentBlock.tagName.toLowerCase();
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre'].includes(tag)) {
          this.headingSelect.value = tag;
        } else {
          this.headingSelect.value = 'p';
        }
      } else {
        this.headingSelect.value = 'p';
      }
    }
  }

  normalizeToolbarColor(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
    if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(color)) {
      return '#' + color.slice(1).split('').map(char => char + char).join('').toLowerCase();
    }
    const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!rgb) return null;
    return '#' + rgb.slice(1, 4).map(value => Number(value).toString(16).padStart(2, '0')).join('');
  }

  getClosestBlockElement() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;
    while (node && node !== this.editorEl) {
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'blockquote', 'li', 'td'].includes(tag)) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  handleAction(name) {
    if (this.options.readOnly && name !== 'fullscreen') return;
    switch (name) {
      case 'bold': this.execCommand('bold'); break;
      case 'italic': this.execCommand('italic'); break;
      case 'underline': this.execCommand('underline'); break;
      case 'strikethrough': this.execCommand('strikeThrough'); break;
      case 'subscript': this.execCommand('subscript'); break;
      case 'superscript': this.execCommand('superscript'); break;
      case 'alignLeft': this.execCommand('justifyLeft'); break;
      case 'alignCenter': this.execCommand('justifyCenter'); break;
      case 'alignRight': this.execCommand('justifyRight'); break;
      case 'alignJustify': this.execCommand('justifyFull'); break;
      case 'bulletList': this.execCommand('insertUnorderedList'); break;
      case 'orderedList': this.execCommand('insertOrderedList'); break;
      case 'indent': this.execCommand('indent'); break;
      case 'outdent': this.execCommand('outdent'); break;
      case 'blockquote': this.execCommand('formatBlock', '<blockquote>'); break;
      case 'hr': this.execCommand('insertHorizontalRule'); break;
      case 'link': this.openLinkModal(); break;
      case 'table': this.openTableModal(); break;
      case 'image': this.openImageModal(); break;
      case 'mediaEmbed': this.openMediaModal(); break;
      case 'codeBlock': this.openCodeBlockModal(); break;
      case 'codeSpan': this.insertInlineCode(); break;
      case 'clearFormatting': this.execCommand('removeFormat'); break;
      case 'findReplace': this.openFindReplaceModal(); break;
      case 'plainTextPaste': this.togglePlainTextPaste(); break;
      case 'sourceView': this.toggleSourceView(); break;
      case 'fullscreen': this.toggleFullScreen(); break;
      case 'undo': this.undo(); break;
      case 'redo': this.redo(); break;
    }
  }

  // ─── UNDO / REDO HISTORY ───────────────────────────────────────────────────
  saveHistoryState() {
    const html = this.editorEl.innerHTML;
    if (this.historyIndex >= 0 && this.history[this.historyIndex] === html) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(html);
    if (this.history.length > 50) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.editorEl.innerHTML = this.history[this.historyIndex];
      this.updateCounters();
      this.triggerChange();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.editorEl.innerHTML = this.history[this.historyIndex];
      this.updateCounters();
      this.triggerChange();
    }
  }

  // ─── PASTE HANDLING & SANITIZATION ─────────────────────────────────────────
  handlePaste(e) {
    if (this.options.readOnly) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const insertPastedContent = (content, command) => {
      this._isPasting = true;
      document.execCommand(command, false, content);
      if (this._pasteFrame) cancelAnimationFrame(this._pasteFrame);
      this._pasteFrame = requestAnimationFrame(() => {
        this._pasteFrame = null;
        this._isPasting = false;
        this.wrapBareTables();
        this.updateCounters();
        this.saveHistoryState();
        this.triggerChange();
        this.checkMentionTrigger();
      });
    };

    if (this.isPlainTextPaste) {
      const text = e.clipboardData.getData('text/plain');
      insertPastedContent(text, 'insertText');
      return;
    }

    const html = e.clipboardData.getData('text/html');
    if (!html) {
      const text = e.clipboardData.getData('text/plain');
      insertPastedContent(text, 'insertText');
      return;
    }

    const cleanHTML = this.sanitizeHTML(html);
    insertPastedContent(cleanHTML, 'insertHTML');
  }

  sanitizeHTML(dirtyHTML) {
    const isGoogleDocs = /docs-internal-guid|google-sheets-html-origin|id=["']?docs-internal/i.test(dirtyHTML);
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirtyHTML, 'text/html');

    // 1) Inline styles from <style> tags onto matching elements BEFORE we strip them.
    //    Google Docs & Word ship CSS in <style> blocks with class refs — if we skip this,
    //    all font/color/size/alignment info disappears the moment we remove the tag.
    doc.querySelectorAll('style').forEach(styleEl => {
      const cssText = styleEl.textContent || '';
      // Match `selector { declarations }` — skip @media / @font-face blocks.
      const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
      let match;
      while ((match = ruleRegex.exec(cssText)) !== null) {
        const selectorGroup = match[1].trim();
        const declarations = match[2].trim();
        if (!selectorGroup || selectorGroup.startsWith('@')) continue;
        // A rule can list multiple comma-separated selectors — apply to each.
        selectorGroup.split(',').forEach(sel => {
          const clean = sel.trim();
          if (!clean) return;
          try {
            doc.querySelectorAll(clean).forEach(el => {
              // Merge: element-level inline styles win over stylesheet rules.
              const existing = el.getAttribute('style') || '';
              el.setAttribute('style', declarations + ';' + existing);
            });
          } catch (err) {
            // Invalid or unsupported selector — silently skip.
          }
        });
      }
    });

    // Formatting placed on the clipboard body would otherwise be lost when only
    // body.innerHTML is inserted. Move those inherited declarations to each root.
    if (isGoogleDocs) {
      const bodyStyle = doc.body.getAttribute('style') || '';
      Array.from(doc.body.children).forEach(child => {
        const childStyle = child.getAttribute('style') || '';
        if (bodyStyle) child.setAttribute('style', `${bodyStyle};${childStyle}`);
        child.classList.add('re-google-doc-block');
      });
    }

    // Remove dangerous / document-chrome elements.
    doc.querySelectorAll('script, style, object, embed, form, input, button, meta, link, title, head, base').forEach(el => el.remove());

    // Google Docs wraps the copied fragment in a docs-internal GUID element.
    // Carry its inherited formatting onto its top-level children before unwrapping it.
    doc.querySelectorAll('b[id^="docs-internal-guid"], span[id^="docs-internal-guid"]').forEach(wrapper => {
      const inheritedStyle = wrapper.getAttribute('style') || '';
      if (inheritedStyle) {
        Array.from(wrapper.children).forEach(child => {
          const childStyle = child.getAttribute('style') || '';
          child.setAttribute('style', `${inheritedStyle};${childStyle}`);
        });
      }
    });

    // Preserve formatting inherited from the Google Docs wrapper while removing
    // that wrapper. Without this, body-level font and spacing are lost.
    doc.querySelectorAll('google-sheets-html-origin, b[id^="docs-internal-guid"], span[id^="docs-internal-guid"]').forEach(el => {
      const parent = el.parentNode;
      const inheritedStyle = el.getAttribute('style') || '';
      while (el.firstChild) {
        const child = el.firstChild;
        if (child.nodeType === 1 && inheritedStyle) {
          const childStyle = child.getAttribute('style') || '';
          child.setAttribute('style', `${inheritedStyle};${childStyle}`);
        }
        if (child.nodeType === 1 && /^(P|H[1-6]|LI|BLOCKQUOTE|TABLE|TR|TD|TH|PRE|DIV)$/.test(child.tagName)) {
          child.classList.add('re-google-doc-block');
        }
        parent.insertBefore(child, el);
      }
      parent.removeChild(el);
    });

    // Mark remaining Google Docs block elements so editor theme defaults cannot
    // change their imported typography and spacing.
    if (isGoogleDocs) {
      doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, table, tr, td, th, pre, div').forEach(el => {
        el.classList.add('re-google-doc-block');
      });
    }

    // 4) Whitelist of inline CSS properties we keep — everything else is dropped.
    //    This covers the full range of formatting a Google Doc or Word doc might carry.
    const SAFE_STYLES = new Set([
      'font', 'font-weight', 'font-style', 'font-size-adjust', 'font-stretch', 'font-kerning', 'font-feature-settings',
      'font-variant', 'font-variant-caps', 'font-variant-east-asian', 'font-variant-ligatures', 'font-variant-numeric',
      'text-decoration', 'text-decoration-line', 'text-decoration-color', 'text-decoration-style', 'text-decoration-thickness', 'text-decoration-skip-ink', 'text-underline-offset',
      'color', 'background-color', 'background',
      'font-size', 'font-family',
      'text-align', 'text-align-last', 'text-indent', 'text-transform', 'text-shadow',
      'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
      'padding', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom',
      'border', 'border-top', 'border-bottom', 'border-left', 'border-right',
      'border-color', 'border-style', 'border-width',
      'border-top-color', 'border-top-style', 'border-top-width',
      'border-bottom-color', 'border-bottom-style', 'border-bottom-width',
      'border-left-color', 'border-left-style', 'border-left-width',
      'border-right-color', 'border-right-style', 'border-right-width',
      'border-collapse', 'border-spacing', 'border-radius',
      'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
      'vertical-align',
      'list-style-type', 'list-style-position', 'list-style',
      'float', 'clear', 'display',
      'white-space', 'word-break', 'overflow-wrap', 'word-wrap', 'hyphens', 'tab-size',
      'line-height', 'letter-spacing', 'word-spacing',
      'page-break-before', 'page-break-after', 'page-break-inside', 'break-before', 'break-after', 'break-inside',
      'orphans', 'widows',
      'direction', 'unicode-bidi',
    ]);

    // Parses a raw `style` attribute value into safe declarations only.
    const filterStyleAttr = (raw) => {
      if (!raw) return '';
      const kept = [];
      // Split declarations, respecting parentheses (url(), rgb(), etc.)
      let depth = 0, buf = '';
      const parts = [];
      for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (ch === ';' && depth === 0) { parts.push(buf); buf = ''; }
        else buf += ch;
      }
      if (buf.trim()) parts.push(buf);

      parts.forEach(decl => {
        const idx = decl.indexOf(':');
        if (idx === -1) return;
        const prop = decl.slice(0, idx).trim().toLowerCase();
        const val = decl.slice(idx + 1).trim();
        if (!prop || !val) return;
        if (val.toLowerCase().includes('javascript:') || val.toLowerCase().includes('expression(') || /url\s*\(/i.test(val)) return;
        if (SAFE_STYLES.has(prop)) kept.push(`${prop}: ${val}`);
      });
      return kept.join('; ');
    };

    // 5) Clean every element: attributes, styles, classes.
    const allEls = doc.body.querySelectorAll('*');
    allEls.forEach(el => {
      // Kill event handlers and javascript: URLs.
      Array.from(el.attributes).forEach(attr => {
        const name = attr.name;
        const value = attr.value || '';
        if (name.startsWith('on')) {
          el.removeAttribute(name);
        } else if (name === 'href' || name === 'src') {
          let val = value.trim();
          const normalized = val.toLowerCase().replace(/[\u0000-\u0020]+/g, '');
          const isImageData = name === 'src' && el.tagName === 'IMG' && /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(val);
          let isSafe = /^(?:https?:|mailto:|tel:|\/|#|\.\/|\.\.\/)/i.test(normalized) || isImageData;
          if (!isSafe && name === 'href' && val) {
            if (/^[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}(?::\d+)?(?:\/.*)?$/i.test(val)) {
              val = 'https://' + val;
              el.setAttribute('href', val);
              isSafe = true;
            }
          }
          if (!isSafe) el.removeAttribute(name);
        }
      });

      if (el.tagName === 'IFRAME') {
        try {
          const frameURL = new URL(el.getAttribute('src') || '', window.location.href);
          const allowedHost = frameURL.protocol === 'https:' &&
            (frameURL.hostname === 'www.youtube.com' || frameURL.hostname === 'youtube.com' || frameURL.hostname === 'player.vimeo.com');
          if (!allowedHost) el.remove();
        } catch (err) {
          el.remove();
        }
      }

      // Filter inline styles to the safe whitelist.
      if (el.hasAttribute('style')) {
        const filtered = filterStyleAttr(el.getAttribute('style'));
        if (filtered) el.setAttribute('style', filtered);
        else el.removeAttribute('style');
      }

      // Drop noisy Word classes. Google Docs classes are retained because their
      // stylesheet rules have already been inlined, and may still identify structure.
      if (el.className && typeof el.className === 'string') {
        const cleaned = el.className
          .split(/\s+/)
          .filter(c => c && !/^Mso/i.test(c) && (isGoogleDocs || !/^c\d+$/.test(c)))
          .join(' ')
          .trim();
        if (cleaned) el.className = cleaned;
        else el.removeAttribute('class');
      }

      // Strip document-scoped attributes that would collide with the host page.
      ['id', 'role', 'aria-hidden', 'aria-labelledby'].forEach(a => {
        if (el.hasAttribute(a)) el.removeAttribute(a);
      });
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) el.removeAttribute(attr.name);
      });
    });

    // 6) Google Docs often wraps inline runs in redundant <span> without styles.
    //    Unwrap those so the resulting HTML stays clean.
    doc.body.querySelectorAll('span').forEach(span => {
      if (!span.attributes.length) {
        const parent = span.parentNode;
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        parent.removeChild(span);
      }
    });

    return doc.body.innerHTML;
  }

  togglePlainTextPaste() {
    this.isPlainTextPaste = !this.isPlainTextPaste;
    const badge = this.footerEl.querySelector('#re-paste-badge');
    const btn = this.toolbarEl.querySelector('[data-action="plainTextPaste"]');
    if (this.isPlainTextPaste) {
      badge.textContent = 'Plain Paste: ON';
      badge.classList.add('re-active');
      if (btn) btn.classList.add('re-active');
    } else {
      badge.textContent = 'Plain Paste: OFF';
      badge.classList.remove('re-active');
      if (btn) btn.classList.remove('re-active');
    }
  }

  // ─── SOURCE VIEW & FULLSCREEN ──────────────────────────────────────────────
  toggleSourceView() {
    if (this.options.readOnly) return;
    this.isSourceView = !this.isSourceView;
    const btn = this.toolbarEl.querySelector('[data-action="sourceView"]');

    if (this.isSourceView) {
      this.sourceEl.value = this.getHTML();
      this.sourceEl.classList.add('re-visible');
      this.editorEl.style.display = 'none';
      if (btn) btn.classList.add('re-active');
    } else {
      this.setHTML(this.sourceEl.value);
      this.sourceEl.classList.remove('re-visible');
      this.editorEl.style.display = '';
      if (btn) btn.classList.remove('re-active');
    }
  }

  toggleFullScreen() {
    this.isFullScreen = !this.isFullScreen;
    const btn = this.toolbarEl.querySelector('[data-action="fullscreen"]');
    if (this.isFullScreen) {
      this._parentBeforeFullscreen = this.wrapEl.parentNode;
      document.body.appendChild(this.wrapEl);
      this.wrapEl.classList.add('re-fullscreen');
      document.body.style.overflow = 'hidden';
      if (btn) btn.classList.add('re-active');
    } else {
      this.wrapEl.classList.remove('re-fullscreen');
      document.body.style.overflow = '';
      if (this._parentBeforeFullscreen) {
        this._parentBeforeFullscreen.appendChild(this.wrapEl);
      } else if (this.container) {
        this.container.appendChild(this.wrapEl);
      }
      if (btn) btn.classList.remove('re-active');
    }
  }

  saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      this.savedRange = sel.getRangeAt(0).cloneRange();
    }
  }

  restoreSelection() {
    if (this.savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this.savedRange);
    }
  }

  // ─── MODALS & PREMIUM FEATURES ─────────────────────────────────────────────
  createModal(title, contentHTML, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 're-modal-overlay';
    overlay.innerHTML = `
      <div class="re-modal">
        <h3>${title}</h3>
        <div class="re-modal-body">${contentHTML}</div>
        <div class="re-modal-actions">
          <button type="button" class="re-btn-secondary" id="re-modal-cancel">Cancel</button>
          <button type="button" class="re-btn-primary" id="re-modal-confirm">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#re-modal-cancel').addEventListener('click', close);
    overlay.querySelector('#re-modal-confirm').addEventListener('click', () => {
      if (onConfirm(overlay) !== false) {
        close();
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  // 1. LINK MODAL
  openLinkModal() {
    this.saveSelection();
    let selNode = this.getSelectedElement();
    let anchorNode = selNode ? (selNode.tagName === 'A' ? selNode : selNode.closest('a')) : null;
    let existingUrl = '';
    let existingText = window.getSelection().toString();
    let openInNewTab = false;

    if (anchorNode) {
      existingUrl = anchorNode.getAttribute('href') || '';
      existingText = anchorNode.textContent || existingText;
      openInNewTab = anchorNode.getAttribute('target') === '_blank';
    }

    const html = `
      <label>Link URL</label>
      <input type="url" id="re-link-url" placeholder="https://example.com" value="${this.escapeHTML(existingUrl)}">
      <label>Link Text</label>
      <input type="text" id="re-link-text" placeholder="Link text" value="${this.escapeHTML(existingText)}">
      <label class="re-checkbox-label">
        <input type="checkbox" id="re-link-target" ${openInNewTab ? 'checked' : ''}>
        Open link in new tab
      </label>
      ${anchorNode ? '<button type="button" class="re-btn-secondary" id="re-link-unlink" style="width:100%; margin-top:4px; color:#dc2626; border-color:#fca5a5;">Remove Link</button>' : ''}
    `;

    this.createModal('Insert / Edit Link', html, (modal) => {
      let url = modal.querySelector('#re-link-url').value.trim();
      const text = modal.querySelector('#re-link-text').value.trim();
      const target = modal.querySelector('#re-link-target').checked;

      if (!url) return false;

      // Auto-prefix URL protocol if missing (e.g. www.google.com -> https://www.google.com)
      if (!/^(?:https?:|mailto:|tel:|\/|#|\.\/|\.\.\/)/i.test(url)) {
        url = 'https://' + url;
      }

      this.editorEl.focus();
      this.restoreSelection();

      if (anchorNode) {
        anchorNode.setAttribute('href', url);
        if (text) anchorNode.textContent = text;
        if (target) {
          anchorNode.setAttribute('target', '_blank');
          anchorNode.setAttribute('rel', 'noopener noreferrer');
        } else {
          anchorNode.removeAttribute('target');
          anchorNode.removeAttribute('rel');
        }
      } else {
        const sel = window.getSelection();
        let range = null;
        if (sel && sel.rangeCount > 0) {
          range = sel.getRangeAt(0);
        } else if (this.savedRange) {
          range = this.savedRange;
        }

        const linkText = text || (range ? range.toString() : '') || url;
        const a = document.createElement('a');
        a.href = url;
        a.textContent = linkText;
        if (target) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }

        if (range && this.editorEl.contains(range.commonAncestorContainer)) {
          range.deleteContents();
          range.insertNode(a);
          const newRange = document.createRange();
          newRange.setStartAfter(a);
          newRange.collapse(true);
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(newRange);
          }
        } else {
          this.insertNodeAtCaret(a);
        }
      }
      this.saveHistoryState();
      this.triggerChange();
    });

    if (anchorNode) {
      setTimeout(() => {
        const unlinkBtn = document.querySelector('#re-link-unlink');
        if (unlinkBtn) {
          unlinkBtn.addEventListener('click', () => {
            this.editorEl.focus();
            const textNode = document.createTextNode(anchorNode.textContent);
            anchorNode.parentNode.replaceChild(textNode, anchorNode);
            const overlay = unlinkBtn.closest('.re-modal-overlay');
            if (overlay) overlay.remove();
            this.saveHistoryState();
            this.triggerChange();
          });
        }
      }, 0);
    }
  }

  // 2. TABLE MODAL & TABLE OPERATIONS
  openTableModal() {
    this.saveSelection();
    const html = `
      <div style="display:flex; gap:12px;">
        <div style="flex:1;">
          <label>Rows</label>
          <input type="number" id="re-table-rows" value="3" min="1" max="20">
        </div>
        <div style="flex:1;">
          <label>Columns</label>
          <input type="number" id="re-table-cols" value="3" min="1" max="20">
        </div>
      </div>
    `;

    this.createModal('Insert Table', html, (modal) => {
      const rows = parseInt(modal.querySelector('#re-table-rows').value) || 3;
      const cols = parseInt(modal.querySelector('#re-table-cols').value) || 3;

      let tableHTML = '<div class="re-table-wrap"><table><tbody>';
      for (let r = 0; r < rows; r++) {
        tableHTML += '<tr>';
        for (let c = 0; c < cols; c++) {
          tableHTML += r === 0 ? '<th>Header</th>' : '<td>Cell</td>';
        }
        tableHTML += '</tr>';
      }
      tableHTML += '</tbody></table></div><p><br></p>';

      this.editorEl.focus();
      this.restoreSelection();
      this.insertHTMLAtCaret(tableHTML);
      this.saveHistoryState();
      this.triggerChange();
    });
  }

  // 3. IMAGE MANAGER
  openImageModal(replaceImage = null) {
    this.saveSelection();
    if (this._imageManager) this._imageManager.remove();
    const overlay = document.createElement('div');
    overlay.className = 're-modal-overlay re-image-manager';
    overlay.innerHTML = `<div class="re-modal" role="dialog" aria-modal="true" aria-label="Image manager">
      <div class="re-im-head"><h3>${replaceImage ? 'Replace Image' : 'Image Manager'}</h3><button type="button" class="re-im-close" aria-label="Close">&times;</button></div>
      <div class="re-im-tabs"><button type="button" class="re-im-tab re-active" data-tab="upload">Upload</button><button type="button" class="re-im-tab" data-tab="library">Browse Library</button></div>
      <section class="re-im-panel re-active" data-panel="upload"><div class="re-im-drop" tabindex="0"><strong>Drop files here</strong><span>or choose one or more files</span><br><br><button type="button" class="re-btn-primary re-im-choose">Choose files</button><input class="re-im-file" type="file" multiple></div><div class="re-im-queue"></div></section>
      <section class="re-im-panel" data-panel="library"><div class="re-im-tools"><input class="re-im-search" type="search" placeholder="Search images by filename"><button type="button" class="re-btn-secondary re-im-refresh">Refresh</button></div><div class="re-im-grid"></div><div class="re-im-empty">Open the library to load images.</div><div style="text-align:center;margin-top:16px"><button type="button" class="re-btn-secondary re-im-more" hidden>Load more</button></div></section>
      <div class="re-im-foot"><button type="button" class="re-btn-secondary re-im-cancel">Cancel</button><button type="button" class="re-btn-primary re-im-insert" disabled>Insert selected</button></div></div>`;
    document.body.appendChild(overlay); this._imageManager = overlay;
    const selected = new Map();
    const close = () => { overlay.remove(); if (this._imageManager === overlay) this._imageManager = null; document.removeEventListener('keydown', onKey); };
    const insertButton = overlay.querySelector('.re-im-insert');
    const syncInsert = () => { insertButton.disabled = selected.size === 0; };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    overlay.querySelector('.re-im-close').onclick = close; overlay.querySelector('.re-im-cancel').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    insertButton.onclick = () => {
      const items = Array.from(selected.values()); if (!items.length) return;
      if (replaceImage) { replaceImage.src = items[0].url; replaceImage.dataset.imageId = items[0].id || ''; }
      else { this.editorEl.focus(); this.restoreSelection(); items.forEach(item => this.insertManagedFile(item)); }
      this.saveHistoryState(); this.triggerChange(); close();
    };
    overlay.querySelectorAll('.re-im-tab').forEach(tab => tab.onclick = () => {
      overlay.querySelectorAll('.re-im-tab,.re-im-panel').forEach(el => el.classList.remove('re-active')); tab.classList.add('re-active'); overlay.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add('re-active');
      if (tab.dataset.tab === 'library') this.loadImageLibrary(overlay, selected, syncInsert, 1, true);
    });
    const input = overlay.querySelector('.re-im-file'), drop = overlay.querySelector('.re-im-drop');
    overlay.querySelector('.re-im-choose').onclick = () => input.click();
    drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
    input.onchange = () => this.queueImageFiles(Array.from(input.files), overlay, selected, syncInsert);
    ['dragenter','dragover'].forEach(type => drop.addEventListener(type, e => { e.preventDefault(); drop.classList.add('re-drag'); }));
    ['dragleave','drop'].forEach(type => drop.addEventListener(type, e => { e.preventDefault(); drop.classList.remove('re-drag'); }));
    drop.addEventListener('drop', e => this.queueImageFiles(Array.from(e.dataTransfer.files), overlay, selected, syncInsert));
    overlay.querySelector('.re-im-refresh').onclick = () => this.loadImageLibrary(overlay, selected, syncInsert, 1, true);
    let timer; overlay.querySelector('.re-im-search').oninput = () => { clearTimeout(timer); timer = setTimeout(() => this.loadImageLibrary(overlay, selected, syncInsert, 1, true), 300); };
    overlay.querySelector('.re-im-more').onclick = e => this.loadImageLibrary(overlay, selected, syncInsert, Number(e.currentTarget.dataset.page || 1) + 1);
    overlay.querySelector('.re-im-choose').focus();
  }

  insertManagedFile(item) {
    if (item.type && !item.type.startsWith('image/')) { const a = document.createElement('a'); a.href = item.url; a.textContent = `Download ${item.name || 'file'}`; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 're-attachment'; this.insertNodeAtCaret(a); this.insertHTMLAtCaret('<p><br></p>'); return; }
    const img = document.createElement('img'); img.src = item.url; img.alt = item.alt || item.name || ''; if (item.id != null) img.dataset.imageId = item.id; this.insertNodeAtCaret(img); this.insertHTMLAtCaret('<p><br></p>');
  }

  showImageToast(message, error = false) {
    let wrap = document.querySelector('.re-toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 're-toast-wrap'; document.body.appendChild(wrap); }
    const toast = document.createElement('div'); toast.className = `re-toast${error ? ' re-error' : ''}`; toast.textContent = message; wrap.appendChild(toast);
    setTimeout(() => { toast.remove(); if (!wrap.children.length) wrap.remove(); }, 3500);
  }

  normalizeImageResponse(data, fallbackFile = null) {
    const source = data && data.url ? data : (data && data.image ? data.image : null);
    if (!source || !source.url || data.status === false) throw new Error(data?.message || 'Image API response must contain a url.');
    return {
      ...source,
      id: source.id || source.key || source.filename || source.url,
      key: source.key || '',
      name: source.name || source.filename || fallbackFile?.name || 'image',
      size: source.size || fallbackFile?.size || 0,
      createdAt: source.createdAt || source.last_modified || null,
      type: source.mimeType || source.type || fallbackFile?.type || 'image/*',
    };
  }

  validateUploadFile(file) {
    const imageConfig = this.options.imageApi?.image || {};
    const allowed = this.options.imageApi?.allowedTypes || imageConfig.allowedTypes || [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpg', 'image/pjpeg', 'image/jfif', 'image/avif', 'image/bmp',
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.jfif', '.pjp', '.pjpeg', '.avif', '.bmp', '.ico'
    ];
    const max = imageConfig.maxFileSize || this.options.imageApi?.maxFileSize || 50 * 1024 * 1024;
    const normalizedName = String(file.name || '').trim().toLowerCase();
    const extensionMatch = normalizedName.match(/\.[a-z0-9]+$/i);
    const extension = extensionMatch ? extensionMatch[0] : '';
    const mimeType = String(file.type || '').trim().toLowerCase();
    const standardImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.jfif', '.pjp', '.pjpeg', '.avif', '.bmp', '.ico']);
    if (file.size > max) throw new Error(`${file.name} exceeds the ${Math.round(max / 1024 / 1024)}MB file size limit.`);
    const matchesConfiguredType = allowed.some(type => {
      const normalizedType = String(type).trim().toLowerCase();
      return normalizedType.startsWith('.') ? extension === normalizedType : mimeType === normalizedType;
    });
    const isImage = mimeType.startsWith('image/') || standardImageExtensions.has(extension) || matchesConfiguredType;
    if (!isImage) throw new Error(`${file.name} has an unsupported file type.`);
    return true;
  }

  uploadImage(file) {
    if (!this.options.imageApi?.uploadUrl) return Promise.reject(new Error('imageApi.uploadUrl is not configured.'));
    try { this.validateUploadFile(file); } catch (error) { return Promise.reject(error); }
    const xhr = new XMLHttpRequest(); this._imageRequests.add(xhr);
    return new Promise((resolve, reject) => {
      xhr.open('POST', this.options.imageApi.uploadUrl);
      Object.entries(this.options.imageApi.headers || {}).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      xhr.upload.onprogress = event => { if (event.lengthComputable && typeof this._uploadProgress === 'function') this._uploadProgress(file, Math.round(event.loaded / event.total * 100)); };
      xhr.onload = () => { this._imageRequests.delete(xhr); if (xhr.status >= 200 && xhr.status < 300) { try { const item = this.normalizeImageResponse(JSON.parse(xhr.responseText), file); this.options.onImageUpload?.(file, item.url); resolve(item); } catch (e) { reject(e); } } else reject(new Error(`Upload failed (${xhr.status}).`)); };
      xhr.onerror = () => { this._imageRequests.delete(xhr); reject(new Error('Network error while uploading image.')); };
      xhr.onabort = () => { this._imageRequests.delete(xhr); reject(new Error('Upload was cancelled.')); };
      const form = new FormData(); form.append('file', file, file.name); xhr.send(form);
    });
  }

  queueImageFiles(files, overlay, selected, syncInsert) {
    const queue = overlay.querySelector('.re-im-queue');
    files.forEach(file => {
      const row = document.createElement('div'); row.className = 're-im-upload';
      const preview = document.createElement('img'); preview.alt = ''; const body = document.createElement('div'); body.innerHTML = `<div class="re-im-name"></div><div class="re-im-meta"></div><div class="re-im-progress"><span style="width:0%"></span></div>`; body.querySelector('.re-im-name').textContent = file.name; body.querySelector('.re-im-meta').textContent = this.formatImageSize(file.size); row.append(preview, body); queue.appendChild(row);
      if (file.type.startsWith('image/')) { const url = URL.createObjectURL(file); this._imageObjectUrls.add(url); preview.src = url; }
      this._uploadProgress = (activeFile, progress) => { if (activeFile === file) body.querySelector('.re-im-progress span').style.width = `${progress}%`; };
      this.uploadImage(file).then(item => { selected.set(item.id || item.url, item); syncInsert(); body.querySelector('.re-im-meta').textContent = `${this.formatImageSize(item.size)} — uploaded`; body.querySelector('.re-im-progress span').style.width = '100%'; this.showImageToast('Upload successful.'); }).catch(error => { body.querySelector('.re-im-meta').textContent = error.message; body.querySelector('.re-im-progress span').style.background = '#dc2626'; this.showImageToast(error.message, true); });
    });
  }

  formatImageSize(size) { if (!size) return 'Unknown size'; const units = ['B', 'KB', 'MB', 'GB']; let i = 0, value = size; while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; } return `${value.toFixed(i ? 1 : 0)} ${units[i]}`; }

  async loadImageLibrary(overlay, selected, syncInsert, page = 1, replace = false) {
    if (!this.options.imageApi?.listUrl) { this.showImageToast('imageApi.listUrl is not configured.', true); return; }
    const grid = overlay.querySelector('.re-im-grid'), empty = overlay.querySelector('.re-im-empty'), more = overlay.querySelector('.re-im-more');
    if (replace) grid.innerHTML = '';
    empty.textContent = 'Loading image library...'; empty.hidden = false;
    const search = overlay.querySelector('.re-im-search').value.trim(); const separator = this.options.imageApi.listUrl.includes('?') ? '&' : '?';
    try {
      const response = await fetch(`${this.options.imageApi.listUrl}${separator}page=${page}&limit=40${search ? `&search=${encodeURIComponent(search)}` : ''}`, { headers: this.options.imageApi.headers || {} });
      if (!response.ok) throw new Error(`Library request failed (${response.status}).`);
      const data = await response.json();
      if (data.status === false) throw new Error(data.message || 'The image library request failed.');
      const rawItems = Array.isArray(data) ? data : (data.items || data.images || []);
      const items = rawItems.map(item => ({ ...item, id: item.id || item.key || item.filename || item.url, name: item.name || item.filename || 'image', createdAt: item.createdAt || item.last_modified || null, type: item.mimeType || item.type || 'image/*' }));
      items.forEach(item => { if (!item.url) return; const key = item.id || item.url; const card = document.createElement('button'); card.type = 'button'; card.className = 're-im-card'; card.innerHTML = `<img alt=""><div class="re-im-card-info"><span class="re-im-card-name"></span><span class="re-im-card-meta"></span></div><span class="re-im-delete" role="button" aria-label="Delete image">&times;</span>`; card.querySelector('img').src = item.url; card.querySelector('.re-im-card-name').textContent = item.name || 'image'; card.querySelector('.re-im-card-meta').textContent = `${this.formatImageSize(item.size)}${item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ''}`; card.onclick = () => { selected.has(key) ? (selected.delete(key), card.classList.remove('re-selected')) : (selected.set(key, item), card.classList.add('re-selected')); syncInsert(); }; card.querySelector('.re-im-delete').onclick = e => { e.stopPropagation(); this.deleteImage(item, card, selected, syncInsert); }; grid.appendChild(card); });
      empty.hidden = grid.children.length > 0; more.hidden = !(data.hasMore || data.nextPage); more.dataset.page = page;
    } catch (error) { empty.textContent = error.message; this.showImageToast(error.message, true); }
  }

  async deleteImage(item, card, selected, syncInsert) {
    if (!this.options.imageApi?.deleteUrl || !confirm(`Delete ${item.name || 'this image'}?`)) return;
    try {
      const fileKey = item.key || item.id || item.name || item.url;
      const separator = this.options.imageApi.deleteUrl.includes('?') ? '&' : '?';
      const url = `${this.options.imageApi.deleteUrl}${separator}file_key=${encodeURIComponent(fileKey)}`;
      const headers = { ...(this.options.imageApi.headers || {}) };
      const response = await fetch(url, { method: 'DELETE', headers });
      let data = null;
      try { data = await response.json(); } catch (error) { /* A successful empty response is valid. */ }
      if (!response.ok || data?.status === false) { this.showImageToast(data?.message || `Delete failed (${response.status}).`, true); return; }
      selected.delete(item.id || item.url); card.remove(); syncInsert(); this.options.onImageDelete?.(item.url); this.showImageToast('Image deleted.');
    } catch (error) {
      this.showImageToast(error.message || 'Network error while deleting image.', true);
    }
  }

  // 4. MEDIA EMBED MODAL (YouTube / Vimeo)
  openMediaModal() {
    this.saveSelection();
    const html = `
      <label>Media URL (YouTube or Vimeo)</label>
      <input type="url" id="re-media-url" placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ">
    `;

    this.createModal('Embed Media', html, (modal) => {
      const url = modal.querySelector('#re-media-url').value.trim();
      if (!url) return false;

      let embedSrc = '';
      const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (ytMatch) {
        embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
      } else {
        const vimeoMatch = url.match(/vimeo\.com\/(?:.*#|.*\/)?([0-9]+)/);
        if (vimeoMatch) {
          embedSrc = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        }
      }

      if (embedSrc) {
        this.editorEl.focus();
        this.restoreSelection();
        const embedHTML = `<div class="re-media-wrap" contenteditable="false"><iframe src="${embedSrc}" allowfullscreen></iframe></div><p><br></p>`;
        this.insertHTMLAtCaret(embedHTML);
        this.saveHistoryState();
        this.triggerChange();
      } else {
        alert('Invalid YouTube or Vimeo URL.');
        return false;
      }
    });
  }

  // 5. CODE BLOCK MODAL & SPAN
  openCodeBlockModal() {
    this.saveSelection();
    const html = `
      <label>Programming Language</label>
      <select id="re-code-lang">
        <option value="javascript">JavaScript</option>
        <option value="html">HTML</option>
        <option value="css">CSS</option>
        <option value="python">Python</option>
        <option value="java">Java</option>
        <option value="cpp">C++</option>
        <option value="json">JSON</option>
        <option value="sql">SQL</option>
        <option value="shell">Shell/Bash</option>
      </select>
      <label>Initial Code Snippet</label>
      <textarea id="re-code-text" rows="4" placeholder="// Paste or type code..."></textarea>
    `;

    this.createModal('Insert Code Block', html, (modal) => {
      const lang = modal.querySelector('#re-code-lang').value;
      const codeText = modal.querySelector('#re-code-text').value;
      const escaped = codeText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const blockHTML = `<pre><code class="language-${lang}" contenteditable="true">${escaped || '// Code here'}</code></pre><p><br></p>`;
      this.editorEl.focus();
      this.restoreSelection();
      this.insertHTMLAtCaret(blockHTML);
      this.saveHistoryState();
      this.triggerChange();
    });
  }

  insertInlineCode() {
    const selText = window.getSelection().toString();
    const html = `<code>${selText || 'code'}</code>`;
    this.insertHTMLAtCaret(html);
    this.saveHistoryState();
    this.triggerChange();
  }

  // 6. FIND & REPLACE MODAL
  openFindReplaceModal() {
    const html = `
      <label>Find Text</label>
      <input type="text" id="re-find-text" placeholder="Search for...">
      <label>Replace With</label>
      <input type="text" id="re-replace-text" placeholder="Replace with...">
    `;

    this.createModal('Find & Replace', html, (modal) => {
      const findVal = modal.querySelector('#re-find-text').value;
      const replaceVal = modal.querySelector('#re-replace-text').value;

      if (!findVal) return false;

      const contentRoot = this.editorEl;
      const walker = document.createTreeWalker(contentRoot, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) textNodes.push(node);

      let changed = false;
      textNodes.forEach(textNode => {
        const source = textNode.nodeValue;
        const lowerSource = source.toLocaleLowerCase();
        const lowerFind = findVal.toLocaleLowerCase();
        let cursor = 0;
        let index = lowerSource.indexOf(lowerFind, cursor);
        if (index === -1) return;
        const fragment = document.createDocumentFragment();
        while (index !== -1) {
          fragment.appendChild(document.createTextNode(source.slice(cursor, index)));
          fragment.appendChild(document.createTextNode(replaceVal));
          cursor = index + findVal.length;
          index = lowerSource.indexOf(lowerFind, cursor);
        }
        fragment.appendChild(document.createTextNode(source.slice(cursor)));
        textNode.replaceWith(fragment);
        changed = true;
      });
      if (changed) {
        this.updateCounters();
        this.saveHistoryState();
        this.triggerChange();
      }
    });
  }

  // 7. MENTIONS SYSTEM
  checkMentionTrigger() {
    if (!this.options.mentions || !this.options.mentions.length) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== 3) return;

    const textBefore = node.textContent.substring(0, range.startOffset);
    const mentionMatch = textBefore.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      const filtered = this.options.mentions.filter(m => {
        const name = typeof m === 'string' ? m : m.name;
        return name.toLowerCase().includes(query);
      });
      this.mentionMatchStr = mentionMatch[0];
      this.mentionRange = range.cloneRange();
      this.showMentionDropdown(this.mentionRange, filtered);
    } else {
      this.hideMentionDropdown();
    }
  }

  showMentionDropdown(range, list) {
    this.hideMentionDropdown();
    if (!list.length) return;

    const rect = range.getBoundingClientRect();
    const dropdown = document.createElement('div');
    dropdown.className = 're-mention-dropdown';
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;

    this.mentionFilteredList = list;
    this.mentionActiveIndex = 0;

    list.forEach((item, index) => {
      const name = typeof item === 'string' ? item : item.name;
      const avatar = typeof item === 'object' && item.avatar ? item.avatar : name.charAt(0).toUpperCase();
      
      const el = document.createElement('div');
      el.className = `re-mention-item ${index === 0 ? 're-mention-active' : ''}`;
      el.dataset.index = index;
      const avatarEl = document.createElement('div');
      avatarEl.className = 're-mention-avatar';
      avatarEl.textContent = avatar;
      const nameEl = document.createElement('span');
      nameEl.textContent = name;
      el.appendChild(avatarEl);
      el.appendChild(nameEl);

      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent losing focus from editor!
        this.insertMention(item);
        this.hideMentionDropdown();
      });

      dropdown.appendChild(el);
    });

    document.body.appendChild(dropdown);
    this.mentionDropdown = dropdown;
    this._clampToViewport(dropdown, rect, { flip: 'above' });
  }

  updateMentionActiveItem() {
    if (!this.mentionDropdown) return;
    const items = this.mentionDropdown.querySelectorAll('.re-mention-item');
    items.forEach((item, idx) => {
      if (idx === this.mentionActiveIndex) {
        item.classList.add('re-mention-active');
      } else {
        item.classList.remove('re-mention-active');
      }
    });
  }

  hideMentionDropdown() {
    if (this.mentionDropdown) {
      this.mentionDropdown.remove();
      this.mentionDropdown = null;
    }
  }

  insertMention(item) {
    const name = typeof item === 'string' ? item : item.name;
    const range = this.mentionRange || window.getSelection().getRangeAt(0);
    const triggerStr = this.mentionMatchStr || '@';

    if (range && range.startContainer) {
      const startOffset = Math.max(0, range.startOffset - triggerStr.length);
      range.setStart(range.startContainer, startOffset);
      range.deleteContents();

      const mentionNode = document.createElement('span');
      mentionNode.className = 're-mention';
      mentionNode.contentEditable = 'false';
      mentionNode.textContent = `@${name}`;

      const space = document.createTextNode('\u00A0');

      range.insertNode(space);
      range.insertNode(mentionNode);

      // Focus editor and set selection right after inserted space
      this.editorEl.focus();
      const sel = window.getSelection();
      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.setEndAfter(space);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    this.saveHistoryState();
    this.triggerChange();
  }

  // ─── IMAGE & TABLE INTERACTION ──────────────────────────────────────────────
  handleEditorClick(e) {
    const linkEl = e.target.closest && e.target.closest('a');
    if (linkEl && this.editorEl.contains(linkEl)) {
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
    }

    // Click inside the resize wrapper (handle or img) — keep active image
    const wrapHit = e.target.closest && e.target.closest('.re-img-resize-wrap');
    if (wrapHit) {
      const img = wrapHit.querySelector('img');
      if (img) {
        if (this.activeImg && this.activeImg !== img) this.activeImg.classList.remove('re-img-selected');
        this.activeImg = img;
        img.classList.add('re-img-selected');
        // Toolbar already exists from initial click — only reshow if missing
        if (!this.floatingTB) this.showImageToolbar(img);
      }
      return;
    }

    if (e.target.tagName === 'IMG') {
      if (this.activeImg && this.activeImg !== e.target) this.activeImg.classList.remove('re-img-selected');
      this.activeImg = e.target;
      this.activeImg.classList.add('re-img-selected');
      this.showImageToolbar(this.activeImg);
      return;
    }

    // Clicked elsewhere — deselect image and unwrap resize container
    if (this.activeImg) {
      this.activeImg.classList.remove('re-img-selected');
      this.activeImg = null;
    }
    this.removeResizeHandles();

    // Detect table cell for context toolbar
    const cell = e.target.closest('td, th');
    if (cell && this.editorEl.contains(cell)) {
      this.activeCell = cell;
      this.showTableToolbar(cell);
    } else {
      this.activeCell = null;
      this.hideFloatingToolbar();
    }
  }

  /**
   * Keeps an absolutely positioned popup (floating toolbar, mention list) inside
   * the viewport. Anchors near a screen edge — common on phones — would otherwise
   * place it partly or fully off-screen. Call once the element is in the DOM.
   * @param {HTMLElement} el
   * @param {DOMRect} rect anchor rect in viewport coordinates
   * @param {{margin?: number, flip?: 'above'|'below'}} options
   */
  _clampToViewport(el, rect, options = {}) {
    const margin = options.margin || 6;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const width = el.offsetWidth;
    const height = el.offsetHeight;

    const minLeft = window.scrollX + margin;
    const maxLeft = window.scrollX + viewportWidth - width - margin;
    const left = rect.left + window.scrollX;
    el.style.left = `${Math.round(Math.max(minLeft, Math.min(left, maxLeft)))}px`;

    let top = parseFloat(el.style.top);
    if (!Number.isFinite(top)) return;
    if (options.flip === 'below' && top < window.scrollY + margin) {
      // No headroom above the anchor — drop the popup underneath it instead.
      top = rect.bottom + window.scrollY + margin;
    } else if (options.flip === 'above' && top + height > window.scrollY + viewportHeight - margin) {
      const above = rect.top + window.scrollY - height - margin;
      if (above > window.scrollY + margin) top = above;
    }
    el.style.top = `${Math.round(top)}px`;
  }

  showTableToolbar(cell) {
    this.hideFloatingToolbar();
    const rect = cell.getBoundingClientRect();
    const tb = document.createElement('div');
    tb.className = 're-floating-toolbar';
    tb.style.top = `${rect.top + window.scrollY - 36}px`;
    tb.style.left = `${rect.left + window.scrollX}px`;
    tb.innerHTML = `
      <button class="re-btn" title="Insert row above" data-tbl="rowAbove">&#8593;+</button>
      <button class="re-btn" title="Insert row below" data-tbl="rowBelow">&#8595;+</button>
      <button class="re-btn" title="Insert column left" data-tbl="colLeft">&#8592;+</button>
      <button class="re-btn" title="Insert column right" data-tbl="colRight">&#8594;+</button>
      <button class="re-btn" title="Delete row" data-tbl="delRow">-R</button>
      <button class="re-btn" title="Delete column" data-tbl="delCol">-C</button>
      <button class="re-btn" title="Merge right" data-tbl="mergeRight">&#9647;&#9654;</button>
      <button class="re-btn" title="Merge down" data-tbl="mergeDown">&#9647;&#9660;</button>
      <button class="re-btn" title="Split cell" data-tbl="split">&#9635;</button>
      <label class="re-btn" title="Cell background" style="position:relative;overflow:hidden;">
        <span style="pointer-events:none;">&#9639;</span>
        <input type="color" data-tbl="cellBg" style="position:absolute;inset:0;opacity:0;cursor:pointer;">
      </label>
      <button class="re-btn" title="Delete table" data-tbl="delTable" style="color:#ef4444;">&times;</button>
    `;
    document.body.appendChild(tb);
    this.floatingTB = tb;
    this._clampToViewport(tb, rect, { flip: 'below' });

    tb.addEventListener('mousedown', (e) => e.preventDefault()); // preserve selection
    tb.querySelectorAll('[data-tbl]').forEach(el => {
      const action = el.dataset.tbl;
      if (action === 'cellBg') {
        el.addEventListener('input', () => {
          if (this.activeCell) {
            this.activeCell.style.backgroundColor = el.value;
            this.saveHistoryState();
            this.triggerChange();
          }
        });
      } else {
        el.addEventListener('click', (ev) => {
          ev.preventDefault();
          this.applyTableAction(action);
        });
      }
    });
  }

  applyTableAction(action) {
    const cell = this.activeCell;
    if (!cell) return;
    const row = cell.parentElement;
    const table = cell.closest('table');
    if (!table || !row) return;
    const cellIdx = Array.from(row.children).indexOf(cell);

    const insertCells = (tr, count, tag) => {
      for (let i = 0; i < count; i++) {
        const c = document.createElement(tag);
        c.innerHTML = '<br>';
        tr.appendChild(c);
      }
    };

    switch (action) {
      case 'rowAbove':
      case 'rowBelow': {
        const newRow = document.createElement('tr');
        insertCells(newRow, row.children.length, 'td');
        row.parentElement.insertBefore(newRow, action === 'rowAbove' ? row : row.nextSibling);
        break;
      }
      case 'colLeft':
      case 'colRight': {
        Array.from(table.rows).forEach(r => {
          const ref = r.children[cellIdx];
          const c = document.createElement(r.children[cellIdx] && r.children[cellIdx].tagName === 'TH' ? 'th' : 'td');
          c.innerHTML = '<br>';
          r.insertBefore(c, action === 'colLeft' ? ref : ref.nextSibling);
        });
        break;
      }
      case 'delRow':
        if (table.rows.length > 1) row.remove();
        break;
      case 'delCol':
        if (row.children.length > 1) {
          Array.from(table.rows).forEach(r => { if (r.children[cellIdx]) r.children[cellIdx].remove(); });
        }
        break;
      case 'mergeRight': {
        const next = cell.nextElementSibling;
        if (next) {
          const span = (parseInt(cell.getAttribute('colspan')) || 1) + (parseInt(next.getAttribute('colspan')) || 1);
          cell.setAttribute('colspan', span);
          cell.innerHTML += ' ' + next.innerHTML;
          next.remove();
        }
        break;
      }
      case 'mergeDown': {
        const rowIdx = Array.from(table.rows).indexOf(row);
        const below = table.rows[rowIdx + 1];
        if (below && below.children[cellIdx]) {
          const belowCell = below.children[cellIdx];
          const span = (parseInt(cell.getAttribute('rowspan')) || 1) + (parseInt(belowCell.getAttribute('rowspan')) || 1);
          cell.setAttribute('rowspan', span);
          cell.innerHTML += ' ' + belowCell.innerHTML;
          belowCell.remove();
        }
        break;
      }
      case 'split': {
        const colspan = parseInt(cell.getAttribute('colspan')) || 1;
        const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
        if (colspan > 1) {
          cell.removeAttribute('colspan');
          for (let i = 1; i < colspan; i++) {
            const c = document.createElement(cell.tagName.toLowerCase());
            c.innerHTML = '<br>';
            cell.parentElement.insertBefore(c, cell.nextSibling);
          }
        }
        if (rowspan > 1) {
          cell.removeAttribute('rowspan');
          const rowIdx = Array.from(table.rows).indexOf(row);
          for (let i = 1; i < rowspan; i++) {
            const targetRow = table.rows[rowIdx + i];
            if (targetRow) {
              const c = document.createElement(cell.tagName.toLowerCase());
              c.innerHTML = '<br>';
              targetRow.insertBefore(c, targetRow.children[cellIdx] || null);
            }
          }
        }
        break;
      }
      case 'delTable':
        table.remove();
        this.activeCell = null;
        this.hideFloatingToolbar();
        break;
    }
    this.saveHistoryState();
    this.triggerChange();
    if (this.activeCell && document.body.contains(this.activeCell)) {
      this.showTableToolbar(this.activeCell);
    }
  }

  showImageToolbar(img) {
    this.hideFloatingToolbar();
    this.removeResizeHandles();

    // ── Wrap image in a resize container with drag handles ──
    if (!img.parentElement || !img.parentElement.classList.contains('re-img-resize-wrap')) {
      const wrap = document.createElement('span');
      wrap.className = 're-img-resize-wrap';
      wrap.contentEditable = 'false';
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);

      ['tl', 'tr', 'bl', 'br'].forEach(pos => {
        const h = document.createElement('span');
        h.className = `re-resize-handle re-h-${pos}`;
        h.dataset.pos = pos;
        wrap.appendChild(h);
      });

      this._currentResizeWrap = wrap;
      this._initResizeHandlers(wrap, img);
    } else {
      this._currentResizeWrap = img.parentElement;
    }

    // ── Floating toolbar with alignment, size input, delete ──
    const rect = (this._currentResizeWrap || img).getBoundingClientRect();

    const tb = document.createElement('div');
    tb.className = 're-floating-toolbar';
    tb.style.top = `${rect.top + window.scrollY - 40}px`;
    tb.style.left = `${rect.left + window.scrollX}px`;
    tb.addEventListener('mousedown', e => e.preventDefault()); // keep focus

    const curWidth = img.offsetWidth || img.naturalWidth || 300;

    tb.innerHTML = `
      <button class="re-btn" title="Align Top" data-imgact="top">&#8593;</button>
      <button class="re-btn" title="Align Left" data-imgact="left">${ICONS.alignLeft}</button>
      <button class="re-btn" title="Align Center" data-imgact="center">${ICONS.alignCenter}</button>
      <button class="re-btn" title="Align Right" data-imgact="right">${ICONS.alignRight}</button>
      <button class="re-btn" title="Align Bottom" data-imgact="bottom">&#8595;</button>
      <button class="re-btn" title="Replace Image" data-imgact="replace">&#8635;</button>
      <span class="re-sep" style="background:#475569;"></span>
      <input type="number" class="re-img-size-input" title="Width (px)" value="${curWidth}" min="30" max="2000">
      <span style="color:#94a3b8;font-size:11px;">px</span>
      <span class="re-sep" style="background:#475569;"></span>
      <button class="re-btn" title="Delete Image" data-imgact="delete" style="color:#ef4444;">&times;</button>
    `;

    document.body.appendChild(tb);
    this.floatingTB = tb;
    this._clampToViewport(tb, rect, { flip: 'below' });

    // Alignment handlers
    const alignMap = {
      top:    'display:block; margin:0 auto 1.2em;',
      left:   'float:left; margin:0 1.2em 1.2em 0;',
      center: 'display:block; margin:1.2em auto;',
      right:  'float:right; margin:0 0 1.2em 1.2em;',
      bottom: 'display:block; margin:1.2em auto 0;',
    };
    const alignClassMap = {
      top: 're-img-top', left: 're-img-left', center: 're-img-center',
      right: 're-img-right', bottom: 're-img-bottom',
    };

    tb.querySelectorAll('[data-imgact]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.imgact;
        if (act === 'replace') {
          this.openImageModal(img);
          return;
        }
        if (act === 'delete') {
          const wrap = img.closest('.re-img-resize-wrap');
          if (wrap) wrap.remove(); else img.remove();
          this.hideFloatingToolbar();
          this.activeImg = null;
          this.saveHistoryState();
          this.triggerChange();
          return;
        }
        const imageClasses = Object.values(alignClassMap);
        const wrap = img.closest('.re-img-resize-wrap');
        img.classList.remove(...imageClasses);
        if (wrap) wrap.classList.remove(...imageClasses);
        const alignmentClass = alignClassMap[act] || '';
        if (alignmentClass) {
          img.classList.add(alignmentClass);
          if (wrap) wrap.classList.add(alignmentClass);
        }
        img.classList.add('re-img-selected');
        this.saveHistoryState();
        this.triggerChange();
      });
    });

    const widthInput = tb.querySelector('.re-img-size-input');
    widthInput.addEventListener('change', () => {
      const width = Math.max(30, Math.min(2000, parseInt(widthInput.value, 10) || 300));
      img.style.width = width + 'px';
      img.style.height = 'auto';
      widthInput.value = width;
      this.saveHistoryState();
      this.triggerChange();
      this.showImageToolbar(img);
    });
  }

  _initResizeHandlers(wrap, img) {
    wrap.querySelectorAll('.re-resize-handle').forEach(handle => {
      // Shared drag routine so mouse and touch behave identically.
      const startDrag = (e, startX) => {
        e.preventDefault();
        e.stopPropagation();
        const isTouch = e.type === 'touchstart';
        const startW = img.offsetWidth;
        const startH = img.offsetHeight;
        const ratio = startW ? startH / startW : 1;
        const pos = handle.dataset.pos;
        const moveEvent = isTouch ? 'touchmove' : 'mousemove';
        const endEvents = isTouch ? ['touchend', 'touchcancel'] : ['mouseup'];
        const onMove = ev => {
          const point = ev.touches ? ev.touches[0] : ev;
          if (!point) return;
          if (ev.cancelable) ev.preventDefault();
          let dx = point.clientX - startX;
          if (pos === 'tl' || pos === 'bl') dx = -dx;
          const width = Math.max(30, startW + dx);
          img.style.width = width + 'px';
          img.style.height = Math.round(width * ratio) + 'px';
        };
        const onUp = () => {
          document.removeEventListener(moveEvent, onMove);
          endEvents.forEach(type => document.removeEventListener(type, onUp));
          this.saveHistoryState();
          this.triggerChange();
          if (this.activeImg === img) this.showImageToolbar(img);
        };
        document.addEventListener(moveEvent, onMove, { passive: false });
        endEvents.forEach(type => document.addEventListener(type, onUp));
      };

      handle.addEventListener('mousedown', e => startDrag(e, e.clientX));
      handle.addEventListener('touchstart', e => {
        const touch = e.touches[0];
        if (touch) startDrag(e, touch.clientX);
      }, { passive: false });
    });
  }

  removeResizeHandles() {
    if (this._currentResizeWrap && document.body.contains(this._currentResizeWrap)) {
      const wrap = this._currentResizeWrap;
      const img = wrap.querySelector('img');
      if (img && wrap.parentNode) wrap.parentNode.insertBefore(img, wrap);
      wrap.remove();
    }
    this._currentResizeWrap = null;
  }

  hideFloatingToolbar() {
    if (this.floatingTB) {
      this.floatingTB.remove();
      this.floatingTB = null;
    }
  }

  insertNodeAtCaret(node) {
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(node);
      range.setStartAfter(node);
      sel.removeAllRanges();
      sel.addRange(range);
    } else this.editorEl.appendChild(node);
  }

  insertHTMLAtCaret(html) {
    this.editorEl.focus();
    if (this.savedRange) {
      this.restoreSelection();
    }

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      this.editorEl.insertAdjacentHTML('beforeend', html);
      this.updateCounters();
      return;
    }

    let range = sel.getRangeAt(0);
    if (!this.editorEl.contains(range.commonAncestorContainer)) {
      this.editorEl.focus();
      range = document.createRange();
      range.selectNodeContents(this.editorEl);
      range.collapse(false);
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const containsBlock = Array.from(tempDiv.childNodes).some(node =>
      node.nodeType === 1 && /^(TABLE|PRE|BLOCKQUOTE|DIV|HR|FIGURE|H[1-6])$/i.test(node.tagName)
    );

    if (containsBlock) {
      // Find parent block container inside editorEl
      let parentBlock = range.commonAncestorContainer;
      if (parentBlock.nodeType === 3) parentBlock = parentBlock.parentNode;
      while (parentBlock && parentBlock !== this.editorEl && parentBlock.parentNode !== this.editorEl) {
        parentBlock = parentBlock.parentNode;
      }

      const fragment = document.createDocumentFragment();
      let lastInserted = null;
      while (tempDiv.firstChild) {
        lastInserted = fragment.appendChild(tempDiv.firstChild);
      }

      if (parentBlock && parentBlock !== this.editorEl) {
        const isBlockEmpty = !parentBlock.textContent.trim() && !parentBlock.querySelector('img, iframe');
        if (isBlockEmpty) {
          parentBlock.parentNode.replaceChild(fragment, parentBlock);
        } else {
          if (parentBlock.nextSibling) {
            parentBlock.parentNode.insertBefore(fragment, parentBlock.nextSibling);
          } else {
            parentBlock.parentNode.appendChild(fragment);
          }
        }
      } else {
        this.editorEl.appendChild(fragment);
      }

      if (lastInserted) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastInserted);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        if (typeof lastInserted.scrollIntoView === 'function') {
          try {
            lastInserted.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          } catch (e) {
            // Silently ignore if scroll fails
          }
        }
      }
    } else {
      range.deleteContents();
      const fragment = document.createDocumentFragment();
      let lastInserted = null;
      while (tempDiv.firstChild) {
        lastInserted = fragment.appendChild(tempDiv.firstChild);
      }
      range.insertNode(fragment);
      if (lastInserted) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastInserted);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }
    this.updateCounters();
  }

  getSelectedElement() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    const node = sel.getRangeAt(0).commonAncestorContainer;
    return node.nodeType === 1 ? node : node.parentNode;
  }

  updateCounters() {
    const text = this.getText();
    const counter = this.footerEl.querySelector('#re-counter');
    if (counter) counter.textContent = `${text.trim() ? text.trim().split(/\s+/).length : 0} words | ${text.length} characters`;
  }

  triggerChange() {
    if (typeof this.options.onChange === 'function') this.options.onChange(this.getHTML());
  }

  escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
  }

  getHTML() {
    if (this.isSourceView) return this.sanitizeHTML(this.sourceEl.value);
    const clone = this.editorEl.cloneNode(true);
    clone.querySelectorAll('.re-img-resize-wrap').forEach(wrap => {
      const img = wrap.querySelector('img');
      if (img && wrap.parentNode) wrap.parentNode.insertBefore(img, wrap);
      wrap.remove();
    });
    clone.querySelectorAll('.re-img-selected').forEach(img => img.classList.remove('re-img-selected'));
    // Unwrap .re-table-wrap divs so stored HTML stays clean
    clone.querySelectorAll('.re-table-wrap').forEach(wrap => {
      while (wrap.firstChild) wrap.parentNode.insertBefore(wrap.firstChild, wrap);
      wrap.remove();
    });
    return clone.innerHTML;
  }

  setHTML(html) {
    const clean = this.sanitizeHTML(html);
    this.editorEl.innerHTML = clean;
    this.wrapBareTables();
    this.sourceEl.value = clean;
    this.updateCounters();
    this.saveHistoryState();
    this.triggerChange();
  }

  /** Wrap any <table> not already inside a .re-table-wrap container */
  wrapBareTables() {
    this.editorEl.querySelectorAll('table').forEach(table => {
      if (table.closest('.re-table-wrap')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 're-table-wrap';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  getImages() {
    return Array.from(this.editorEl.querySelectorAll('img')).map(img => ({
      url: img.getAttribute('src') || '', alt: img.getAttribute('alt') || '',
      width: img.width || null, height: img.height || null,
      alignment: ['left', 'center', 'right', 'top', 'bottom'].find(value => img.classList.contains(`re-img-${value}`)) || 'inline',
      id: img.dataset.imageId || null
    }));
  }

  getText() { return this.editorEl.innerText || ''; }
  focus() { if (!this.options.readOnly) this.editorEl.focus(); }

  destroy() {
    if (this._pasteFrame) cancelAnimationFrame(this._pasteFrame);
    this._pasteFrame = null;
    this._isPasting = false;
    this._imageRequests.forEach(request => request.abort());
    this._imageRequests.clear();
    this._imageObjectUrls.forEach(url => URL.revokeObjectURL(url));
    this._imageObjectUrls.clear();
    if (this._imageManager) this._imageManager.remove();
    const toast = document.querySelector('.re-toast-wrap');
    if (toast) toast.remove();
    this.hideMentionDropdown();
    this.removeResizeHandles();
    this.hideFloatingToolbar();
    if (this._selectionChangeHandler) document.removeEventListener('selectionchange', this._selectionChangeHandler);
    if (this._onScrollHandler) {
      if (this.bodyEl) this.bodyEl.removeEventListener('scroll', this._onScrollHandler);
      window.removeEventListener('scroll', this._onScrollHandler, { capture: true });
    }
    if (this.isFullScreen) {
      document.body.style.overflow = '';
    }
    this.wrapEl.remove();
    this.container.innerHTML = '';
  }
}

if (typeof window !== 'undefined') {
  window.RichEditor = RichEditor;
}

export default RichEditor;




