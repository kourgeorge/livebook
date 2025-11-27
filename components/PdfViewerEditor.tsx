import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { ParsedPdf, PdfChapter } from '../services/pdfService';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PdfViewerEditorProps {
  pdfFile: File;
  parsedPdf: ParsedPdf;
  onImport: (chapters: PdfChapter[]) => void;
  onCancel: () => void;
}

const PdfViewerEditor: React.FC<PdfViewerEditorProps> = ({
  pdfFile,
  parsedPdf,
  onImport,
  onCancel,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [editedChapters, setEditedChapters] = useState<PdfChapter[]>(
    parsedPdf.chapters.map((ch) => ({ ...ch }))
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentChapter = editedChapters[selectedChapterIndex];

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };
    loadPdf();
  }, [pdfFile]);

  // Render PDF page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current) return;

      try {
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (error) {
        console.error('Error rendering PDF page:', error);
      }
    };

    renderPage();
  }, [pdfDocument, currentPage]);

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

  const handleImport = () => {
    onImport(editedChapters);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
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
            {parsedPdf.metadata.title} by {parsedPdf.metadata.author}
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
        {/* Left Side - PDF Viewer */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col bg-gray-50">
          <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">PDF Viewer</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage <= 1}
                className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-w-full shadow-lg border border-gray-300"
              style={{ maxHeight: '100%' }}
            />
          </div>
        </div>

        {/* Right Side - Markdown Editor */}
        <div className="w-1/2 flex flex-col">
          {/* Chapter Selector */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2 mb-2">
              <label className="text-sm font-semibold text-gray-700">Chapter:</label>
              <select
                value={selectedChapterIndex}
                onChange={(e) => setSelectedChapterIndex(Number(e.target.value))}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {editedChapters.map((chapter, index) => (
                  <option key={chapter.id} value={index}>
                    {chapter.title || `Chapter ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={currentChapter.title}
              onChange={(e) => handleChapterTitleChange(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2"
              placeholder="Chapter title"
            />
            <textarea
              value={currentChapter.description || ''}
              onChange={(e) => handleChapterDescriptionChange(e.target.value)}
              className="w-full px-3 py-2 text-xs text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Short description (used when importing the book)"
              rows={2}
            />
          </div>

          {/* Markdown Editor */}
          <div className="flex-1 overflow-hidden" data-color-mode="light">
            <MDEditor
              value={currentChapter.content}
              onChange={(value) => handleChapterContentChange(value || '')}
              preview="edit"
              hideToolbar={false}
              visibleDragbar={true}
              height="100%"
            />
          </div>

          {/* Footer Info */}
          <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
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
      </div>
    </div>
  );
};

export default PdfViewerEditor;

