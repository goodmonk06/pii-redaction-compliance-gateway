'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: {
    redactionRuns: number;
  };
  detectionRules: Array<{
    id: string;
    type: string;
    fieldPattern: string;
    enabled: boolean;
  }>;
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles`);
      if (!response.ok) throw new Error('Failed to fetch profiles');
      const data = await response.json();
      setProfiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const deleteProfile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete profile');
      fetchProfiles();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Redaction Profiles</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage your PII detection and redaction rules
          </p>
        </div>
        <a
          href="/profiles/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          + New Profile
        </a>
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">No profiles created yet</p>
          <a
            href="/profiles/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Create Your First Profile
          </a>
        </div>
      ) : (
        <div className="grid gap-6">
          {profiles.map((profile) => (
            <div key={profile.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {profile.name}
                  </h3>
                  {profile.description && (
                    <p className="mt-1 text-sm text-gray-600">{profile.description}</p>
                  )}
                  <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
                    <span>{profile.detectionRules.length} rules</span>
                    <span>{profile._count.redactionRuns} runs</span>
                    <span>
                      Created {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.detectionRules.slice(0, 5).map((rule) => (
                      <span
                        key={rule.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {rule.type}
                      </span>
                    ))}
                    {profile.detectionRules.length > 5 && (
                      <span className="text-xs text-gray-500">
                        +{profile.detectionRules.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => router.push(`/profiles/${profile.id}`)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    View
                  </button>
                  <button
                    onClick={() => deleteProfile(profile.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
