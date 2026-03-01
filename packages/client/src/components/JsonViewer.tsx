/**
 * Generic JSON Viewer Component
 * 
 * Displays JSON data in a formatted, collapsible tree view
 * with syntax highlighting and copy functionality
 */

import React, { useState, useCallback } from 'react';
import { Copy, Check, ChevronRight, ChevronDown } from 'lucide-react';

export interface JsonViewerProps {
  data: any;
  title?: string;
  defaultExpanded?: boolean;
  maxHeight?: string;
  className?: string;
}

interface JsonNodeProps {
  keyName: string | null;
  value: any;
  level: number;
  path: string;
}

const JsonNode: React.FC<JsonNodeProps> = ({ keyName, value, level, path }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Expand first 2 levels by default
  const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isComplex = isObject || isArray;
  const hasChildren = isComplex && Object.keys(value).length > 0;

  const toggleExpanded = useCallback(() => {
    if (hasChildren) {
      setIsExpanded(prev => !prev);
    }
  }, [hasChildren]);

  const getValueType = (val: any): string => {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    if (typeof val === 'object') return 'object';
    return typeof val;
  };

  const formatValue = (val: any): string => {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) return `[${val.length} items]`;
    if (typeof val === 'object') return `{${Object.keys(val).length} keys}`;
    return String(val);
  };

  const getValueColor = (val: any): string => {
    if (val === null) return 'text-gray-400 dark:text-gray-500';
    if (typeof val === 'string') return 'text-green-400 dark:text-green-300';
    if (typeof val === 'number') return 'text-blue-400 dark:text-blue-300';
    if (typeof val === 'boolean') return 'text-purple-400 dark:text-purple-300';
    return 'text-gray-300 dark:text-gray-400';
  };

  const indent = level * 16;

  if (!isComplex) {
    return (
      <div className="flex items-start gap-2 py-0.5 hover:bg-gray-800/30 dark:hover:bg-gray-700/30 rounded px-1 -mx-1">
        <span style={{ paddingLeft: `${indent}px` }} className="flex items-start gap-1 min-w-0">
          {keyName && (
            <>
              <span className="text-blue-300 dark:text-blue-400 font-medium flex-shrink-0">
                {keyName}:
              </span>
              <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">:</span>
            </>
          )}
          <span className={`${getValueColor(value)} break-words`}>
            {formatValue(value)}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-start gap-2 py-0.5 hover:bg-gray-800/30 dark:hover:bg-gray-700/30 rounded px-1 -mx-1 cursor-pointer"
        onClick={toggleExpanded}
      >
        <span style={{ paddingLeft: `${indent}px` }} className="flex items-start gap-1 min-w-0">
          {hasChildren && (
            <span className="flex-shrink-0 mt-0.5">
              {isExpanded ? (
                <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
              ) : (
                <ChevronRight size={14} className="text-gray-400 dark:text-gray-500" />
              )}
            </span>
          )}
          {keyName && (
            <span className="text-blue-300 dark:text-blue-400 font-medium flex-shrink-0">
              {keyName}:
            </span>
          )}
          <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
            {isArray ? '[' : '{'}
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-xs">
            {isArray ? `${value.length} items` : `${Object.keys(value).length} keys`}
          </span>
          <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
            {isArray ? ']' : '}'}
          </span>
        </span>
      </div>
      {isExpanded && hasChildren && (
        <div className="ml-2">
          {isArray
            ? value.map((item: any, index: number) => (
                <JsonNode
                  key={index}
                  keyName={String(index)}
                  value={item}
                  level={level + 1}
                  path={`${path}[${index}]`}
                />
              ))
            : Object.entries(value).map(([key, val]) => (
                <JsonNode
                  key={key}
                  keyName={key}
                  value={val}
                  level={level + 1}
                  path={`${path}.${key}`}
                />
              ))}
        </div>
      )}
    </div>
  );
};

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title,
  defaultExpanded = true,
  maxHeight = '400px',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  }, [data]);

  if (!data) {
    return null;
  }

  return (
    <div className={`bg-gray-900 dark:bg-gray-950 rounded-lg border border-gray-700 dark:border-gray-800 flex flex-col ${className}`}>
      <div className="flex items-center justify-between p-3 border-b border-gray-700 dark:border-gray-800 flex-shrink-0">
        <h4 className="text-sm font-semibold text-gray-200 dark:text-gray-300 truncate pr-2">
          {title || 'JSON Data'}
        </h4>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md hover:bg-gray-800 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-200 dark:hover:text-gray-100 transition-colors flex-shrink-0"
          title="Copy JSON"
          aria-label="Copy JSON"
        >
          {copied ? (
            <Check size={16} className="text-green-400" />
          ) : (
            <Copy size={16} />
          )}
        </button>
      </div>
      <div
        className="p-3 overflow-auto font-mono text-xs flex-1"
        style={{ maxHeight }}
      >
        <JsonNode keyName={null} value={data} level={0} path="" />
      </div>
    </div>
  );
};

export default JsonViewer;

