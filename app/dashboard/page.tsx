'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { HelpRequest } from '@/lib/types';
import { RequestCard } from '@/components/dashboard/RequestCard';

export default function DashboardPage() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for pending requests
    const q = query(
      collection(db, 'helpRequests'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const pendingRequests = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as HelpRequest[];

        setRequests(pendingRequests);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching pending requests:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleResolve = async (requestId: string, supervisorResponse: string) => {
    try {
      const response = await fetch(`/api/help-requests/${requestId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supervisorResponse }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve request');
      }

      // Show success message
      console.log('Request resolved successfully');
    } catch (error) {
      console.error('Error resolving request:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading pending requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Pending Requests</h2>
        <p className="mt-1 text-sm text-gray-600">
          Questions from callers that need your help
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No pending requests
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            All caught up! New requests will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
