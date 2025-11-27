import React, { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { ParsedPdf, PdfChapter } from '../services/pdfService';
import { ParsedEpub, EpubChapter } from '../services/epubService';

type ParsedBook = ParsedPdf | ParsedEpub;
type BookChapter = PdfChapter | EpubChapter;

interface BookUploadReviewProps {
  parsedBook: ParsedBook;
  fileType: 'pdf' | 'epub';
  onImport: (editedChapters: BookChapter[]) => void;
  onCancel: () => void;
}

const BookUploadReview: React.FC<BookUploadReviewProps> = ({
  parsedBook,
  fileType,
  onImport,
  onCancel,
}) => {
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [editedChapters, setEditedChapters] = useState<BookChapter[]>(
    parsedBook.chapters.map((ch) => ({ ...ch }))
  );

  const currentChapter = editedChapters[selectedChapterIndex];
  
  // Safety check: ensure we have a valid chapter
  if (!currentChapter || editedChapters.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-2xl w-full flex items-center justify-center" style={{ height: 'calc(100vh - 12rem)' }}>
        <p className="text-gray-500">No chapters available</p>
      </div>
    );
  }
  
  const originalContent =
    'originalContent' in currentChapter && currentChapter.originalContent
      ? currentChapter.originalContent
      : currentChapter.content;

  const handleChapterContentChange = (newContent: string) => {
    setEditedChapters((prev) =>
      prev.map((ch, idx) =>
        idx === selectedChapterIndex ? { ...ch, content: newContent } : ch
      )
    );
  };

  const handleChapterTitleChange = (newTitle: string) => {
    setEditedChapters((prev) =>
      prev.map((ch, idx) =>
        idx === selectedChapterIndex ? { ...ch, title: newTitle } : ch
      )
    );
  };

  const handleChapterDescriptionChange = (newDescription: string) => {
    setEditedChapters((prev) =>
      prev.map((ch, idx) =>
        idx === selectedChapterIndex ? { ...ch, description: newDescription } : ch
      )
    );
  };

  const handleDeleteChapter = (chapterIndex: number) => {
    if (editedChapters.length <= 1) {
      alert('Cannot delete the last chapter. A book must have at least one chapter.');
      return;
    }

    // Confirm deletion
    const chapterTitle = editedChapters[chapterIndex]?.title || `Chapter ${chapterIndex + 1}`;
    if (!window.confirm(`Are you sure you want to delete "${chapterTitle}"?`)) {
      return;
    }

    // Remove the chapter
    const newChapters = editedChapters.filter((_, idx) => idx !== chapterIndex);
    setEditedChapters(newChapters);

    // Adjust selected chapter index
    if (chapterIndex < selectedChapterIndex) {
      // Deleted chapter was before the selected one
      setSelectedChapterIndex(selectedChapterIndex - 1);
    } else if (chapterIndex === selectedChapterIndex) {
      // Deleted the currently selected chapter
      // Select the previous chapter, or the first one if we deleted the first
      const newIndex = chapterIndex > 0 ? chapterIndex - 1 : 0;
      setSelectedChapterIndex(newIndex);
    }
    // If deleted chapter was after selected, no index adjustment needed
  };

  const handleImport = () => {
    onImport(editedChapters);
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl w-full flex flex-col" style={{ height: 'calc(100vh - 12rem)' }}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Review & Edit Book Content
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {parsedBook.metadata.title} by {parsedBook.metadata.author}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
            >
              Import Book
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chapter List Sidebar */}
          <div className="w-64 border-r border-gray-200 overflow-y-auto bg-gray-50">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Chapters ({editedChapters.length})
              </h3>
              <div className="space-y-1">
                {editedChapters.map((chapter, index) => (
                  <button
                    key={chapter.id}
                    onClick={() => setSelectedChapterIndex(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedChapterIndex === index
                        ? 'bg-brand-100 text-brand-900 border-2 border-brand-500'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-medium text-sm truncate">
                      {chapter.title || `Chapter ${index + 1}`}
                    </div>
                    {chapter.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {chapter.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Split View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Original Content (Left Side) */}
            <div className="w-1/2 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">
                  Original {fileType.toUpperCase()} Content
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-gray-50 p-4 rounded border border-gray-200">
                    {originalContent}
                  </pre>
                </div>
              </div>
            </div>

            {/* Editable Markdown (Right Side) */}
            <div className="w-1/2 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <input
                    type="text"
                    value={currentChapter.title}
                    onChange={(e) => handleChapterTitleChange(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Chapter title"
                  />
                  <button
                    onClick={() => handleDeleteChapter(selectedChapterIndex)}
                    disabled={editedChapters.length <= 1}
                    className="flex-shrink-0 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    title={editedChapters.length <= 1 ? "Cannot delete the last chapter" : "Delete this chapter"}
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span className="whitespace-nowrap">Delete</span>
                  </button>
                </div>
                <textarea
                  value={currentChapter.description || ''}
                  onChange={(e) => handleChapterDescriptionChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Short description (used when importing the book)"
                  rows={2}
                />
              </div>
              <div className="flex-1 overflow-hidden" data-color-mode="light">
                <MDEditor
                  value={currentChapter.content}
                  onChange={(value) =>
                    handleChapterContentChange(value || '')
                  }
                  preview="edit"
                  hideToolbar={false}
                  visibleDragbar={true}
                  height="100%"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
          <div className="flex justify-between items-center">
            <div>
              Chapter {selectedChapterIndex + 1} of {editedChapters.length}
            </div>
            <div>
              {currentChapter.content.length.toLocaleString()} characters
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookUploadReview;

