import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Target,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  BookOpen,
  Eye,
  Workflow,
  Sparkles,
  Pencil,
  Save,
  X,
  Trash2,
  Plus,
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
// Reusable form sub-components
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

  // Sync external changes
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
// Main component
// ---------------------------------------------------------------------------

export default function ObjectiveDetailPage() {
  const router = useRouter();
  const { key } = router.query;
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AnalysisObjective | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), type === 'success' ? 3000 : 5000);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['objective', key],
    queryFn: async () => {
      const res = await fetch(`${ANALYZER_V2_URL}/v1/objectives/${key}`);
      if (!res.ok) throw new Error('Failed to fetch objective');
      return res.json() as Promise<AnalysisObjective>;
    },
    enabled: !!key,
  });

  // Sync form state from fetched data
  useEffect(() => {
    if (data && !editing) {
      setForm(structuredClone(data));
    }
  }, [data, editing]);

  const updateMutation = useMutation({
    mutationFn: async (payload: AnalysisObjective) => {
      const res = await fetch(`${ANALYZER_V2_URL}/v1/objectives/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Failed to save objective');
      }
      return res.json() as Promise<AnalysisObjective>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objective', key] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      setEditing(false);
      showFeedback('success', 'Objective saved successfully.');
    },
    onError: (err: Error) => {
      showFeedback('error', err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${ANALYZER_V2_URL}/v1/objectives/${key}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Failed to delete objective');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      router.push('/objectives');
    },
    onError: (err: Error) => {
      setShowDeleteConfirm(false);
      showFeedback('error', err.message);
    },
  });

  const handleSave = () => {
    if (form) {
      updateMutation.mutate(form);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    if (data) setForm(structuredClone(data));
  };

  const startEditing = () => {
    if (data) setForm(structuredClone(data));
    setEditing(true);
  };

  const updateField = <K extends keyof AnalysisObjective>(field: K, value: AnalysisObjective[K]) => {
    if (form) setForm({ ...form, [field]: value });
  };

  // -- Loading / Error states ------------------------------------------------

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load objective
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  const d = editing && form ? form : data;

  // -- Render ----------------------------------------------------------------

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

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">
            Permanently delete <strong>{data.objective_name}</strong>? This cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
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
              {editing ? (
                <input
                  type="text"
                  value={d.objective_name}
                  onChange={(e) => updateField('objective_name', e.target.value)}
                  className="text-2xl font-bold text-gray-900 border-b-2 border-indigo-300 focus:border-indigo-500 outline-none bg-transparent"
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">
                  {d.objective_name}
                </h1>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Key: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{d.objective_key}</code>
              {d.baseline_workflow_key && (
                <>
                  {' \u2022 '}Baseline:{' '}
                  <Link
                    href={`/workflows/${d.baseline_workflow_key}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {d.baseline_workflow_key}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEditing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tags (view or edit) */}
      {editing ? (
        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Engine Functions
            </label>
            <CommaSeparatedInput
              value={d.preferred_engine_functions}
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
              value={d.preferred_categories}
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
              value={d.preferred_views}
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
              value={d.baseline_workflow_key || ''}
              onChange={(e) => updateField('baseline_workflow_key', e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="(none)"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {d.preferred_engine_functions.map((fn) => (
            <span key={fn} className="badge bg-indigo-100 text-indigo-800 text-sm px-3 py-1">
              function: {fn}
            </span>
          ))}
          {d.preferred_categories.map((cat) => (
            <span key={cat} className="badge bg-gray-100 text-gray-700 text-sm px-3 py-1">
              category: {cat}
            </span>
          ))}
        </div>
      )}

      {/* Primary Goals */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          Primary Goals
        </h2>
        {editing ? (
          <ListEditor
            items={d.primary_goals}
            onChange={(items) => updateField('primary_goals', items)}
            placeholder="Describe a goal..."
          />
        ) : (
          <ol className="space-y-2">
            {d.primary_goals.map((goal, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                  {i + 1}
                </span>
                {goal}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Quality Criteria */}
      {(editing || d.quality_criteria.length > 0) && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Quality Criteria
          </h2>
          {editing ? (
            <ListEditor
              items={d.quality_criteria}
              onChange={(items) => updateField('quality_criteria', items)}
              placeholder="Describe a quality criterion..."
            />
          ) : (
            <ul className="space-y-2">
              {d.quality_criteria.map((criterion, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                  {criterion}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Expected Deliverables */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <BookOpen className="h-5 w-5 text-amber-500" />
          Expected Deliverables
        </h2>
        {editing ? (
          <ListEditor
            items={d.expected_deliverables}
            onChange={(items) => updateField('expected_deliverables', items)}
            placeholder="Describe a deliverable..."
          />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {d.expected_deliverables.map((deliverable, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
                {deliverable}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Preferred Views (view mode only -- edit mode is in tags card above) */}
      {!editing && d.preferred_views.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Eye className="h-5 w-5 text-blue-500" />
            Preferred Views
          </h2>
          <div className="flex flex-wrap gap-2">
            {d.preferred_views.map((view) => (
              <Link
                key={view}
                href={`/views?search=${view}`}
                className="badge bg-blue-100 text-blue-800 text-sm px-3 py-1 hover:bg-blue-200 transition-colors"
              >
                {view}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Planner Strategy */}
      {(editing || d.planner_strategy) && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Workflow className="h-5 w-5 text-purple-500" />
            Planner Strategy
          </h2>
          {editing ? (
            <textarea
              value={d.planner_strategy}
              onChange={(e) => updateField('planner_strategy', e.target.value)}
              rows={20}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
              placeholder="Enter planner strategy..."
            />
          ) : (
            <div className="prose prose-sm max-w-none text-gray-700">
              <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-sm font-mono">
                {d.planner_strategy}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
