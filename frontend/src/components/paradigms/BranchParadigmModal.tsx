import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, GitBranch, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Paradigm, BranchRequest } from '@/types';

interface BranchParadigmModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentParadigm: Paradigm;
  onBranchCreated: (branchKey: string) => void;
}

export default function BranchParadigmModal({
  isOpen,
  onClose,
  parentParadigm,
  onBranchCreated,
}: BranchParadigmModalProps) {
  const [name, setName] = useState('');
  const [synthesisPrompt, setSynthesisPrompt] = useState('');
  const [additionalThinkers, setAdditionalThinkers] = useState('');

  const createBranchMutation = useMutation({
    mutationFn: (data: BranchRequest) =>
      api.paradigms.createBranch(parentParadigm.paradigm_key, data),
    onSuccess: (response) => {
      onBranchCreated(response.paradigm_key);
      onClose();
      // Reset form
      setName('');
      setSynthesisPrompt('');
      setAdditionalThinkers('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !synthesisPrompt.trim()) return;

    createBranchMutation.mutate({
      name: name.trim(),
      synthesis_prompt: synthesisPrompt.trim(),
      additional_thinkers: additionalThinkers.trim() || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Create Paradigm Branch
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Parent info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Branching from:</span>{' '}
              {parentParadigm.paradigm_name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Guiding thinkers: {parentParadigm.guiding_thinkers}
            </p>
          </div>

          {/* Name field */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New Paradigm Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Feminist Marxism"
              className="input w-full"
              required
            />
          </div>

          {/* Synthesis prompt */}
          <div>
            <label
              htmlFor="synthesis"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Synthesis Direction <span className="text-red-500">*</span>
            </label>
            <textarea
              id="synthesis"
              value={synthesisPrompt}
              onChange={(e) => setSynthesisPrompt(e.target.value)}
              placeholder="Describe how to synthesize this new paradigm. e.g., 'Integrate feminist theory and gender analysis to examine how patriarchal structures intersect with class relations and capital accumulation.'"
              className="input w-full h-32 resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This guides the AI in generating coherent content that synthesizes the parent paradigm with your new direction.
            </p>
          </div>

          {/* Additional thinkers */}
          <div>
            <label
              htmlFor="thinkers"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Additional Guiding Thinkers
            </label>
            <input
              type="text"
              id="thinkers"
              value={additionalThinkers}
              onChange={(e) => setAdditionalThinkers(e.target.value)}
              placeholder="e.g., Silvia Federici, Nancy Fraser"
              className="input w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional. If not provided, inherits from parent paradigm.
            </p>
          </div>

          {/* Error display */}
          {createBranchMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                {createBranchMutation.error instanceof Error
                  ? createBranchMutation.error.message
                  : 'Failed to create branch'}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={createBranchMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={
                !name.trim() ||
                !synthesisPrompt.trim() ||
                createBranchMutation.isPending
              }
            >
              {createBranchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Create Branch
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
