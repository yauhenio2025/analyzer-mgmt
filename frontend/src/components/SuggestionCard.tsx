/**
 * SuggestionCard - A single collapsible suggestion card with edit/accept/dismiss actions
 */

import { useState } from 'react';
import { Check, X, Edit2, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import type { StructuredSuggestion } from '@/types';
import clsx from 'clsx';

interface SuggestionCardProps {
  suggestion: StructuredSuggestion;
  index: number;
  onAccept: (suggestion: StructuredSuggestion, editedContent?: string) => void;
  onDismiss: (suggestion: StructuredSuggestion) => void;
  onConnectionClick?: (connection: string) => void;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600 bg-green-50';
  if (confidence >= 0.6) return 'text-amber-600 bg-amber-50';
  return 'text-gray-600 bg-gray-50';
}

export default function SuggestionCard({
  suggestion,
  index,
  onAccept,
  onDismiss,
  onConnectionClick,
}: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(suggestion.content);

  const confidencePercent = Math.round(suggestion.confidence * 100);
  const confidenceColor = getConfidenceColor(suggestion.confidence);

  const handleAccept = () => {
    if (isEditing && editedContent !== suggestion.content) {
      onAccept(suggestion, editedContent);
    } else {
      onAccept(suggestion);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedContent(suggestion.content);
    setExpanded(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(suggestion.content);
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Header - always visible */}
      <div
        className={clsx(
          'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors',
          expanded && 'border-b border-gray-100'
        )}
        onClick={() => !isEditing && setExpanded(!expanded)}
      >
        <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
        <span className="flex-1 font-medium text-gray-900 truncate">
          {suggestion.title}
        </span>
        <span className={clsx('text-xs px-2 py-0.5 rounded', confidenceColor)}>
          {confidencePercent}%
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {/* Content - editable or static */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Content
            </label>
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="mt-1 w-full p-2 text-sm border border-primary-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                autoFocus
              />
            ) : (
              <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm text-gray-700">
                {suggestion.content}
              </div>
            )}
          </div>

          {/* Rationale */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Why
            </label>
            <p className="mt-1 text-sm text-gray-600 italic">
              {suggestion.rationale}
            </p>
          </div>

          {/* Connections */}
          {suggestion.connections && suggestion.connections.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Related
              </label>
              <div className="mt-1 flex flex-wrap gap-1">
                {suggestion.connections.map((conn) => (
                  <button
                    key={conn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onConnectionClick?.(conn);
                    }}
                    className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  >
                    {conn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccept}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  Accept Edit
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit();
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(suggestion);
                  }}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Dismiss
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccept();
                  }}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  Accept
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
