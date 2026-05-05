"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo2,
  Redo2 } from
"lucide-react";

import { cn } from "@/src/hooks/utils";
import { useTouchDevice } from "@/src/hooks/use-touch-device";








/**
 * Clinical Notes editor — patient-facing rich-text doc.
 *
 * Pre-fills from TP-EMR data on first open; doctor edits inline (sections
 * live as <h3>, items as <ul>/<ol>) and prints or copies. Toolbar mirrors
 * a basic word-processor: headings, bold/italic/underline/strike, bullet
 * + numbered lists, undo/redo. Deliberately minimal — printable plainness
 * over rich formatting.
 */
export function ClinicalNotesEditor({
  value,
  onChange,
  className,
  placeholder = "Start typing your clinical notes…"
}) {
  const editor = useEditor({
    extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Underline,
    Placeholder.configure({ placeholder })],

    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "vrx-cn-editor focus:outline-none"
      }
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });

  // Keep external value in sync if a parent replaces it (e.g. session reload).
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  // Touch devices (iPad / phones) hide the formatting toolbar — the
  // doctor uses the system keyboard for headings / bold / italic /
  // underline / lists / undo / redo via its built-in shortcuts
  // (Cmd+B, Cmd+I, Cmd+U, Cmd+Z, etc.).
  const isTouch = useTouchDevice();

  if (!editor) return null;

  const btnBase =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-tp-slate-600 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-900 disabled:cursor-not-allowed disabled:opacity-40";
  const btnActive = "bg-tp-slate-900 text-white hover:bg-tp-slate-900 hover:text-white";

  return (
    <div className={cn("vrx-cn-shiner-shell relative flex h-full flex-col rounded-xl", className)}>
        {/* Border now uses the same calm violet→indigo "shiner"
          gradient as the consultation-summary card on the agent
          chat — replaces the rotating conic, which read as harsh
          and clipped at the corners. */}

        <div className="flex-1 overflow-y-auto z-10 bg-white rounded-t-xl">
          <EditorContent editor={editor} className="vrx-cn-content min-h-[160px] px-4 py-3 text-[14px] leading-[1.6] text-tp-slate-800" />
        </div>
        {!isTouch &&
      <div className="flex flex-wrap items-center gap-0.5 border-t border-tp-slate-200 px-1.5 py-1.5 z-10 bg-white rounded-b-xl">
          <button type="button" aria-label="Heading 1" className={cn(btnBase, editor.isActive("heading", { level: 1 }) && btnActive)} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 size={14} strokeWidth={2} />
          </button>
          <button type="button" aria-label="Heading 2" className={cn(btnBase, editor.isActive("heading", { level: 2 }) && btnActive)} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 size={14} strokeWidth={2} />
          </button>
          <button type="button" aria-label="Heading 3" className={cn(btnBase, editor.isActive("heading", { level: 3 }) && btnActive)} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 size={14} strokeWidth={2} />
          </button>
          <span className="mx-1 h-4 w-px bg-tp-slate-200" aria-hidden />
          <button type="button" aria-label="Bold" className={cn(btnBase, editor.isActive("bold") && btnActive)} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold size={14} strokeWidth={2.4} />
          </button>
          <button type="button" aria-label="Italic" className={cn(btnBase, editor.isActive("italic") && btnActive)} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic size={14} strokeWidth={2.4} />
          </button>
          <button type="button" aria-label="Underline" className={cn(btnBase, editor.isActive("underline") && btnActive)} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon size={14} strokeWidth={2.4} />
          </button>
          <button type="button" aria-label="Strikethrough" className={cn(btnBase, editor.isActive("strike") && btnActive)} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough size={14} strokeWidth={2.4} />
          </button>
          <span className="mx-1 h-4 w-px bg-tp-slate-200" aria-hidden />
          <button type="button" aria-label="Bullet list" className={cn(btnBase, editor.isActive("bulletList") && btnActive)} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List size={14} strokeWidth={2.2} />
          </button>
          <button type="button" aria-label="Numbered list" className={cn(btnBase, editor.isActive("orderedList") && btnActive)} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={14} strokeWidth={2.2} />
          </button>
          <span className="mx-1 h-4 w-px bg-tp-slate-200" aria-hidden />
          <button type="button" aria-label="Undo" className={btnBase} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 size={14} strokeWidth={2.2} />
          </button>
          <button type="button" aria-label="Redo" className={btnBase} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 size={14} strokeWidth={2.2} />
          </button>
        </div>
      }
      {/* vrx-* styles live in app/globals.css */}
    </div>);

}

/**
 * Convert TP-EMR sections into a TipTap-compatible HTML doc so the
 * Clinical Notes tab pre-fills with the same data the doctor saw on the
 * EMR tab — each section becomes an <h3> heading + <ul> body.
 */
export function emrSectionsToHtml(sections) {
  return sections.
  map((s) => {
    const items = s.items.length ?
    `<ul>${s.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>` :
    `<p>—</p>`;
    return `<h3>${escapeHtml(s.title)}</h3>${items}`;
  }).
  join("");
}

function escapeHtml(s) {
  return s.
  replace(/&/g, "&amp;").
  replace(/</g, "&lt;").
  replace(/>/g, "&gt;").
  replace(/"/g, "&quot;").
  replace(/'/g, "&#39;");
}