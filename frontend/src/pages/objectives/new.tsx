import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Target,
  ArrowLeft,
  Save,
  X,
  Trash2,
  Plus,
  Sparkles,
  CheckCircle,
  BookOpen,
  Workflow,
} from 'lucide-react';

import { ANALYZER_V2_URL } from '@/lib/config';

interface AnalysisObjective {
  objective_key: string;
  objective_name: string;
  primary_goals: string[];
  quality_criteria: string[];
  preferred_engine_functions: string[];
  preferred_categories: string[];
  expected_deliverables: string[];
  baseline_workflow_key: string | null;
  preferred_views: string[];
  planner_strategy: string;
}

// ---------------------------------------------------------------------------
// Reusable form sub-components (same as [key].tsx)
// ---------------------------------------------------------------------------

function ListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const handleUpdate = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([...items, '']);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea
            value={item}
            onChange={(e) => handleUpdate(i, e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
            placeholder={placeholder}
          />
          <button
            onClick={() => handleRemove(i)}
            className="mt-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
            title="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="text-sm text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
      >
        <Plus className="h-3.5 w-3.5" />
        Add item
      </button>
    </div>
  );
}

function CommaSeparatedInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value.join(', '));

  useEffect(() => {
    setText(value.join(', '));
  }, [value]);

  const handleBlur = () => {
    const items = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onChange(items);
  };

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleBlur}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
      placeholder={placeholder}
    />
  );
}

// ---------------------------------------------------------------------------
// Slugify helper
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const EMPTY_OBJECTIVE: AnalysisObjective = {
  objective_key: '',
  objective_name: '',
  primary_goals: [''],
  quality_criteria: [''],
  preferred_engine_functions: [],
  preferred_categories: [],
  expected_deliverables: [''],
  baseline_workflow_key: null,
  preferred_views: [],
  planner_strategy: '',
};

export default function NewObjectivePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<AnalysisObjective>(structuredClone(EMPTY_OBJECTIVE));
  const [keyTouched, setKeyTouched] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-slugify key from name (only if user hasn't manually edited the key)
  useEffect(() => {
    if (!keyTouched && form.objective_name) {
      setForm((prev) => ({ ...prev, objective_key: slugify(prev.objective_name) }));
    }
  }, [form.objective_name, keyTouched]);

  const createMutation = useMutation({
    mutationFn: async (payload: AnalysisObjective) => {
      // Strip empty strings from list fields before sending
      const cleaned: AnalysisObjective = {
        ...payload,
        primary_goals: payload.primary_goals.filter((s) => s.trim()),
        quality_criteria: payload.quality_criteria.filter((s) => s.trim()),
        expected_deliverables: payload.expected_deliverables.filter((s) => s.trim()),
        preferred_engine_functions: payload.preferred_engine_functions.filter((s) => s.trim()),
        preferred_categories: payload.preferred_categories.filter((s) => s.trim()),
        preferred_views: payload.preferred_views.filter((s) => s.trim()),
      };
      const res = await fetch(`${ANALYZER_V2_URL}/v1/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaned),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Failed to create objective');
      }
      return res.json() as Promise<AnalysisObjective>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      router.push(`/objectives/${result.objective_key}`);
    },
    onError: (err: Error) => {
      setFeedback({ type: 'error', message: err.message });
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  const handleSave = () => {
    if (!form.objective_key.trim()) {
      setFeedback({ type: 'error', message: 'Objective key is required.' });
      setTimeout(() => setFeedback(null), 5000);
      return;
    }
    if (!form.objective_name.trim()) {
      setFeedback({ type: 'error', message: 'Objective name is required.' });
      setTimeout(() => setFeedback(null), 5000);
      return;
    }
    createMutation.mutate(form);
  };

  const updateField = <K extends keyof AnalysisObjective>(field: K, value: AnalysisObjective[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`px-4 py-2 rounded-md text-sm border ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/objectives"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-indigo-500" />
              <h1 className="text-2xl font-bold text-gray-900">New Objective</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Define a new analysis objective
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/objectives"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {createMutation.isPending ? 'Creating...' : 'Create Objective'}
          </button>
        </div>
      </div>

      {/* Name and Key */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Objective Name
          </label>
          <input
            type="text"
            value={form.objective_name}
            onChange={(e) => updateField('objective_name', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="e.g. Critical Theory Deep Analysis"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Objective Key
          </label>
          <input
            type="text"
            value={form.objective_key}
            onChange={(e) => {
              setKeyTouched(true);
              updateField('objective_key', e.target.value);
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="auto-generated-from-name"
          />
          <p className="mt-1 text-xs text-gray-400">
            Auto-generated from name. Edit to customize.
          </p>
        </div>
      </div>

      {/* Configuration fields */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Engine Functions
          </label>
          <CommaSeparatedInput
            value={form.preferred_engine_functions}
            onChange={(items) => updateField('preferred_engine_functions', items)}
            placeholder="e.g. critique, genealogy, dialectic"
          />
          <p className="mt-1 text-xs text-gray-400">Comma-separated list</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Categories
          </label>
          <CommaSeparatedInput
            value={form.preferred_categories}
            onChange={(items) => updateField('preferred_categories', items)}
            placeholder="e.g. political_economy, philosophy"
          />
          <p className="mt-1 text-xs text-gray-400">Comma-separated list</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Views
          </label>
          <CommaSeparatedInput
            value={form.preferred_views}
            onChange={(items) => updateField('preferred_views', items)}
            placeholder="e.g. summary, deep_dive"
          />
          <p className="mt-1 text-xs text-gray-400">Comma-separated list</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Baseline Workflow Key
          </label>
          <input
            type="text"
            value={form.baseline_workflow_key || ''}
            onChange={(e) => updateField('baseline_workflow_key', e.target.value || null)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="(optional)"
          />
        </div>
      </div>

      {/* Primary Goals */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          Primary Goals
        </h2>
        <ListEditor
          items={form.primary_goals}
          onChange={(items) => updateField('primary_goals', items)}
          placeholder="Describe a goal..."
        />
      </div>

      {/* Quality Criteria */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Quality Criteria
        </h2>
        <ListEditor
          items={form.quality_criteria}
          onChange={(items) => updateField('quality_criteria', items)}
          placeholder="Describe a quality criterion..."
        />
      </div>

      {/* Expected Deliverables */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <BookOpen className="h-5 w-5 text-amber-500" />
          Expected Deliverables
        </h2>
        <ListEditor
          items={form.expected_deliverables}
          onChange={(items) => updateField('expected_deliverables', items)}
          placeholder="Describe a deliverable..."
        />
      </div>

      {/* Planner Strategy */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Workflow className="h-5 w-5 text-purple-500" />
          Planner Strategy
        </h2>
        <textarea
          value={form.planner_strategy}
          onChange={(e) => updateField('planner_strategy', e.target.value)}
          rows={20}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
          placeholder="Enter planner strategy..."
        />
      </div>
    </div>
  );
}
