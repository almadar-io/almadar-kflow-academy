import React, { useRef, useState } from 'react';
import { Edit2, Sparkles, Paperclip } from 'lucide-react';
import { MindMapNodeProps } from '../types/mindMapTypes';
import { wrapText } from '../utils/mindMapUtils';
import { useTheme } from '../../../contexts/ThemeContext';

const MindMapNode: React.FC<MindMapNodeProps> = ({
  node,
  note,
  isSelected,
  isEditing,
  editValues,
  zoom,
  pan,
  onNodeClick,
  onNodeDoubleClick,
  onNodeRightClick,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onOpenContentEditor,
  onEditNote,
  onAIGenerateChildren,
  onEditValuesChange
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1e293b';
  const overflowIndicatorColor = isDark ? '#d1d5db' : '#9ca3af';
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isNewChildNote = note?.title === 'New Child Note' && note?.content === 'Add your content here...';
  const [isHovered, setIsHovered] = useState(false);

  // Apply zoom and pan transformations
  const transformedX = (node.x - node.width / 2) * zoom + pan.x;
  const transformedY = (node.y - node.height / 2) * zoom + pan.y;
  const transformedWidth = node.width * zoom;
  const transformedHeight = node.height * zoom;

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (note) {
        const updatedNote = {
          ...note,
          title: editValues.title
        };
        onSaveEdit(updatedNote);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Update the editValues in the parent component
    onEditValuesChange({
      title: e.target.value,
      content: editValues.content
    });
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note) {
      const updatedNote = {
        ...note,
        isExpanded: !note.isExpanded
      };
      onEditNote(updatedNote);
    }
  };

  if (!note) return null;

  return (
    <g
      key={node.id}
      data-node-id={node.id}
      transform={`translate(${transformedX}, ${transformedY})`}
      className={`mindmap-node ${isSelected ? 'selected' : ''} ${note && !note.isExpanded && note.children && note.children.length > 0 ? 'collapsed' : ''}`}
      onClick={() => onNodeClick(node)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onNodeDoubleClick && node.id !== 'virtual-root') {
          onNodeDoubleClick(node);
        } else if (note && node.id !== 'virtual-root') {
          // Fallback: if no double click handler, open content editor
          onOpenContentEditor(note);
        }
      }}
      onContextMenu={(e) => onNodeRightClick(e, node)}
    >
      <rect
        x="0"
        y="0"
        width={transformedWidth}
        height={transformedHeight}
        rx={8 * zoom}
        ry={8 * zoom}
        className={`node-rect ${note && !note.isExpanded && note.children && note.children.length > 0 ? 'collapsed' : ''}`}
        style={{
          opacity: note && !note.isExpanded && note.children && note.children.length > 0 ? 0.7 : 1,
          strokeDasharray: note && !note.isExpanded && note.children && note.children.length > 0 ? '5,5' : 'none',
          strokeWidth: `${isSelected ? 3 * zoom : isHovered ? 2 * zoom : 1 * zoom}`
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {isEditing ? (
        <foreignObject x="5" y="15" width={transformedWidth - 10} height="30">
          <div style={{ width: '100%', height: '100%' }}>
            <input
              type="text"
              value={editValues.title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              ref={titleInputRef}
              onBlur={() => {
                if (note) {
                  const updatedNote = {
                    ...note,
                    title: editValues.title
                  };
                  onSaveEdit(updatedNote);
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: `${Math.max(10, 12 * zoom)}px`,
                textAlign: 'center',
                color: textColor
              }}
              autoFocus
            />
          </div>
        </foreignObject>
      ) : (
        <foreignObject x="10" y="15" width={transformedWidth - 20} height={transformedHeight - 30}>
          <div 
            style={{ 
              width: '100%', 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `${Math.max(10, 12 * zoom)}px`,
              color: textColor,
              lineHeight: '1.2',
              textAlign: 'center',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              hyphens: 'auto'
            }}
          >
            {wrapText(node.title, transformedWidth).map((line, index) => (
              <div key={index} style={{ margin: '2px 0' }}>
                {line}
              </div>
            ))}
          </div>
        </foreignObject>
      )}
      
      {/* Text overflow indicator - show ellipsis for long titles */}
      {!isEditing && node.title.length > 35 && (
        <text
          x={transformedWidth - 10}
          y={transformedHeight - 5}
          textAnchor="end"
          dominantBaseline="text-after-edge"
          className="text-overflow-indicator"
          style={{ fontSize: `${Math.max(8, 10 * zoom)}px`, fill: overflowIndicatorColor }}
        >
          ...
        </text>
      )}
      
      {/* Content Edit Button - Always visible inside the node */}
      {node.id !== 'virtual-root' && !isEditing && (
        <foreignObject x="5" y="5" width="20" height="20">
          <div style={{ width: '100%', height: '100%' }}>
            <button
              className="content-edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenContentEditor(note);
              }}
              title="Edit content"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'rgba(37, 99, 235, 0.1)',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(37, 99, 235, 0.2)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Edit2 size={10} color="#2563eb" />
            </button>
          </div>
        </foreignObject>
      )}

      {/* AI Generate Children Button */}
      {/* {node.id !== 'virtual-root' && !isEditing && (
        <foreignObject x="5" y="30" width="20" height="20">
          <div style={{ width: '100%', height: '100%' }}>
            <button
              className="ai-generate-btn"
              onClick={(e) => {
                e.stopPropagation();
                onAIGenerateChildren(note);
              }}
              title="Generate children with AI"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'rgba(168, 85, 247, 0.1)',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Sparkles size={10} color="#a855f7" />
            </button>
          </div>
        </foreignObject>
      )} */}
      
      {/* Expand/Collapse Indicator - Show if note has children */}
      {node.id !== 'virtual-root' && !isEditing && note && note.children && note.children.length > 0 && (
        <foreignObject x={transformedWidth - 25} y="30" width="20" height="20">
          <div style={{ width: '100%', height: '100%' }}>
            <button
              className={`expand-collapse-btn ${note.isExpanded ? 'expanded' : 'collapsed'}`}
              onClick={handleToggleExpand}
              title={note.isExpanded ? 'Collapse (F)' : 'Expand (F)'}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: note.isExpanded ? 'rgba(245, 158, 11, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                color: note.isExpanded ? '#f59e0b' : '#9ca3af'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = note.isExpanded ? 'rgba(245, 158, 11, 0.3)' : 'rgba(156, 163, 175, 0.3)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = note.isExpanded ? 'rgba(245, 158, 11, 0.2)' : 'rgba(156, 163, 175, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {note.isExpanded ? '−' : '+'}
            </button>
          </div>
        </foreignObject>
      )}
      
      {/* Content Indicator - Show clip icon if node has actual content */}
      {node.id !== 'virtual-root' && note && note.content && note.content.trim() !== '' && note.content !== 'Add your content here...' && (
        <foreignObject x={transformedWidth-25} y={5} width="20" height="20">
          <div style={{ width: '100%', height: '100%' }}>
            <div
              className="content-indicator"
              title={`${note.content}`}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '4px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                cursor: 'pointer'
              }}
            >
              <Paperclip onClick={() => onOpenContentEditor(note)} size={10} color="#22c55e" />
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  );
};

export default MindMapNode;
