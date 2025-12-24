import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Bold, Italic, Underline, AlignRight, AlignCenter, AlignLeft, List, ListOrdered, Quote, Undo, Redo, Type, Palette } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Write lesson content here...",
  className = "",
  minHeight = "300px"
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState<{ [key: string]: boolean }>({});
  const [fontSize, setFontSize] = useState('16');
  const [textColor, setTextColor] = useState('#ffffff');
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if a command is currently active
  const checkCommandState = useCallback(() => {
    if (!editorRef.current || isUpdating) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const newActiveState: { [key: string]: boolean } = {};
    
    try {
      newActiveState.bold = document.queryCommandState('bold');
      newActiveState.italic = document.queryCommandState('italic');
      newActiveState.underline = document.queryCommandState('underline');
      newActiveState.justifyRight = document.queryCommandState('justifyRight');
      newActiveState.justifyCenter = document.queryCommandState('justifyCenter');
      newActiveState.justifyLeft = document.queryCommandState('justifyLeft');
      newActiveState.insertUnorderedList = document.queryCommandState('insertUnorderedList');
      newActiveState.insertOrderedList = document.queryCommandState('insertOrderedList');
    } catch (e) {
      // Fallback for browsers that don't support queryCommandState
    }
    
    setIsActive(newActiveState);
  }, [isUpdating]);

  // Execute formatting command
  const execCommand = useCallback((command: string, value?: string) => {
    if (!editorRef.current || isUpdating) return;
    
    editorRef.current.focus();
    
    try {
      if (command === 'fontSize') {
        document.execCommand('fontSize', false, '7');
        const fontElements = editorRef.current.querySelectorAll('font[size="7"]');
        fontElements.forEach(el => {
          el.removeAttribute('size');
          (el as HTMLElement).style.fontSize = value + 'px';
        });
      } else if (command === 'foreColor') {
        document.execCommand('foreColor', false, value);
      } else {
        document.execCommand(command, false, value);
      }
    } catch (e) {
      console.warn('Command execution failed:', command, e);
    }
    
    // Update content after a brief delay
    setTimeout(() => {
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
      checkCommandState();
    }, 10);
  }, [onChange, checkCommandState, isUpdating]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (!editorRef.current || isUpdating) return;
    
    const content = editorRef.current.innerHTML;
    onChange(content);
  }, [onChange, isUpdating]);

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    if (!isUpdating) {
      setTimeout(checkCommandState, 50);
    }
  }, [checkCommandState, isUpdating]);

  // Set up event listeners
  useEffect(() => {
    const handleDocumentSelectionChange = () => {
      if (!isUpdating) {
        setTimeout(checkCommandState, 50);
      }
    };
    
    document.addEventListener('selectionchange', handleDocumentSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleDocumentSelectionChange);
    };
  }, [checkCommandState, isUpdating]);

  // Update editor content when value prop changes
  useEffect(() => {
    if (editorRef.current && !isUpdating) {
      const currentContent = editorRef.current.innerHTML;
      if (value !== currentContent) {
        setIsUpdating(true);
        editorRef.current.innerHTML = value || '';
        setTimeout(() => setIsUpdating(false), 100);
      }
    }
  }, [value, isUpdating]);

  // Toolbar button component
  const ToolbarButton = ({ 
    command, 
    icon: Icon, 
    title, 
    value: commandValue,
    isActive: buttonActive 
  }: {
    command: string;
    icon: React.ComponentType<any>;
    title: string;
    value?: string;
    isActive?: boolean;
  }) => (
    <button
      type="button"
      onClick={() => execCommand(command, commandValue)}
      className={`p-2 rounded-md transition-all duration-200 hover:bg-white/20 ${
        buttonActive || isActive[command] 
          ? 'bg-gold/20 text-gold border border-gold/30' 
          : 'bg-white/10 text-white/80 border border-transparent'
      }`}
      title={title}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className={`border border-white/10 rounded-lg bg-black/40 overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-white/10 bg-black/20">
        {/* Text Formatting */}
        <div className="flex items-center gap-1">
          <ToolbarButton command="bold" icon={Bold} title="Bold (Ctrl+B)" />
          <ToolbarButton command="italic" icon={Italic} title="Italic (Ctrl+I)" />
          <ToolbarButton command="underline" icon={Underline} title="Underline (Ctrl+U)" />
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Font Size */}
        <div className="flex items-center gap-2">
          <Type size={16} className="text-white/60" />
          <select
            value={fontSize}
            onChange={(e) => {
              setFontSize(e.target.value);
              execCommand('fontSize', e.target.value);
            }}
            className="bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-gold focus:outline-none"
          >
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
            <option value="24">24px</option>
            <option value="28">28px</option>
            <option value="32">32px</option>
          </select>
        </div>

        {/* Text Color */}
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-white/60" />
          <input
            type="color"
            value={textColor}
            onChange={(e) => {
              setTextColor(e.target.value);
              execCommand('foreColor', e.target.value);
            }}
            className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
            title="Text Color"
          />
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Text Alignment */}
        <div className="flex items-center gap-1">
          <ToolbarButton command="justifyRight" icon={AlignRight} title="Align Right" />
          <ToolbarButton command="justifyCenter" icon={AlignCenter} title="Align Center" />
          <ToolbarButton command="justifyLeft" icon={AlignLeft} title="Align Left" />
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Lists */}
        <div className="flex items-center gap-1">
          <ToolbarButton command="insertUnorderedList" icon={List} title="Bullet List" />
          <ToolbarButton command="insertOrderedList" icon={ListOrdered} title="Numbered List" />
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Headings */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'h1')}
            className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded transition-colors text-white/80"
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'h2')}
            className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded transition-colors text-white/80"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'h3')}
            className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded transition-colors text-white/80"
            title="Heading 3"
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'p')}
            className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded transition-colors text-white/80"
            title="Paragraph"
          >
            P
          </button>
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Quote */}
        <ToolbarButton command="formatBlock" icon={Quote} title="Quote" value="blockquote" />

        <div className="w-px h-6 bg-white/20" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <ToolbarButton command="undo" icon={Undo} title="Undo (Ctrl+Z)" />
          <ToolbarButton command="redo" icon={Redo} title="Redo (Ctrl+Y)" />
        </div>
      </div>

      {/* Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          className="p-6 text-white focus:outline-none overflow-auto"
          style={{
            minHeight,
            direction: 'ltr',
            textAlign: 'left',
            fontFamily: 'Arial, sans-serif, Cairo',
            lineHeight: '1.8',
            fontSize: '16px'
          }}
          onInput={handleInput}
          onFocus={() => {
            setTimeout(checkCommandState, 50);
          }}
          onKeyDown={(e) => {
            // Handle keyboard shortcuts
            if (e.ctrlKey || e.metaKey) {
              switch (e.key) {
                case 'b':
                  e.preventDefault();
                  execCommand('bold');
                  break;
                case 'i':
                  e.preventDefault();
                  execCommand('italic');
                  break;
                case 'u':
                  e.preventDefault();
                  execCommand('underline');
                  break;
                case 'z':
                  if (e.shiftKey) {
                    e.preventDefault();
                    execCommand('redo');
                  } else {
                    e.preventDefault();
                    execCommand('undo');
                  }
                  break;
                case 'y':
                  e.preventDefault();
                  execCommand('redo');
                  break;
              }
            }
          }}
          suppressContentEditableWarning={true}
        />
        {(!value || value.trim() === '') && (
          <div className="absolute top-6 left-6 text-white/40 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-black/20 border-t border-white/10 text-xs text-white/60 flex justify-between items-center">
        <div>Advanced Text Editor</div>
        <div className="flex items-center gap-4">
          <span>Words: {value.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length}</span>
          <span>Chars: {value.replace(/<[^>]*>/g, '').length}</span>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;