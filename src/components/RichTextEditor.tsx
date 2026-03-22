import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { useEffect } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter,
  AlignRight, Pilcrow, Heading1, Heading2, List, ListOrdered,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// Custom FontSize extension
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el) => el.style.fontSize?.replace('px', '') || null,
        renderHTML: (attrs) => {
          if (!attrs.fontSize) return {};
          return { style: `font-size: ${attrs.fontSize}px` };
        },
      },
    };
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  dir?: 'ltr' | 'rtl';
}

export function RichTextEditor({ content, onChange, placeholder, dir }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      FontSize,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[120px] px-3 py-2 focus:outline-none text-foreground',
        dir: dir || 'ltr',
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content]);

  // Update dir attribute
  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class:
              'prose prose-sm dark:prose-invert max-w-none min-h-[120px] px-3 py-2 focus:outline-none text-foreground',
            dir: dir || 'ltr',
          },
        },
      });
    }
  }, [dir, editor]);

  if (!editor) return null;

  const setFontSize = (size: string) => {
    if (size === 'default') {
      editor.chain().focus().unsetMark('textStyle').run();
    } else {
      editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap px-1.5 py-1 border-b border-border bg-card/50">
        {/* Font size */}
        <Select
          value="default"
          onValueChange={setFontSize}
        >
          <SelectTrigger className="h-7 w-20 text-xs bg-transparent border-none shadow-none">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="default">Normal</SelectItem>
            <SelectItem value="12">Small</SelectItem>
            <SelectItem value="16">Medium</SelectItem>
            <SelectItem value="20">Large</SelectItem>
            <SelectItem value="24">XL</SelectItem>
            <SelectItem value="32">XXL</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Text formatting */}
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          className="h-7 w-7 p-0"
          aria-label="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          className="h-7 w-7 p-0"
          aria-label="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          className="h-7 w-7 p-0"
          aria-label="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </Toggle>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Headings */}
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className="h-7 w-7 p-0"
          aria-label="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="h-7 w-7 p-0"
          aria-label="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </Toggle>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Alignment */}
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'left' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
          className="h-7 w-7 p-0"
          aria-label="Align left"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'center' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
          className="h-7 w-7 p-0"
          aria-label="Align center"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'right' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
          className="h-7 w-7 p-0"
          aria-label="Align right"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </Toggle>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Direction buttons */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-1.5 text-[10px] font-bold"
          onClick={() => {
            const el = document.querySelector('.ProseMirror');
            if (el) (el as HTMLElement).dir = 'ltr';
          }}
          title="Left-to-Right"
        >
          LTR
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-1.5 text-[10px] font-bold"
          onClick={() => {
            const el = document.querySelector('.ProseMirror');
            if (el) (el as HTMLElement).dir = 'rtl';
          }}
          title="Right-to-Left"
        >
          RTL
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Lists */}
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          className="h-7 w-7 p-0"
          aria-label="Bullet list"
        >
          <List className="w-3.5 h-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-7 w-7 p-0"
          aria-label="Ordered list"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </Toggle>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
