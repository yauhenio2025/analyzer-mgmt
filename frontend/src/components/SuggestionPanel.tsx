/**
 * SuggestionPanel - A floating panel displaying AI suggestions with accept/dismiss/edit actions
 *
 * Features:
 * - Collapsible suggestion cards
 * - Edit-in-place before accepting
 * - Accept/Dismiss per suggestion
 * - Accept All / Clear All buttons
 * - Summary section
 */

import { useState, useMemo } from 'react';
import { X, Sparkles, CheckCheck, Trash2 } from 'lucide-react';
import type { StructuredSuggestion, SuggestionResponse } from '@/types';
import SuggestionCard from './SuggestionCard';

interface SuggestionPanelProps {
  response: SuggestionResponse;
  fieldLabel: string;
  onAccept: (suggestion: StructuredSuggestion, editedContent?: string) => void;
  onDismiss: (suggestion: StructuredSuggestion) => void;
  onDismissAll: () => void;
  onAcceptAll: () => void;
  onClose: () => void;
  onConnectionClick?: (connection: string) => void;
}

export default function SuggestionPanel({
  response,
  fieldLabel,
  onAccept,
  onDismiss,
  onDismissAll,
  onAcceptAll,
  onClose,
  onConnectionClick,
}: SuggestionPanelProps) {
  // Filter to show only pending suggestions
  const pendingSuggestions = useMemo(
    () => response.suggestions.filter((s) => s.status === 'pending' || !s.status),
    [response.suggestions]
  );

  const suggestionCount = pendingSuggestions.length;

  if (suggestionCount === 0) {
    return (
      <div className="bg-white border border-purple-200 rounded-lg shadow-lg overflow-hidden">
        <div className="px-4 py-3 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-purple-900">AI Suggestions</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-purple-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-purple-600" />
          </button>
        </div>
        <div className="p-6 text-center text-gray-500">
          <p>No suggestions available.</p>
          {response.analysis_summary && (
            <p className="mt-2 text-sm italic">{response.analysis_summary}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-purple-200 rounded-lg shadow-lg overflow-hidden max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-purple-50 border-b border-purple-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <span className="font-semibold text-purple-900">
            AI Suggestions for {fieldLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-purple-100 rounded-md transition-colors"
          title="Close panel"
        >
          <X className="h-5 w-5 text-purple-600" />
        </button>
      </div>

      {/* Subheader with count and bulk actions */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <span className="text-sm text-gray-600">
          {suggestionCount} suggestion{suggestionCount !== 1 ? 's' : ''} found
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onAcceptAll}
            className="text-sm px-3 py-1 text-green-700 hover:bg-green-50 rounded-md transition-colors flex items-center gap-1"
          >
            <CheckCheck className="h-4 w-4" />
            Accept All
          </button>
          <button
            onClick={onDismissAll}
            className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Scrollable suggestion cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pendingSuggestions.map((suggestion, index) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            index={index}
            onAccept={onAccept}
            onDismiss={onDismiss}
            onConnectionClick={onConnectionClick}
          />
        ))}
      </div>

      {/* Summary footer */}
      {response.analysis_summary && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Summary:</span> {response.analysis_summary}
          </p>
        </div>
      )}
    </div>
  );
}
