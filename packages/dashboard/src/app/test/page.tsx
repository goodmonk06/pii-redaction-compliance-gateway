'use client';

import { useState, useEffect } from 'react';

interface Profile {
  id: string;
  name: string;
}

interface RedactionResult {
  runId: string;
  redactedData: any;
  stats: {
    totalFields: number;
    redactedFields: number;
    detectionsByType: Record<string, number>;
  };
  detections: Array<{
    field: string;
    type: string;
    confidence: number;
  }>;
}

const sampleData = {
  user: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '555-123-4567',
    ssn: '123-45-6789',
  },
  payment: {
    creditCard: '4532-0151-1283-0366',
    billingAddress: '123 Main Street',
  },
  metadata: {
    ip: '192.168.1.1',
    timestamp: '2024-01-15T10:30:00Z',
  },
};

export default function TestPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [inputData, setInputData] = useState(JSON.stringify(sampleData, null, 2));
  const [result, setResult] = useState<RedactionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles`);
      if (!response.ok) throw new Error('Failed to fetch profiles');
      const data = await response.json();
      setProfiles(data);
      if (data.length > 0) {
        setSelectedProfile(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  };

  const handleRedact = async () => {
    if (!selectedProfile) {
      setError('Please select a profile');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = JSON.parse(inputData);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/profiles/${selectedProfile}/redact`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Redaction failed');
      }

      const resultData = await response.json();
      setResult(resultData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Test Redaction</h2>
        <p className="mt-1 text-sm text-gray-600">
          Test your redaction profiles with sample JSON data
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Profile
          </label>
          <select
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select a profile --</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Input JSON Data
          </label>
          <textarea
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder='{"user": {"email": "test@example.com"}}'
          />
        </div>

        <button
          onClick={handleRedact}
          disabled={loading || !selectedProfile}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Redact Data'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Redacted Output
            </h3>
            <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm font-mono">
              {JSON.stringify(result.redactedData, null, 2)}
            </pre>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Fields</p>
                <p className="text-2xl font-bold text-gray-900">
                  {result.stats.totalFields}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Redacted</p>
                <p className="text-2xl font-bold text-red-600">
                  {result.stats.redactedFields}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Redaction Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.stats.totalFields > 0
                    ? Math.round(
                        (result.stats.redactedFields / result.stats.totalFields) * 100
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>

          {result.detections.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detections</h3>
              <div className="space-y-2">
                {result.detections.map((detection, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded"
                  >
                    <div>
                      <span className="font-mono text-sm text-gray-900">
                        {detection.field}
                      </span>
                      <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {detection.type}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {Math.round(detection.confidence * 100)}% confidence
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
