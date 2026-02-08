'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

// Toolbar button component
function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded hover:bg-muted transition-colors
        ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  );
}

// Link popover component
function LinkPopover({ editor }: { editor: Editor }) {
  const [url, setUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const setLink = () => {
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setIsOpen(false);
    setUrl('');
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`
          p-2 rounded hover:bg-muted transition-colors
          ${editor.isActive('link') ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}
        `}
        title="Add Link"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded">
      <Input
        type="url"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            setLink();
          }
          if (e.key === 'Escape') {
            setIsOpen(false);
            setUrl('');
          }
        }}
        className="h-7 text-xs w-40"
        autoFocus
      />
      <Button type="button" size="sm" variant="ghost" onClick={setLink} className="h-7 px-2 text-xs">
        Add
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setIsOpen(false);
          setUrl('');
        }}
        className="h-7 px-2 text-xs"
      >
        Cancel
      </Button>
    </div>
  );
}

// Color picker component
function ColorPickerButton({ editor }: { editor: Editor }) {
  const [showColors, setShowColors] = useState(false);
  const colors = [
    '#000000',
    '#333333',
    '#666666',
    '#999999',
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#06b6d4',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowColors(!showColors)}
        className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground"
        title="Text Color"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" />
        </svg>
      </button>
      {showColors && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-card border rounded-md shadow-lg z-10">
          <div className="grid grid-cols-6 gap-1">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => {
                  editor.chain().focus().setColor(color).run();
                  setShowColors(false);
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              editor.chain().focus().unsetColor().run();
              setShowColors(false);
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

// Main editor toolbar
function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 12a4 4 0 0 0 0-8H6v8" />
          <path d="M15 20a4 4 0 0 0 0-8H6v8Z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" x2="10" y1="4" y2="4" />
          <line x1="14" x2="5" y1="20" y2="20" />
          <line x1="15" x2="9" y1="4" y2="20" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 4v6a6 6 0 0 0 12 0V4" />
          <line x1="4" x2="20" y1="20" y2="20" />
        </svg>
      </ToolbarButton>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="21" x2="3" y1="6" y2="6" />
          <line x1="15" x2="3" y1="12" y2="12" />
          <line x1="17" x2="3" y1="18" y2="18" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="21" x2="3" y1="6" y2="6" />
          <line x1="17" x2="7" y1="12" y2="12" />
          <line x1="19" x2="5" y1="18" y2="18" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="21" x2="3" y1="6" y2="6" />
          <line x1="21" x2="9" y1="12" y2="12" />
          <line x1="21" x2="7" y1="18" y2="18" />
        </svg>
      </ToolbarButton>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="8" x2="21" y1="6" y2="6" />
          <line x1="8" x2="21" y1="12" y2="12" />
          <line x1="8" x2="21" y1="18" y2="18" />
          <line x1="3" x2="3.01" y1="6" y2="6" />
          <line x1="3" x2="3.01" y1="12" y2="12" />
          <line x1="3" x2="3.01" y1="18" y2="18" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="10" x2="21" y1="6" y2="6" />
          <line x1="10" x2="21" y1="12" y2="12" />
          <line x1="10" x2="21" y1="18" y2="18" />
          <path d="M4 6h1v4" />
          <path d="M4 10h2" />
          <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        </svg>
      </ToolbarButton>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      {/* Link and color */}
      <LinkPopover editor={editor} />
      <ColorPickerButton editor={editor} />

      <div className="w-px h-6 bg-border mx-1 self-center" />

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
        </svg>
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      TextStyle,
      Color,
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none',
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className={`border rounded-lg overflow-hidden ${className}`}>
        <div className="p-4 text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
