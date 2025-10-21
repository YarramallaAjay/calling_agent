'use client';

import { HelpRequest } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface RequestCardProps {
  request: HelpRequest;
  onResolve: (requestId: string, response: string) => Promise<void>;
}

export function RequestCard({ request, onResolve }: RequestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim()) return;

    setIsSubmitting(true);
    try {
      await onResolve(request.id, response);
      setResponse('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Error resolving request:', error);
      alert('Failed to resolve request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      unresolved: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusColors[request.status]
        }`}
      >
        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
      </span>
    );
  };

  const timeAgo = request.createdAt
    ? formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true })
    : 'Unknown time';

  return (
    <div className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {getStatusBadge()}
            <span className="text-sm text-gray-500">{timeAgo}</span>
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {request.question}
          </h3>

          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium">Caller:</span>{' '}
              {request.callerName || 'Unknown'}
            </p>
            <p>
              <span className="font-medium">Phone:</span> {request.callerPhone}
            </p>
            {request.context && (
              <p>
                <span className="font-medium">Context:</span> {request.context}
              </p>
            )}
          </div>
        </div>
      </div>

      {request.status === 'pending' && (
        <div className="mt-4">
          {!isExpanded ? (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Respond to Request
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4">
              <label
                htmlFor="response"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Response
              </label>
              <textarea
                id="response"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type your answer here..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                required
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send & Resolve'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    setResponse('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {request.status === 'resolved' && request.supervisorResponse && (
        <div className="mt-4 p-3 bg-green-50 rounded-md">
          <p className="text-sm font-medium text-green-900 mb-1">Response:</p>
          <p className="text-sm text-green-700">{request.supervisorResponse}</p>
        </div>
      )}
    </div>
  );
}
