import React, { useState, useRef } from 'react';
import { parseEpub, type ParsedEpub, EpubChapter } from '../services/epubService';
import { parsePdf, type ParsedPdf, PdfChapter } from '../services/pdfService';
import BookUploadReview from './BookUploadReview';
import PdfViewerEditor from './PdfViewerEditor';

type ParsedBook = ParsedEpub | ParsedPdf;
type BookChapter = PdfChapter | EpubChapter;

interface BookUploadProps {
  onUploadComplete: (bookId: string) => void;
  onCancel: () => void;
}

const BookUpload: React.FC<BookUploadProps> = ({ onUploadComplete, onCancel }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [parsedBook, setParsedBook] = useState<ParsedBook | null>(null);
  const [fileType, setFileType] = useState<'epub' | 'pdf' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    const fileName = file.name.toLowerCase();
    let type: 'epub' | 'pdf' | null = null;
    
    if (fileName.endsWith('.epub')) {
      type = 'epub';
    } else if (fileName.endsWith('.pdf')) {
      type = 'pdf';
    } else {
      setError('Please select a valid EPUB (.epub) or PDF (.pdf) file');
      return;
    }

    setError(null);
    setIsParsing(true);
    setParseProgress(10);
    setFileType(type);
    setSelectedFile(file);

    try {
      // Parse file based on type
      setParseProgress(30);
      let parsed: ParsedBook;
      
      if (type === 'epub') {
        parsed = await parseEpub(file);
      } else {
        // Skip LLM reformatting for PDFs - user will edit manually
        parsed = await parsePdf(file, true);
      }
      
      setParseProgress(100);
      setParsedBook(parsed);
      setIsParsing(false);
    } catch (err: any) {
      console.error('Parsing error:', err);
      setError(err.message || 'Failed to parse book. Please try again.');
      setIsParsing(false);
      setParseProgress(0);
      setSelectedFile(null);
    }
  };

  const handleImport = async (editedChapters: BookChapter[]) => {
    if (!selectedFile || !parsedBook || !fileType) {
      setError('Missing file or parsed book data');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Upload to server with edited chapters
      setUploadProgress(30);
      const formData = new FormData();
      formData.append(fileType === 'epub' ? 'epub' : 'pdf', selectedFile);
      formData.append('fileType', fileType);
      formData.append('metadata', JSON.stringify(parsedBook.metadata));
      formData.append('chapters', JSON.stringify(editedChapters));

      setUploadProgress(60);
      const response = await fetch('/api/upload-book', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload book');
      }

      const result = await response.json();
      setUploadProgress(100);

      if (result.success && result.bookId) {
        setTimeout(() => {
          onUploadComplete(result.bookId);
        }, 500);
      } else {
        throw new Error('Upload failed: No book ID returned');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload book. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Show review interface if book is parsed
  if (parsedBook && fileType && !isUploading) {
    // For PDFs, show PDF viewer + editor
    if (fileType === 'pdf' && selectedFile) {
      return (
        <PdfViewerEditor
          pdfFile={selectedFile}
          parsedPdf={parsedBook as ParsedPdf}
          onImport={handleImport}
          onCancel={onCancel}
        />
      );
    }
    // For EPUBs, show the review interface
    return (
      <BookUploadReview
        parsedBook={parsedBook}
        fileType={fileType}
        onImport={handleImport}
        onCancel={onCancel}
      />
    );
  }

  // Show upload complete screen
  if (isUploading && uploadProgress === 100) {
    return (
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Complete!</h3>
            <p className="text-gray-600 mb-4">
              {parsedBook?.metadata.title} has been successfully uploaded.
            </p>
            <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl p-8 w-full">

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-brand-500 bg-brand-50'
              : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
          } ${isParsing || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".epub,.pdf"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isParsing || isUploading}
          />

          {isParsing || isUploading ? (
            <div>
              <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">
                {isParsing ? 'Parsing book...' : 'Uploading...'}
              </p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${isParsing ? parseProgress : uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {isParsing ? parseProgress : uploadProgress}%
              </p>
            </div>
          ) : (
            <div>
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your book file here
              </p>
              <p className="text-sm text-gray-500 mb-4">or click to browse</p>
              <p className="text-xs text-gray-400">
                Supported formats: .epub, .pdf
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default BookUpload;

