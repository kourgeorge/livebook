import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { type ParsedPdf, PdfChapter } from '../services/pdfService';
import { transformContent } from '../services/contentTransformService';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPdf, setParsedPdf] = useState<ParsedPdf | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<{ page: number; totalPages: number; percentage: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [editedChapters, setEditedChapters] = useState<PdfChapter[]>([]);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'live'>('edit');
  const [editorValue, setEditorValue] = useState<string>(''); // Local state for editor
  const [formattingChapterIndex, setFormattingChapterIndex] = useState<number | null>(null);
  const [formatAllProgress, setFormatAllProgress] = useState<{ current: number; total: number } | null>(null);
  const [bookName, setBookName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const renderTaskRef = useRef<any>(null);

  const handleFileSelect = async (file: File) => {
    const fileName = file.name.toLowerCase();
    
    if (!fileName.endsWith('.pdf')) {
      setError('Please select a valid PDF (.pdf) file');
      return;
    }

    setError(null);
    // Just set the file - don't parse yet
    setSelectedFile(file);
    // Reset parsed data
    setParsedPdf(null);
    setEditedChapters([]);
    setSelectedChapterIndex(0);
    // Initialize book name from filename
    setBookName(file.name.replace('.pdf', '').replace('.PDF', ''));
  };

  const handleExtractText = async () => {
    if (!selectedFile) {
      setError('No file selected');
      return;
    }

    setError(null);
    setIsParsing(true);
    setExtractionProgress(null);

    try {
      // Send PDF to server for extraction with Server-Sent Events
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to start PDF extraction');
      }

      // Read Server-Sent Events stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to read response stream');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                // Update progress
                setExtractionProgress({
                  page: data.page,
                  totalPages: data.totalPages,
                  percentage: data.percentage,
                });
              } else if (data.type === 'complete') {
                // Extraction complete
                const parsed: ParsedPdf = {
                  metadata: data.metadata,
                  chapters: data.chapters,
                };

                setParsedPdf(parsed);
                // Sort chapters by order to ensure correct display order
                const chapters = parsed.chapters
                  .map((ch) => ({ ...ch }))
                  .sort((a, b) => a.order - b.order);
                setEditedChapters(chapters);
                setSelectedChapterIndex(0);
                // Update book name from PDF metadata only if it has a valid title
                // Otherwise preserve the existing book name (set from filename)
                const pdfTitle = parsed.metadata.title?.trim();
                const hasValidPdfTitle = pdfTitle && pdfTitle.length > 0 && pdfTitle.toLowerCase() !== 'untitled';
                if (hasValidPdfTitle) {
                  setBookName(pdfTitle);
                }
                // If no valid PDF title, keep the existing bookName (from filename)
                // Set initial editor value
                if (chapters.length > 0) {
                  setEditorValue(chapters[0].content);
                }
                setExtractionProgress(null);
                setIsParsing(false);
                return;
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Failed to extract text from PDF');
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Parsing error:', err);
      setError(err.message || 'Failed to extract text from PDF. Please try again.');
      setIsParsing(false);
      setExtractionProgress(null);
    }
  };

  // Load PDF document for viewer
  useEffect(() => {
    const loadPdf = async () => {
      if (!selectedFile) return;
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };
    loadPdf();
  }, [selectedFile]);

  // Render PDF page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current) return;

      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

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

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        
        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (error: any) {
        // Ignore cancellation errors
        if (error?.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', error);
        }
        renderTaskRef.current = null;
      }
    };

    renderPage();

    // Cleanup: cancel render task on unmount or when dependencies change
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDocument, currentPage]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Update editor value when chapter changes
  useEffect(() => {
    if (editedChapters.length > 0 && selectedChapterIndex >= 0 && selectedChapterIndex < editedChapters.length) {
      const chapter = editedChapters[selectedChapterIndex];
      if (chapter) {
        setEditorValue(chapter.content);
      }
    }
  }, [selectedChapterIndex, editedChapters]);

  // Debounced content change handler to improve performance
  const handleChapterContentChange = useCallback((newContent: string) => {
    // Update editor value immediately for responsive UI
    setEditorValue(newContent);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Use longer debounce for large content to reduce heavy re-renders
    // Large content causes MDEditor to be very slow, so we debounce more aggressively
    const debounceTime = newContent.length > 50000 ? 1000 : newContent.length > 20000 ? 600 : 300;
    
    // Debounce the state update to avoid blocking on large content
    debounceTimerRef.current = setTimeout(() => {
      // Use requestIdleCallback for non-critical updates if available
      const updateState = () => {
        setEditedChapters((prev) =>
          prev.map((ch, idx) =>
            idx === selectedChapterIndex ? { ...ch, content: newContent } : ch
          )
        );
      };
      
      // For large content, defer to idle callback to avoid blocking
      if (newContent.length > 50000 && 'requestIdleCallback' in window) {
        requestIdleCallback(updateState, { timeout: 2000 });
      } else {
        updateState();
      }
    }, debounceTime);
  }, [selectedChapterIndex]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChapterTitleChange = (newTitle: string) => {
    setEditedChapters((prev) =>
      prev.map((ch, idx) =>
        idx === selectedChapterIndex ? { ...ch, title: newTitle } : ch
      )
    );
  };

  const handleDeleteChapter = (chapterIndex: number) => {
    if (editedChapters.length <= 1) {
      setError('Cannot delete the last chapter. A book must have at least one chapter.');
      return;
    }

    // Confirm deletion
    const chapterTitle = editedChapters[chapterIndex]?.title || `Chapter ${chapterIndex + 1}`;
    if (!window.confirm(`Are you sure you want to delete "${chapterTitle}"?`)) {
      return;
    }

    // Remove the chapter and update order fields
    const newChapters = editedChapters
      .filter((_, idx) => idx !== chapterIndex)
      .map((chapter, idx) => ({ ...chapter, order: idx }));
    setEditedChapters(newChapters);

    // Adjust selected chapter index
    if (chapterIndex < selectedChapterIndex) {
      // Deleted chapter was before the selected one, no change needed
      setSelectedChapterIndex(selectedChapterIndex - 1);
    } else if (chapterIndex === selectedChapterIndex) {
      // Deleted the currently selected chapter
      // Select the previous chapter, or the first one if we deleted the first
      const newIndex = chapterIndex > 0 ? chapterIndex - 1 : 0;
      setSelectedChapterIndex(newIndex);
      // Update editor value
      if (newChapters[newIndex]) {
        setEditorValue(newChapters[newIndex].content);
      }
    }
    // If deleted chapter was after selected, no index adjustment needed

    setError(null);
  };

  const handleFormatChapter = async (chapterIndex: number) => {
    if (!editedChapters[chapterIndex]) {
      setError('Chapter not found');
      return;
    }

    const chapter = editedChapters[chapterIndex];
    if (!chapter.content || chapter.content.trim().length === 0) {
      setError('Chapter has no content to format');
      return;
    }

    setFormattingChapterIndex(chapterIndex);
    setError(null);

    try {
      // Use 'friendly' format as a general formatting option
      // This will improve readability while maintaining all content
      const formattedContent = await transformContent(chapter.content, 'friendly');
      
      setEditedChapters((prev) =>
        prev.map((ch, idx) =>
          idx === chapterIndex 
            ? { ...ch, content: formattedContent }
            : ch
        )
      );

      // Update editor value if this is the currently selected chapter
      if (chapterIndex === selectedChapterIndex) {
        setEditorValue(formattedContent);
      }
    } catch (err: any) {
      console.error('Error formatting chapter:', err);
      setError(err.message || 'Failed to format chapter. Please try again.');
    } finally {
      setFormattingChapterIndex(null);
    }
  };

  const handleFormatAllChapters = async () => {
    if (editedChapters.length === 0) {
      setError('No chapters to format');
      return;
    }

    setError(null);
    // Use -1 to indicate all chapters are being formatted
    setFormattingChapterIndex(-1);
    const totalChapters = editedChapters.filter(ch => ch.content && ch.content.trim().length > 0).length;
    setFormatAllProgress({ current: 0, total: totalChapters });

    try {
      const formattedChapters = [...editedChapters];
      let completedCount = 0;
      
      // Format each chapter sequentially
      for (let i = 0; i < formattedChapters.length; i++) {
        const chapter = formattedChapters[i];
        if (!chapter.content || chapter.content.trim().length === 0) {
          continue; // Skip empty chapters
        }

        try {
          setFormatAllProgress({ current: completedCount + 1, total: totalChapters });
          const formattedContent = await transformContent(chapter.content, 'friendly');
          formattedChapters[i] = { ...chapter, content: formattedContent };
          completedCount++;
          
          // Update state progressively so user can see progress
          setEditedChapters([...formattedChapters]);
          
          // Update editor if this is the selected chapter
          if (i === selectedChapterIndex) {
            setEditorValue(formattedContent);
          }
        } catch (err: any) {
          console.error(`Error formatting chapter ${i + 1}:`, err);
          // Continue with other chapters even if one fails
          completedCount++;
        }
      }
    } catch (err: any) {
      console.error('Error formatting chapters:', err);
      setError(err.message || 'Failed to format some chapters. Please try again.');
    } finally {
      setFormattingChapterIndex(null);
      setFormatAllProgress(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !parsedPdf) {
      setError('Missing file or parsed book data');
      return;
    }

    if (!bookName || bookName.trim().length === 0) {
      setError('Please enter a book name');
      return;
    }

    setIsUploading(true);
    try {
      // Update metadata with the book name
      const updatedMetadata = {
        ...parsedPdf.metadata,
        title: bookName.trim(),
      };

      const formData = new FormData();
      formData.append('pdf', selectedFile);
      formData.append('fileType', 'pdf');
      formData.append('metadata', JSON.stringify(updatedMetadata));
      formData.append('chapters', JSON.stringify(editedChapters));

      const response = await fetch('/api/upload-book', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload book');
      }

      const result = await response.json();

      if (result.success && result.bookId) {
        navigate(`/book/${result.bookId}`);
      } else {
        throw new Error('Upload failed: No book ID returned');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload book. Please try again.');
      setIsUploading(false);
    }
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

  const currentChapter = editedChapters[selectedChapterIndex] || null;

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <div className="w-full px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div>
            <button
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-900 transition-colors flex items-center mb-2"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Home
            </button>
            <h1 className="text-2xl font-serif font-bold text-ink">Upload & Format Book</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Upload a PDF book to format and add it to your library
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 overflow-hidden">
        <div className="bg-white rounded-xl shadow-2xl w-full h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1">
                {selectedFile && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Book Name
                    </label>
                    <input
                      type="text"
                      value={bookName}
                      onChange={(e) => setBookName(e.target.value)}
                      placeholder={selectedFile ? selectedFile.name.replace('.pdf', '') : "Enter book name"}
                      className="w-full max-w-md px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              {!selectedFile && (
                <>
                  <button
                    onClick={handleUploadClick}
                    className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
                  >
                    Upload Book
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </>
              )}
              {selectedFile && !parsedPdf && !isParsing && (
                <button
                  onClick={handleExtractText}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Extract Text to Markdown
                </button>
              )}
              {selectedFile && parsedPdf && !isParsing && (
                <>
                  <button
                    onClick={handleFormatAllChapters}
                    disabled={formattingChapterIndex !== null || isUploading || editedChapters.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    title="Format all chapters using LLM to improve readability"
                  >
                    {formattingChapterIndex === -1 ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>
                          {formatAllProgress 
                            ? `Formatting... (${formatAllProgress.current}/${formatAllProgress.total})`
                            : 'Formatting All...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        <span>Format All Chapters</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isUploading || formattingChapterIndex !== null}
                    className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : 'Import Book'}
                  </button>
                </>
              )}
              {isParsing && (
                <div className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>
                    {extractionProgress 
                      ? `Extracting... ${extractionProgress.percentage}% (Page ${extractionProgress.page}/${extractionProgress.totalPages})`
                      : 'Extracting text...'}
                  </span>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Main Content - Side by Side Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Side - PDF Viewer */}
            <div className="w-1/2 border-r border-gray-200 flex flex-col bg-gray-50">
              <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">PDF Viewer</h3>
                {selectedFile && totalPages > 0 && (
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
                )}
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                {selectedFile && pdfDocument ? (
                  <canvas
                    ref={canvasRef}
                    className="max-w-full shadow-lg border border-gray-300"
                    style={{ maxHeight: '100%' }}
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <svg
                      className="w-24 h-24 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-lg font-medium">No PDF loaded</p>
                    <p className="text-sm mt-2">Click "Upload Book" to select a PDF file</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Markdown Editor */}
            <div className="w-1/2 flex flex-col">
              {selectedFile && parsedPdf && currentChapter ? (
                <>
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
                      <button
                        onClick={() => handleFormatChapter(selectedChapterIndex)}
                        disabled={formattingChapterIndex !== null || !currentChapter?.content}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        title="Format this chapter using LLM to improve readability"
                      >
                        {formattingChapterIndex === selectedChapterIndex || (formattingChapterIndex === -1 && formatAllProgress) ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>
                              {formattingChapterIndex === -1 && formatAllProgress
                                ? `Formatting All... (${formatAllProgress.current}/${formatAllProgress.total})`
                                : 'Formatting...'}
                            </span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            <span>Format Chapter</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteChapter(selectedChapterIndex)}
                        disabled={formattingChapterIndex !== null || editedChapters.length <= 1}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        title={editedChapters.length <= 1 ? "Cannot delete the last chapter" : "Delete this chapter"}
                      >
                        <svg
                          className="w-4 h-4"
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
                        <span>Delete</span>
                      </button>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={currentChapter.title}
                        onChange={(e) => handleChapterTitleChange(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Chapter title"
                      />
                      <div className="flex items-center space-x-1 bg-white border border-gray-300 rounded-lg p-1">
                        <button
                          onClick={() => setPreviewMode('edit')}
                          className={`px-3 py-1 text-xs rounded transition-colors ${
                            previewMode === 'edit'
                              ? 'bg-brand-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title="Edit mode"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setPreviewMode('live')}
                          className={`px-3 py-1 text-xs rounded transition-colors ${
                            previewMode === 'live'
                              ? 'bg-brand-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title="Live preview"
                        >
                          Live
                        </button>
                        <button
                          onClick={() => setPreviewMode('preview')}
                          className={`px-3 py-1 text-xs rounded transition-colors ${
                            previewMode === 'preview'
                              ? 'bg-brand-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title="Preview only"
                        >
                          Preview
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden" data-color-mode="light">
                    {previewMode === 'edit' || editorValue.length > 50000 ? (
                      // Use plain textarea for edit mode or large content for better performance
                      <div className="h-full flex flex-col">
                        {editorValue.length > 50000 && (
                          <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-xs text-yellow-800">
                            Using lightweight editor for better performance (content: {editorValue.length.toLocaleString()} chars)
                          </div>
                        )}
                        <textarea
                          value={editorValue}
                          onChange={(e) => {
                            // Direct update for textarea - no debounce needed as it's lighter
                            setEditorValue(e.target.value);
                            // Still debounce the chapter update
                            if (debounceTimerRef.current) {
                              clearTimeout(debounceTimerRef.current);
                            }
                            debounceTimerRef.current = setTimeout(() => {
                              if (editedChapters.length > 0 && selectedChapterIndex >= 0 && selectedChapterIndex < editedChapters.length) {
                                setEditedChapters(prev => {
                                  const updated = [...prev];
                                  updated[selectedChapterIndex] = {
                                    ...updated[selectedChapterIndex],
                                    content: e.target.value
                                  };
                                  return updated;
                                });
                              }
                            }, 1000);
                          }}
                          className="flex-1 w-full p-4 font-mono text-sm border-0 resize-none focus:outline-none"
                          placeholder="Markdown content..."
                        />
                        {previewMode === 'preview' && (
                          <div className="border-t p-4 overflow-auto max-h-96">
                            <MDEditor.Markdown source={editorValue} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <MDEditor
                        value={editorValue}
                        onChange={(value) => handleChapterContentChange(value || '')}
                        preview={previewMode}
                        hideToolbar={false}
                        visibleDragbar={previewMode === 'live'}
                        height="100%"
                        highlightEnable={false}
                        data-color-mode="light"
                      />
                    )}
                  </div>
                  <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
                    <div className="flex justify-between items-center">
                      <div>
                        Chapter {selectedChapterIndex + 1} of {editedChapters.length}
                      </div>
                      <div>
                        {editorValue.length.toLocaleString()} characters
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700">Markdown Editor</h3>
                  </div>
                  <div className="flex-1 overflow-hidden flex items-center justify-center bg-white">
                    {isParsing ? (
                      <div className="text-center">
                        <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600 font-medium">
                          {extractionProgress 
                            ? `Extracting text... ${extractionProgress.percentage}%`
                            : 'Extracting text...'}
                        </p>
                        {extractionProgress && (
                          <p className="text-sm text-gray-500 mt-2">
                            Processing page {extractionProgress.page} of {extractionProgress.totalPages}
                          </p>
                        )}
                      </div>
                    ) : selectedFile && !parsedPdf ? (
                      <div className="text-center text-gray-400">
                        <svg
                          className="w-24 h-24 mx-auto mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <p className="text-lg font-medium">Text not extracted yet</p>
                        <p className="text-sm mt-2">Click "Extract Text to Markdown" to begin</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400">
                        <svg
                          className="w-24 h-24 mx-auto mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <p className="text-lg font-medium">No content loaded</p>
                        <p className="text-sm mt-2">Upload a PDF to start editing</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 border-t border-gray-200 bg-red-50">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;

