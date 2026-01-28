import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Users, AlertCircle, ExternalLink, Mail, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Consumer } from '@/types';
import clsx from 'clsx';

const CONSUMER_TYPE_COLORS = {
  service: 'bg-blue-100 text-blue-800',
  cli: 'bg-green-100 text-green-800',
  library: 'bg-purple-100 text-purple-800',
};

function ConsumerCard({ consumer }: { consumer: Consumer }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            <h3 className="text-sm font-semibold text-gray-900">{consumer.name}</h3>
            <span
              className={clsx(
                'badge text-xs capitalize',
                CONSUMER_TYPE_COLORS[consumer.consumer_type as keyof typeof CONSUMER_TYPE_COLORS] ||
                  'badge-gray'
              )}
            >
              {consumer.consumer_type}
            </span>
          </div>

          <div className="mt-2 space-y-1 text-sm text-gray-500">
            {consumer.repo_url && (
              <a
                href={consumer.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary-600"
              >
                <ExternalLink className="h-3 w-3" />
                Repository
              </a>
            )}
            {consumer.contact_email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {consumer.contact_email}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {consumer.dependency_count} dependencies
            </span>
            <span className="flex items-center gap-1 text-sm">
              {consumer.auto_update ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Auto-update</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Manual update</span>
                </>
              )}
            </span>
          </div>
        </div>

        <Link
          href={`/consumers/${consumer.id}`}
          className="btn-secondary text-xs py-1 px-2"
        >
          View
        </Link>
      </div>
    </div>
  );
}

export default function ConsumersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['consumers'],
    queryFn: () => api.consumers.list(),
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load consumers
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consumers</h1>
          <p className="mt-1 text-gray-500">
            Services that depend on analytical definitions
          </p>
        </div>
        <Link href="/consumers/register" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Register Consumer
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-full mt-3" />
              <div className="h-3 bg-gray-200 rounded w-1/3 mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Consumer Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data?.consumers.map((consumer) => (
            <ConsumerCard key={consumer.id} consumer={consumer} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.consumers.length === 0 && (
        <div className="card p-12 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No consumers registered</p>
          <p className="text-sm text-gray-400 mt-1">
            Register your services to track dependencies and receive change notifications
          </p>
          <Link href="/consumers/register" className="btn-primary mt-4">
            Register your first consumer
          </Link>
        </div>
      )}
    </div>
  );
}
