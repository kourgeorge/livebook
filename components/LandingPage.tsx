import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book } from '../services/bookService';

interface LandingPageProps {
  books: Book[];
  onSelectBook: (bookId: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ books, onSelectBook }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return books;
    }
    const query = searchQuery.toLowerCase();
    return books.filter(
      book =>
        book.metadata.name.toLowerCase().includes(query) ||
        book.metadata.description.toLowerCase().includes(query) ||
        book.metadata.author.toLowerCase().includes(query)
    );
  }, [books, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              L
            </div>
            <h1 className="text-5xl font-serif font-bold text-ink ml-4">LiveBook</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            Discover and explore interactive books with AI-powered assistance
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="inline-flex items-center px-6 py-3 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-md hover:shadow-lg"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Upload Book
          </button>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search books by title, description, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 bg-white shadow-sm"
            />
          </div>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No books found matching your search.</p>
            </div>
          ) : (
            filteredBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => onSelectBook(book.id)}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-200 group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-110 transition-transform">
                      {book.metadata.name.charAt(0)}
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {book.modules.length} chapters
                    </span>
                  </div>
                  <h2 className="text-xl font-serif font-bold text-ink mb-2 group-hover:text-brand-600 transition-colors">
                    {book.metadata.name}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {book.metadata.description}
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>{book.metadata.author}</span>
                  </div>
                </div>
                <div className="px-6 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {book.modules.slice(0, 3).map((module) => (
                      <span
                        key={module.id}
                        className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded"
                      >
                        {module.title.split(':')[0]}
                      </span>
                    ))}
                    {book.modules.length > 3 && (
                      <span className="text-xs text-gray-400 px-2 py-1">
                        +{book.modules.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

