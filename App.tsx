
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import LearningMap from './components/LearningMap';
import ModuleView from './components/ModuleView';
import ChatSidebar from './components/ChatSidebar';
import ContextMenu from './components/ContextMenu';
import DocSidebar from './components/DocSidebar';
import LandingPage from './components/LandingPage';
import BookSearch from './components/BookSearch';
import UploadPage from './components/UploadPage';
import { loadBook, loadAllBooks, type Book } from './services/bookService';
import { Module, Part } from './types';

// Landing Page Component
const LandingPageRoute: React.FC = () => {
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadBooks = async () => {
      try {
        setIsLoadingBooks(true);
        const books = await loadAllBooks();
        setAllBooks(books);
      } catch (error) {
        console.error('Failed to load books:', error);
      } finally {
        setIsLoadingBooks(false);
      }
    };

    loadBooks();
  }, []);

  const handleSelectBook = (bookId: string) => {
    navigate(`/book/${bookId}`);
  };

  if (isLoadingBooks) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-4rem)] w-full">
        <div className="text-gray-400 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
          <span>Loading Books...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <LandingPage books={allBooks} onSelectBook={handleSelectBook} />
    </div>
  );
};

// Book View Component (Learning Map)
const BookView: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [modulesMetadata, setModulesMetadata] = useState<Module[]>([]);
  const [parts, setParts] = useState<Part[] | undefined>(undefined);
  const [isLoadingBook, setIsLoadingBook] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);

  useEffect(() => {
    const loadBookData = async () => {
      if (!bookId) return;
      
      try {
        setIsLoadingBook(true);
        const loadedBook = await loadBook(bookId);
        setBook(loadedBook);
        setModulesMetadata(loadedBook.modules);
        setParts(loadedBook.parts);
      } catch (error) {
        console.error('Failed to load book:', error);
      } finally {
        setIsLoadingBook(false);
      }
    };

    loadBookData();
  }, [bookId]);

  const handleModuleSelect = (moduleId: string) => {
    navigate(`/book/${bookId}/module/${moduleId}`);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (isLoadingBook) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-gray-400 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
          <span>Loading Book...</span>
        </div>
      </div>
    );
  }

  return (
    <BookLayout
      book={book}
      modulesMetadata={modulesMetadata}
      parts={parts}
      activeModuleId={null}
      isChatOpen={isChatOpen}
      setIsChatOpen={setIsChatOpen}
      onGoHome={handleGoHome}
    >
      <div className="animate-fade-in-up py-8">
        <LearningMap 
          modules={modulesMetadata}
          parts={parts}
          bookMetadata={book?.metadata}
          activeModuleId={null} 
          onModuleSelect={handleModuleSelect} 
        />
      </div>
    </BookLayout>
  );
};

// Module View Component
const ModuleViewRoute: React.FC = () => {
  const { bookId, moduleId } = useParams<{ bookId: string; moduleId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [modulesMetadata, setModulesMetadata] = useState<Module[]>([]);
  const [parts, setParts] = useState<Part[] | undefined>(undefined);
  const [activeMarkdown, setActiveMarkdown] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isLoadingBook, setIsLoadingBook] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);

  useEffect(() => {
    const loadBookData = async () => {
      if (!bookId) return;
      
      try {
        setIsLoadingBook(true);
        const loadedBook = await loadBook(bookId);
        setBook(loadedBook);
        setModulesMetadata(loadedBook.modules);
        setParts(loadedBook.parts);
      } catch (error) {
        console.error('Failed to load book:', error);
      } finally {
        setIsLoadingBook(false);
      }
    };

    loadBookData();
  }, [bookId]);

  const activeModule = modulesMetadata.find(m => m.id === moduleId);

  useEffect(() => {
    const fetchContent = async () => {
      if (activeModule) {
        setIsLoadingContent(true);
        try {
          if (activeModule.path) {
            const response = await fetch(activeModule.path);
            if (response.ok) {
              const text = await response.text();
              setActiveMarkdown(text);
            } else {
              console.error(`Error fetching ${activeModule.path}: ${response.status} ${response.statusText}`);
              setActiveMarkdown(`# Error Loading Content\n\nCould not fetch the module content (Status: ${response.status}).\n\nPlease ensure the file \`${activeModule.path}\` exists in the public directory.`);
            }
          } else {
            setActiveMarkdown("# Error\nNo content path defined for this module.");
          }
        } catch (error) {
          console.error("Failed to fetch markdown:", error);
          setActiveMarkdown("# Error\nFailed to load content due to a network or parsing error.");
        } finally {
          setIsLoadingContent(false);
        }
      } else {
        setActiveMarkdown('');
      }
    };

    fetchContent();
  }, [activeModule]);

  const handleUpdateContent = (newContent: string) => {
    setActiveMarkdown(newContent);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleBackToMap = () => {
    navigate(`/book/${bookId}`);
  };

  if (isLoadingBook) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-gray-400 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
          <span>Loading Book...</span>
        </div>
      </div>
    );
  }

  return (
    <BookLayout
      book={book}
      modulesMetadata={modulesMetadata}
      parts={parts}
      activeModuleId={moduleId || null}
      isChatOpen={isChatOpen}
      setIsChatOpen={setIsChatOpen}
      onGoHome={handleGoHome}
      onBackToMap={handleBackToMap}
    >
      <div className="px-6 py-8 animate-fade-in min-h-full">
        {isLoadingContent ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-400 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
              <span>Loading Content...</span>
            </div>
          </div>
        ) : activeModule ? (
          <ModuleView 
            module={activeModule}
            modules={modulesMetadata}
            bookId={book?.id || 'agentic-patterns'}
            content={activeMarkdown}
            onTextSelect={(text) => console.log('Selected:', text)}
            onUpdateContent={handleUpdateContent}
            isChatOpen={isChatOpen}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Module not found.</p>
          </div>
        )}
      </div>
    </BookLayout>
  );
};

// Shared Book Layout Component
interface BookLayoutProps {
  book: Book | null;
  modulesMetadata: Module[];
  parts?: Part[];
  activeModuleId: string | null;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  onGoHome: () => void;
  onBackToMap?: () => void;
  children: React.ReactNode;
}

const BookLayout: React.FC<BookLayoutProps> = ({
  book,
  modulesMetadata,
  parts,
  activeModuleId,
  isChatOpen,
  setIsChatOpen,
  onGoHome,
  onBackToMap,
  children,
}) => {
  const navigate = useNavigate();
  const activeModule = modulesMetadata.find(m => m.id === activeModuleId);
  const [activeMarkdown, setActiveMarkdown] = useState<string>('');
  const [chatWidth, setChatWidth] = useState<number>(() => {
    const saved = localStorage.getItem('chatWidth');
    return saved ? parseInt(saved, 10) : 390;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Fetch markdown for context menu
  useEffect(() => {
    if (activeModule?.path) {
      fetch(activeModule.path)
        .then(res => res.ok ? res.text() : '')
        .then(text => setActiveMarkdown(text))
        .catch(() => setActiveMarkdown(''));
    }
  }, [activeModule]);

  // Save width to localStorage
  useEffect(() => {
    localStorage.setItem('chatWidth', chatWidth.toString());
  }, [chatWidth]);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      // Constrain between 300px and 800px
      const constrainedWidth = Math.max(300, Math.min(800, newWidth));
      setChatWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <>
      {/* Left Sidebar (Doc Nav) - Only visible when reading a module */}
      {activeModuleId && (
        <DocSidebar 
          modules={modulesMetadata}
          parts={parts}
          activeModuleId={activeModuleId}
          bookName={book?.metadata.name}
          onSelectModule={(moduleId) => {
            const bookId = book?.id;
            if (bookId) {
              navigate(`/book/${bookId}/module/${moduleId}`);
            }
          }}
          onGoHome={onBackToMap || (() => {})}
        />
      )}

      {/* Center Content */}
      <main 
        className={`flex-1 overflow-y-auto relative bg-paper ${!isResizing ? 'transition-all duration-300' : ''}`}
        style={isChatOpen ? { marginRight: `${chatWidth}px` } : {}}
      >
        {children}
      </main>

      {/* Right Sidebar (Chat) */}
      <div 
        className={`fixed top-16 right-0 bottom-0 bg-white border-l border-gray-200 transform z-20 shadow-xl ${isChatOpen ? 'translate-x-0' : 'translate-x-full'} ${!isResizing ? 'transition-transform duration-300' : ''}`}
        style={{ width: `${chatWidth}px` }}
      >
        {/* Resize Handle */}
        {isChatOpen && (
          <div
            ref={resizeRef}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            className="absolute left-0 top-0 bottom-0 w-1 hover:w-1.5 cursor-col-resize hover:bg-brand-500/20 transition-all z-30 group"
            style={{ cursor: 'col-resize' }}
            title="Drag to resize chat"
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-20 bg-gray-300 group-hover:bg-brand-500 rounded transition-colors opacity-0 group-hover:opacity-100" />
          </div>
        )}
        <ChatSidebar 
          context={activeModule 
            ? `Current Module: ${activeModule.title}. \nDescription: ${activeModule.description}. \nContent: ${activeMarkdown}` 
            : "User is on the Learning Map viewing the book structure."}
          activeModule={activeModule}
          bookId={book?.id || 'agentic-patterns'}
          bookMetadata={book?.metadata}
          isChatOpen={isChatOpen}
          chatWidth={chatWidth}
        />
      </div>
    </>
  );
};

const App: React.FC = () => {
  const location = useLocation();
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; text: string }>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
  });

  // Determine if we're in a book view
  const isBookView = location.pathname.startsWith('/book');
  const isModuleView = location.pathname.includes('/module/');
  
  // Extract bookId and moduleId from URL for context menu
  const bookIdMatch = location.pathname.match(/\/book\/([^/]+)/);
  const moduleIdMatch = location.pathname.match(/\/module\/([^/]+)/);
  const activeModuleId = moduleIdMatch ? moduleIdMatch[1] : null;

  // Context Menu Handler
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString() : '';

      if (selectedText && activeModuleId) {
        e.preventDefault();
        setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          text: selectedText,
        });
      } else {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    const handleClick = () => {
       setContextMenu(prev => ({ ...prev, visible: false }));
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
    };
  }, [activeModuleId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(contextMenu.text);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleAskAI = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Get book name and modules for navigation
  const [bookData, setBookData] = useState<{ modules: Module[]; name: string } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  useEffect(() => {
    if (isBookView && bookIdMatch) {
      loadBook(bookIdMatch[1])
        .then(book => {
          setBookData({ modules: book.modules, name: book.metadata.name });
        })
        .catch(() => {
          setBookData(null);
        });
    } else {
      setBookData(null);
    }
  }, [location.pathname, isBookView, bookIdMatch?.[1]]);

  // Derive bookName and modules from bookData to ensure stability
  const { bookName: derivedBookName, modules } = useMemo(() => {
    if (bookData) {
      return { bookName: bookData.name, modules: bookData.modules };
    }
    return { bookName: 'LiveBook', modules: [] };
  }, [bookData]);

  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      {/* Top Navigation */}
      <TopNavigation 
        isBookView={isBookView}
        isModuleView={isModuleView}
        bookName={derivedBookName}
        bookId={bookIdMatch?.[1]}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        modules={modules}
      />

      {/* Main Layout Area */}
      <div className={`${isLandingPage ? 'pt-16 min-h-[calc(100vh-4rem)]' : 'flex pt-16 h-screen overflow-hidden'}`}>
        <Routes>
          <Route path="/" element={<LandingPageRoute />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/book/:bookId" element={<BookView />} />
          <Route path="/book/:bookId/module/:moduleId" element={<ModuleViewRoute />} />
        </Routes>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu 
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
          onCopy={handleCopy}
          onAskAI={handleAskAI}
          selectedText={contextMenu.text}
        />
      )}
    </div>
  );
};

// Top Navigation Component
interface TopNavigationProps {
  isBookView: boolean;
  isModuleView: boolean;
  bookName: string;
  bookId?: string;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  modules?: Module[];
}

const TopNavigation: React.FC<TopNavigationProps> = ({
  isBookView,
  isModuleView,
  bookName,
  bookId,
  isChatOpen,
  setIsChatOpen,
  modules = [],
}) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleBackToMap = () => {
    if (bookId) {
      navigate(`/book/${bookId}`);
    }
  };

  return (
    <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 z-40 px-6 py-3 flex justify-between items-center shadow-sm">
      <div 
        className="flex items-center cursor-pointer group" 
        onClick={isBookView ? handleGoHome : undefined}
      >
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-md group-hover:bg-brand-700 transition-colors">
          L
        </div>
        <span className="font-serif font-bold text-lg text-ink">
          {bookName}
        </span>
      </div>
      
      <div className="flex items-center space-x-4 flex-1 justify-center mx-4">
        {isBookView && modules.length > 0 && bookId && (
          <BookSearch
            modules={modules}
            bookId={bookId}
            isBookView={isBookView}
          />
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {isBookView && (
          <>
            {isModuleView && (
              <button 
                onClick={handleBackToMap}
                className="text-sm text-gray-500 hover:text-brand-600 transition-colors mr-4 hidden md:block font-medium"
              >
                Back to Map
              </button>
            )}
            <button 
              onClick={handleGoHome}
              className="text-sm text-gray-500 hover:text-brand-600 transition-colors mr-4 hidden md:block font-medium"
            >
              Home
            </button>
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-2 rounded-lg transition-colors border ${isChatOpen ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
              title="Toggle Assistant"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default App;
