'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { KnowledgeBaseEntry } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Real-time listener for knowledge base entries
    const q = query(
      collection(db, 'knowledgeBase'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const kbEntries = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as KnowledgeBaseEntry[];

        setEntries(kbEntries);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching knowledge base:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredEntries = entries.filter(
    (entry) =>
      entry.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Learned Answers</h2>
        <p className="mt-1 text-sm text-gray-600">
          Knowledge base built from supervisor responses
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Total Learned Answers
            </h3>
            <p className="mt-1 text-3xl font-semibold text-blue-600">
              {entries.length}
            </p>
          </div>
          <svg
            className="h-16 w-16 text-blue-600 opacity-20"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search questions and answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600">
            Found {filteredEntries.length} result{filteredEntries.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Knowledge Base Entries */}
      {filteredEntries.length === 0 ? (
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
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchQuery ? 'No results found' : 'No learned answers yet'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery
              ? 'Try a different search term'
              : 'When you resolve help requests, they will be added here automatically'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex-1">
                  {entry.question}
                </h3>
                <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Learned
                </span>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700">{entry.answer}</p>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  {entry.learnedFromRequestId && (
                    <span>
                      From request:{' '}
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {entry.learnedFromRequestId.substring(0, 8)}...
                      </code>
                    </span>
                  )}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex gap-1">
                      {entry.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span>
                  {entry.createdAt
                    ? formatDistanceToNow(
                        typeof entry.createdAt === 'string'
                          ? new Date(entry.createdAt)
                          : new Date(entry.createdAt.toDate()),
                        {
                          addSuffix: true,
                        }
                      )
                    : 'Unknown time'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
