'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import {
  Bold, Italic, Underline, Strikethrough, Link2,
  List, ListOrdered, Quote, Code2, Image,
  Plus, Type, Smile, AtSign, Video, Mic, Slash, SendHorizonal,
} from 'lucide-react';

interface Props {
  placeholder: string;
  onSend: (content: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export default function RichMessageInput({ placeholder, onSend, onTypingStart, onTypingStop }: Props) {
  const editorRef    = useRef<HTMLDivElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const emojiRef     = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const [isEmpty,         setIsEmpty]         = useState(true);
  const [showFormatBar,   setShowFormatBar]   = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkDialog,  setShowLinkDialog]  = useState(false);
  const [linkUrl,         setLinkUrl]         = useState('');
  const [toast,           setToast]           = useState<string | null>(null);
  const [activeFmts,      setActiveFmts]      = useState<Set<string>>(new Set());

  const typingTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef   = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────
  const checkEmpty = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    setIsEmpty(el.innerText.trim() === '' && !el.querySelector('img'));
  }, []);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  }, []);

  // Always focus the editor first, then restore the saved range if one exists.
  // If no range is saved (editor was never clicked), the cursor lands at the
  // end by default — which is the correct fallback for an empty editor.
  const restoreSelection = useCallback(() => {
    editorRef.current?.focus();
    const range = savedRangeRef.current;
    if (!range) return;
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  }, []);

  // Query which format commands are currently active at the cursor/selection.
  // queryCommandState is deprecated in spec but remains the only reliable
  // cross-browser way to read contenteditable format state.
  const qcs = (cmd: string) => (document as any).queryCommandState(cmd) as boolean;
  const updateActiveFormats = useCallback(() => {
    const s = new Set<string>();
    if (qcs('bold'))                s.add('bold');
    if (qcs('italic'))              s.add('italic');
    if (qcs('underline'))           s.add('underline');
    if (qcs('strikeThrough'))       s.add('strikeThrough');
    if (qcs('insertUnorderedList')) s.add('ul');
    if (qcs('insertOrderedList'))   s.add('ol');
    setActiveFmts(s);
  }, []);

  // If the editor already has focus (user has a selection), do NOT call focus()
  // again — it would reset the caret and break formatting-on-selection.
  // If the editor is NOT focused (user clicked a format button before ever
  // clicking the editor), focus it first so execCommand has a valid target
  // and the browser's pending-format state is set on the right element.
  const exec = useCallback((cmd: string, value?: string) => {
    if (document.activeElement !== editorRef.current) {
      editorRef.current?.focus();
    }
    document.execCommand(cmd, false, value ?? undefined);
    updateActiveFormats();
    checkEmpty();
  }, [checkEmpty, updateActiveFormats]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // ── typing indicator ──────────────────────────────────────────────────────
  const handleInput = useCallback(() => {
    checkEmpty();
    if (!isTypingRef.current) { isTypingRef.current = true; onTypingStart?.(); }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { isTypingRef.current = false; onTypingStop?.(); }, 2000);
  }, [checkEmpty, onTypingStart, onTypingStop]);

  // ── send ─────────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const el = editorRef.current;
    if (!el || isEmpty) return;
    // Strip trailing <br> inside block elements and trailing empty blocks
    // that browsers inject into contenteditable
    const html = el.innerHTML
      .replace(/<br\s*\/?>\s*(<\/(div|p|li|blockquote)>)/gi, '$1')
      .replace(/(<(div|p)>\s*<\/(div|p)>)+\s*$/gi, '')
      .trim();
    if (!html) return;
    onSend(html);
    el.innerHTML = '';
    setIsEmpty(true);
    isTypingRef.current = false;
    onTypingStop?.();
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, [isEmpty, onSend, onTypingStop]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); return; }

    // Escape from inline CODE elements with arrow keys
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      // Walk up from the cursor to find a CODE ancestor inside the editor
      let codeEl: Element | null = null;
      let node: Node | null = range.startContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'CODE') { codeEl = node as Element; break; }
        node = node.parentNode;
      }
      if (!codeEl) return;

      if (e.key === 'ArrowRight') {
        const atEnd =
          range.startContainer.nodeType === Node.TEXT_NODE
            ? range.startOffset === range.startContainer.textContent!.length
            : range.startOffset === codeEl.childNodes.length;
        if (atEnd) {
          e.preventDefault();
          const nr = document.createRange();
          nr.setStartAfter(codeEl);
          nr.collapse(true);
          sel.removeAllRanges();
          sel.addRange(nr);
        }
      } else {
        const atStart = range.startOffset === 0;
        if (atStart) {
          e.preventDefault();
          const nr = document.createRange();
          nr.setStartBefore(codeEl);
          nr.collapse(true);
          sel.removeAllRanges();
          sel.addRange(nr);
        }
      }
    }
  }, [handleSend]);

  // ── formatting ────────────────────────────────────────────────────────────
  const fmtBold       = () => exec('bold');
  const fmtItalic     = () => exec('italic');
  const fmtUnderline  = () => exec('underline');
  const fmtStrike     = () => exec('strikeThrough');
  const fmtUL         = () => exec('insertUnorderedList');
  const fmtOL         = () => exec('insertOrderedList');
  const fmtBlockquote = () => exec('formatBlock', 'blockquote');

  const fmtCode = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const selectedText = range.toString();
    const code = document.createElement('code');

    if (!selectedText) {
      // No selection: create empty <code> and place cursor inside it
      // A zero-width space makes the element non-collapsed so the cursor lands in it
      const inner = document.createTextNode('\u200B');
      code.appendChild(inner);

      // Insert [code][escape text node] so right-arrow can exit immediately
      const escapeNode = document.createTextNode('\u00A0');
      range.insertNode(escapeNode);
      range.insertNode(code);

      // Move cursor inside code, BEFORE the ZWS (so typing replaces it naturally)
      const nr = document.createRange();
      nr.setStart(inner, 0);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);
    } else {
      // Selection: wrap it in <code>
      code.textContent = selectedText;
      range.deleteContents();
      range.insertNode(code);

      // Guarantee a text node after code so arrow-right has somewhere to land
      if (!code.nextSibling || code.nextSibling.nodeType !== Node.TEXT_NODE) {
        code.parentNode?.insertBefore(document.createTextNode('\u00A0'), code.nextSibling ?? null);
      }

      // Move cursor to just after the code element
      const nr = document.createRange();
      nr.setStart(code.nextSibling!, 0);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);
    }

    checkEmpty();
  };

  const fmtImage = () => fileRef.current?.click();

  // ── link ─────────────────────────────────────────────────────────────────
  const openLinkDialog = () => {
    saveSelection();
    setShowLinkDialog(true);
    setTimeout(() => linkInputRef.current?.focus(), 50);
  };

  const applyLink = () => {
    // Restore selection (focuses editor first, then puts selection back)
    restoreSelection();
    if (linkUrl.trim()) exec('createLink', linkUrl.trim());
    setShowLinkDialog(false);
    setLinkUrl('');
  };

  // ── emoji ─────────────────────────────────────────────────────────────────
  const openEmoji = () => {
    // Selection is already saved by the editor's onBlur handler
    setShowEmojiPicker(v => !v);
  };

  const insertEmoji = (emoji: string) => {
    restoreSelection();
    exec('insertText', emoji);
    setShowEmojiPicker(false);
  };

  // ── attach ────────────────────────────────────────────────────────────────
  const handleAttach = () => fileRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const span = `<span class="file-attach">📎 ${file.name}</span>&nbsp;`;
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, span);
    checkEmpty();
    e.target.value = '';
  };

  // ── @ mention ─────────────────────────────────────────────────────────────
  const insertMention = () => {
    editorRef.current?.focus();
    document.execCommand('insertText', false, '@');
    checkEmpty();
  };

  // ── slash command ─────────────────────────────────────────────────────────
  const insertSlash = () => {
    editorRef.current?.focus();
    document.execCommand('insertText', false, '/');
    checkEmpty();
  };

  // ── close emoji picker on outside click ───────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1e1f22] text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-[#3a3d45] shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}

      <div className="border border-[#3a3d45] rounded-lg overflow-visible bg-[#1a1d21]">

        {/* ── Top formatting toolbar ─────────────────────────────────────── */}
        {showFormatBar && (
          <div className="flex items-center gap-0.5 px-2 pt-2 pb-1.5 border-b border-[#2e3035]">
            <FmtBtn onClick={fmtBold}      title="Bold (Ctrl+B)"    active={activeFmts.has('bold')}>
              <Bold size={15} strokeWidth={2.5} />
            </FmtBtn>
            <FmtBtn onClick={fmtItalic}    title="Italic (Ctrl+I)"  active={activeFmts.has('italic')}>
              <Italic size={15} strokeWidth={2.5} />
            </FmtBtn>
            <FmtBtn onClick={fmtUnderline} title="Underline (Ctrl+U)" active={activeFmts.has('underline')}>
              <Underline size={15} strokeWidth={2.5} />
            </FmtBtn>
            <FmtBtn onClick={fmtStrike}    title="Strikethrough"    active={activeFmts.has('strikeThrough')}>
              <Strikethrough size={15} strokeWidth={2.5} />
            </FmtBtn>

            <FmtDivider />

            {/* Link */}
            <div className="relative">
              <FmtBtn onClick={openLinkDialog} title="Insert link">
                <Link2 size={15} strokeWidth={2.5} />
              </FmtBtn>
              {showLinkDialog && (
                <div
                  className="absolute top-9 left-0 z-50 flex items-center gap-1.5 bg-[#1e1f22] border border-[#3a3d45] rounded-lg p-2 shadow-xl"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <input
                    ref={linkInputRef}
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') applyLink();
                      if (e.key === 'Escape') setShowLinkDialog(false);
                    }}
                    placeholder="https://..."
                    className="w-52 bg-[#313338] text-slate-100 text-xs px-2.5 py-1.5 rounded outline-none border border-[#4e5058] placeholder:text-slate-500"
                  />
                  <button
                    onClick={applyLink}
                    className="px-2.5 py-1.5 rounded bg-[#5865f2] text-white text-xs hover:bg-[#4752c4] font-medium whitespace-nowrap"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setShowLinkDialog(false)}
                    className="px-2.5 py-1.5 rounded bg-[#4e5058] text-slate-200 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <FmtDivider />

            <FmtBtn onClick={fmtUL} title="Bullet list"   active={activeFmts.has('ul')}>
              <List size={15} strokeWidth={2.5} />
            </FmtBtn>
            <FmtBtn onClick={fmtOL} title="Numbered list" active={activeFmts.has('ol')}>
              <ListOrdered size={15} strokeWidth={2.5} />
            </FmtBtn>

            <FmtDivider />

            <FmtBtn onClick={fmtBlockquote} title="Quote">
              <Quote size={15} strokeWidth={2.5} />
            </FmtBtn>
            <FmtBtn onClick={fmtCode}       title="Inline code">
              <Code2 size={15} strokeWidth={2.5} />
            </FmtBtn>
          </div>
        )}

        {/* ── Editable area ─────────────────────────────────────────────── */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onSelect={updateActiveFormats}
          onBlur={saveSelection}
          data-placeholder={placeholder}
          className={cn(
            'rich-editor min-h-[44px] max-h-[200px] overflow-y-auto',
            'px-4 py-3 text-[15px] text-slate-100 outline-none leading-relaxed'
          )}
        />

        {/* ── Bottom actions toolbar ─────────────────────────────────────── */}
        <div className="flex items-center px-2 pb-2 pt-1">
          <div className="flex items-center gap-0.5 flex-1">

            <ActBtn onClick={handleAttach} title="Attach file">
              <Plus size={16} strokeWidth={2.5} />
            </ActBtn>

            <ActDivider />

            {/* Emoji picker */}
            <div className="relative" ref={emojiRef}>
              <ActBtn onClick={openEmoji} title="Emoji">
                <Smile size={15} strokeWidth={2.5} />
              </ActBtn>
              {showEmojiPicker && (
                <div
                  className="absolute bottom-10 left-0 z-50"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Picker
                    data={data}
                    onEmojiSelect={(emoji: { native: string }) => insertEmoji(emoji.native)}
                    theme="dark"
                    previewPosition="none"
                    skinTonePosition="none"
                    navPosition="bottom"
                    perLine={9}
                  />
                </div>
              )}
            </div>

            <ActBtn onClick={insertMention} title="Mention someone">
              <AtSign size={15} strokeWidth={2.5} />
            </ActBtn>

            <ActDivider />

            <ActBtn onClick={() => showToast('Video calls coming soon')} title="Video clip">
              <Video size={15} strokeWidth={2.5} />
            </ActBtn>

            <ActBtn onClick={() => showToast('Voice messages coming soon')} title="Voice message">
              <Mic size={15} strokeWidth={2.5} />
            </ActBtn>

            <ActBtn onClick={insertSlash} title="Slash commands">
              <Slash size={15} strokeWidth={2.5} />
            </ActBtn>
          </div>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={isEmpty}
            className={cn(
              'h-8 w-8 flex items-center justify-center rounded-md transition-all',
              !isEmpty
                ? 'bg-[#007a5a] hover:bg-[#148567] text-white'
                : 'bg-[#2a2d31] text-slate-600 cursor-not-allowed'
            )}
            title="Send message"
          >
            <SendHorizonal size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

// ── Toolbar buttons ─────────────────────────────────────────────────────────
function FmtBtn({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded transition-colors',
        active
          ? 'bg-[#4a4d57] text-white'
          : 'text-slate-400 hover:bg-[#2e3035] hover:text-slate-200'
      )}
    >
      {children}
    </button>
  );
}

function FmtDivider() {
  return <div className="w-px h-4 bg-[#3a3d45] mx-1 flex-shrink-0" />;
}

function ActBtn({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded-md transition-colors',
        active
          ? 'bg-[#2e3035] text-slate-200'
          : 'text-slate-400 hover:bg-[#2e3035] hover:text-slate-200'
      )}
    >
      {children}
    </button>
  );
}

function ActDivider() {
  return <div className="w-px h-4 bg-[#3a3d45] mx-0.5 flex-shrink-0" />;
}
