import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { EstateMap, EstateMapCaption } from '@/components/estate/EstateMap';

export default function OrgansPage() {
  const { data: organs, isLoading, error } = useQuery({ queryKey: ['organs'], queryFn: () => api.organs.list() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organs</h1>
        <p className="mt-1 text-gray-500">
          The services of the estate, by layer. Each one draws its methods from this registry: natively at runtime, or
          as a mirror of doctrines whose source still lives in the organ&rsquo;s repo.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-32" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-64 text-red-600">
          <AlertCircle className="h-6 w-6 mr-2" />
          Failed to load organs
        </div>
      )}

      {organs && (
        <div className="card p-5">
          <EstateMap organs={organs} compact={false} />
          <div className="mt-4 pt-3 border-t border-gray-100">
            <EstateMapCaption />
          </div>
        </div>
      )}
    </div>
  );
}
