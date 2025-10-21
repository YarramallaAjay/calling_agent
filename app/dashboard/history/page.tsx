'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { HelpRequest } from '@/lib/types';
import { RequestCard } from '@/components/dashboard/RequestCard';

type FilterType = 'all' | 'resolved' | 'unresolved';

export default function HistoryPage() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    // Real-time listener for historical requests
    let q;
    if (filter === 'all') {
      q = query(
        collection(db, 'helpRequests'),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'helpRequests'),
        where('status', '==', filter),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const historicalRequests = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as HelpRequest[];

        setRequests(historicalRequests);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching historical requests:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filter]);

  const stats = {
    total: requests.length,
    resolved: requests.filter((r) => r.status === 'resolved').length,
    unresolved: requests.filter((r) => r.status === 'unresolved').length,
    pending: requests.filter((r) => r.status === 'pending').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Request History</h2>
        <p className="mt-1 text-sm text-gray-600">
          View all help requests and their status
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Requests
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.total}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Resolved
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">
              {stats.resolved}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Pending
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-yellow-600">
              {stats.pending}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Unresolved
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-red-600">
              {stats.unresolved}
            </dd>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setFilter('all')}
              className={`${
                filter === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`${
                filter === 'resolved'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Resolved ({stats.resolved})
            </button>
            <button
              onClick={() => setFilter('unresolved')}
              className={`${
                filter === 'unresolved'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Unresolved ({stats.unresolved})
            </button>
          </nav>
        </div>
      </div>

      {/* Request List */}
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
            <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No requests</h3>
          <p className="mt-1 text-sm text-gray-500">
            No requests match the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onResolve={async () => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
