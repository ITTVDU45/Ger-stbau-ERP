'use client'

import React, { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Underline } from '@tiptap/extension-underline'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3,
  Underline as UnderlineIcon,
  Highlighter,
  Palette
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function RichTextEditor({ value, onChange, placeholder, className = '' }: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)

  const textColors = [
    '#000000', '#4B5563', '#EF4444', '#F59E0B', '#10B981', 
    '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF'
  ]
  
  const highlightColors = [
    '#FEF3C7', '#DBEAFE', '#D1FAE5', '#FCE7F3', '#E0E7FF',
    '#FED7AA', '#FEE2E2', '#E5E7EB', 'transparent'
  ]

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: value,
    immediatelyRender: false, // Fix für SSR/Hydration-Probleme
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] px-3 py-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-1 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-2 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic [&_u]:underline',
      },
    },
  })

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return <div className="h-32 bg-gray-50 rounded border border-gray-300 animate-pulse"></div>
  }

  return (
    <div className={`rich-text-editor-wrapper border border-gray-300 rounded-md ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-300 bg-gray-50">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
          }`}
          type="button"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
          }`}
          type="button"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
          }`}
          type="button"
        >
          <Heading3 className="h-4 w-4" />
        </button>
        <div className="w-px h-8 bg-gray-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
          }`}
          type="button"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
          }`}
          type="button"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('underline') ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
          }`}
          type="button"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
        <div className="w-px h-8 bg-gray-300 mx-1" />
        
        {/* Textfarbe */}
        <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
          <PopoverTrigger asChild>
            <button
              className="p-2 rounded hover:bg-gray-200 text-gray-700"
              type="button"
            >
              <Palette className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Textfarbe</p>
              <div className="grid grid-cols-3 gap-2">
                {textColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run()
                      setShowColorPicker(false)
                    }}
                    className="w-8 h-8 rounded border-2 border-gray-300 hover:border-blue-500 transition-colors"
                    style={{ backgroundColor: color }}
                    type="button"
                    title={color}
                  />
                ))}
              </div>
              <button
                onClick={() => {
                  editor.chain().focus().unsetColor().run()
                  setShowColorPicker(false)
                }}
                className="w-full mt-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                type="button"
              >
                Farbe entfernen
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Markierung/Highlight */}
        <Popover open={showHighlightPicker} onOpenChange={setShowHighlightPicker}>
          <PopoverTrigger asChild>
            <button
              className={`p-2 rounded hover:bg-gray-200 ${
                editor.isActive('highlight') ? 'bg-yellow-100 text-yellow-700' : 'text-gray-700'
              }`}
              type="button"
            >
              <Highlighter className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Text markieren</p>
              <div className="grid grid-cols-3 gap-2">
                {highlightColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      if (color === 'transparent') {
                        editor.chain().focus().unsetHighlight().run()
                      } else {
                        editor.chain().focus().toggleHighlight({ color }).run()
                      }
                      setShowHighlightPicker(false)
                    }}
                    className="w-8 h-8 rounded border-2 border-gray-300 hover:border-blue-500 transition-colors"
                    style={{ backgroundColor: color }}
                    type="button"
                    title={color === 'transparent' ? 'Keine Markierung' : color}
                  >
                    {color === 'transparent' && (
                      <span className="text-xs text-gray-500">×</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <div className="w-px h-8 bg-gray-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
          }`}
          type="button"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
          }`}
          type="button"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div className="bg-white text-gray-900">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .rich-text-editor-wrapper .ProseMirror {
          min-height: 150px;
        }
        .rich-text-editor-wrapper .ProseMirror:focus {
          outline: none;
        }
        .rich-text-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: '${placeholder || 'Beschreibung eingeben...'}';
          color: #9ca3af;
          float: left;
          height: 0;
          pointer-events: none;
        }
        /* Highlight/Mark Styling */
        .rich-text-editor-wrapper .ProseMirror mark {
          border-radius: 0.25rem;
          padding: 0.125rem 0;
        }
        /* Underline Styling */
        .rich-text-editor-wrapper .ProseMirror u {
          text-decoration: underline;
        }
        /* Color Styling */
        .rich-text-editor-wrapper .ProseMirror [style*="color"] {
          /* Preserve inline colors */
        }
      `}</style>
    </div>
  )
}

