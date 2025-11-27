import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChatMessage } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { Module } from '../types';
import { loadBookQuestions, saveBookQuestions, type BookMetadata } from '../services/bookService';
import { generateQuestions, generateBookCoverQuestions } from '../services/questionService';

interface ChatSidebarProps {
  context: string;
  activeModule?: Module | null;
  bookId?: string;
  bookMetadata?: BookMetadata | null;
  isChatOpen?: boolean;
  chatWidth?: number;
}

interface ChatPair {
  question: ChatMessage;
  answer: ChatMessage | null;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ context, activeModule, bookId = 'agentic-patterns', bookMetadata, isChatOpen = false }) => {
  const bookName = bookMetadata?.name || 'Book';
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: activeModule 
        ? `Hi! I'm your ${bookName} assistant. I can help you understand "${activeModule.title}". What would you like to know?`
        : `Hi! I'm your ${bookName} assistant. Ask me anything about this book.`,
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [questionMap, setQuestionMap] = useState<Record<string, string[]>>({});
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [generatedModules, setGeneratedModules] = useState<Set<string>>(new Set());
  const [coverQuestionsGenerated, setCoverQuestionsGenerated] = useState(false);

  // Group messages into Q&A pairs
  const chatPairs: ChatPair[] = [];
  let currentQuestion: ChatMessage | null = null;
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      currentQuestion = msg;
      chatPairs.push({ question: msg, answer: null });
    } else if (msg.role === 'model' && currentQuestion) {
      const lastPair = chatPairs[chatPairs.length - 1];
      if (lastPair && !lastPair.answer) {
        lastPair.answer = msg;
      }
      currentQuestion = null;
    }
  }

  // Load questions from book data
  useEffect(() => {
    const loadQuestions = async () => {
      const questions = await loadBookQuestions(bookId);
      setQuestionMap(questions);
      if (questions['cover'] && questions['cover'].length > 0) {
        setCoverQuestionsGenerated(true);
      } else {
        setCoverQuestionsGenerated(false);
      }
    };
    loadQuestions();
  }, [bookId]);

  // Generate questions for book cover when no active module
  useEffect(() => {
    const generateCoverQuestions = async () => {
      if (!isChatOpen || activeModule || coverQuestionsGenerated || !bookMetadata) {
        return;
      }

      if (questionMap['cover'] && questionMap['cover'].length > 0) {
        setCoverQuestionsGenerated(true);
        return;
      }

      setIsGeneratingQuestions(true);
      try {
        const questions = await generateBookCoverQuestions(
          bookMetadata.name,
          bookMetadata.description,
          bookMetadata.modules || []
        );

        if (questions.length > 0) {
          const updatedQuestions = {
            ...questionMap,
            'cover': questions,
          };
          setQuestionMap(updatedQuestions);
          setCoverQuestionsGenerated(true);
          await saveBookQuestions(bookId, updatedQuestions);
        }
      } catch (error) {
        console.error('Error generating cover questions:', error);
      } finally {
        setIsGeneratingQuestions(false);
      }
    };

    generateCoverQuestions();
  }, [isChatOpen, activeModule, coverQuestionsGenerated, bookMetadata, questionMap, bookId]);

  // Generate questions for a module on first access when chat is open
  useEffect(() => {
    const generateModuleQuestions = async () => {
      if (!isChatOpen || !activeModule || generatedModules.has(activeModule.id)) {
        return;
      }

      if (questionMap[activeModule.id] && questionMap[activeModule.id].length > 0) {
        setGeneratedModules(prev => new Set(prev).add(activeModule.id));
        return;
      }

      setIsGeneratingQuestions(true);
      try {
        const moduleContent = context.includes('Content:') 
          ? context.split('Content:')[1]?.trim() || context
          : context;

        const questions = await generateQuestions(
          activeModule.title,
          activeModule.description || '',
          moduleContent
        );

        if (questions.length > 0) {
          const updatedQuestions = {
            ...questionMap,
            [activeModule.id]: questions,
          };
          setQuestionMap(updatedQuestions);
          setGeneratedModules(prev => new Set(prev).add(activeModule.id));
          await saveBookQuestions(bookId, updatedQuestions);
        }
      } catch (error) {
        console.error('Error generating questions:', error);
      } finally {
        setIsGeneratingQuestions(false);
      }
    };

    generateModuleQuestions();
  }, [isChatOpen, activeModule?.id, questionMap, bookId, context, generatedModules]);

  // Update suggested questions when module or questionMap changes
  useEffect(() => {
    if (!activeModule) {
      if (isGeneratingQuestions && !questionMap['cover']) {
        setSuggestedQuestions(["Generating questions..."]);
      } else {
        setSuggestedQuestions(questionMap['cover'] || [
          `What will I learn from ${bookName}?`,
          `What are the main topics covered in this book?`,
          `How can I get started with ${bookName}?`,
        ]);
      }
    } else {
      if (isGeneratingQuestions && !questionMap[activeModule.id]) {
        setSuggestedQuestions(["Generating questions..."]);
      } else {
        setSuggestedQuestions(questionMap[activeModule.id] || [
          "Can you explain the main concepts in this module?",
          "What are the key takeaways?",
          "How can I apply this in practice?",
        ]);
      }
    }
  }, [activeModule, questionMap, isGeneratingQuestions, bookName]);
  
  const showSuggestions = messages.length === 1 && !isLoading;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    const responseText = await sendMessageToGemini(messages, inputValue, context);

    const modelMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, modelMsg]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedQuestion = async (question: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: question,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const responseText = await sendMessageToGemini(messages, question, context);

    const modelMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, modelMsg]);
    setIsLoading(false);
  };

  const handleCopyQuestion = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCopyAnswer = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDeleteChat = (questionId: string) => {
    setMessages(prev => {
      const questionIndex = prev.findIndex(m => m.id === questionId);
      if (questionIndex === -1) return prev;
      
      // Remove question and its answer
      const newMessages = [...prev];
      if (newMessages[questionIndex + 1]?.role === 'model') {
        newMessages.splice(questionIndex, 2);
      } else {
        newMessages.splice(questionIndex, 1);
      }
      return newMessages;
    });
  };

  const handleRephrase = async (questionId: string, originalText: string) => {
    // For now, just copy the question to input for editing
    setInputValue(originalText);
    setShowPromptPanel(false);
  };

  // Update welcome message when module or book changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'welcome') {
      const newWelcomeText = activeModule 
        ? `Hi! I'm your ${bookName} assistant. I can help you understand "${activeModule.title}". What would you like to know?`
        : `Hi! I'm your ${bookName} assistant. Ask me anything about this book.`;
      
      if (messages[0].text !== newWelcomeText) {
        setMessages([{
          id: 'welcome',
          role: 'model',
          text: newWelcomeText,
          timestamp: Date.now()
        }]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule?.id, bookName]);

  return (
    <div className="h-full flex flex-col bg-white w-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="font-bold text-gray-800 flex items-center">
          <svg className="w-5 h-5 mr-2 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Book Assistant
        </h3>
        <p className="text-xs text-gray-500 mt-1">AI Assistant</p>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-4 space-y-6">
          {/* Welcome Message */}
          {messages.length === 1 && messages[0].id === 'welcome' && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-gray-800 leading-relaxed text-sm" {...props} />,
                    }}
                  >
                    {messages[0].text}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Chat Pairs */}
          {chatPairs.map((pair) => (
            <div key={pair.question.id} className="space-y-4">
              {/* Question */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                    <div className="text-sm text-gray-800 leading-relaxed">{pair.question.text}</div>
                  </div>
                  <div className="flex items-center justify-between mt-2 px-1">
                    <span className="text-xs text-gray-500">{formatTimestamp(pair.question.timestamp)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRephrase(pair.question.id, pair.question.text)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Rephrase"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleCopyQuestion(pair.question.text)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Copy"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteChat(pair.question.id)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Answer */}
              {pair.answer && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-gray-800 leading-relaxed text-sm" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0 text-gray-900" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-sm font-bold mb-2 mt-3 first:mt-0 text-gray-900" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0 text-gray-900" {...props} />,
                          ul: ({node, ...props}) => <ul className="ml-4 list-disc text-gray-800 my-2 space-y-1 text-sm" {...props} />,
                          ol: ({node, ...props}) => <ol className="ml-4 list-decimal text-gray-800 my-2 space-y-1 text-sm" {...props} />,
                          li: ({node, ...props}) => <li className="text-sm" {...props} />,
                          blockquote: ({node, ...props}) => (
                            <blockquote className="border-l-3 border-brand-400 pl-3 italic text-gray-700 my-2 text-xs" {...props} />
                          ),
                          code(props: any) {
                            const {node, inline, className, children, ...rest} = props;
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <div className="my-2 rounded-lg overflow-hidden border border-gray-300">
                                <div className="bg-slate-800 px-2 py-1 flex justify-between items-center border-b border-slate-700">
                                  <span className="text-[10px] font-mono text-brand-300 uppercase">{match[1]}</span>
                                </div>
                                <SyntaxHighlighter
                                  style={vscDarkPlus as any}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{ margin: 0, padding: '0.5rem', fontSize: '0.75rem' }}
                                  {...rest}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code className="bg-gray-100 text-brand-700 px-1.5 py-0.5 rounded font-mono text-xs" {...rest}>
                                {children}
                              </code>
                            );
                          },
                          a: ({node, ...props}) => (
                            <a className="text-brand-600 hover:text-brand-700 underline" target="_blank" rel="noopener noreferrer" {...props} />
                          ),
                          strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                          em: ({node, ...props}) => <em className="italic" {...props} />,
                        }}
                      >
                        {pair.answer.text}
                      </ReactMarkdown>
                    </div>
                    {pair.answer.sources && pair.answer.sources.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex items-center gap-1">
                          {pair.answer.sources.map((source, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-end mt-2">
                      <button
                        onClick={() => handleCopyAnswer(pair.answer!.text)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Copy answer"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Suggested Questions */}
          {showSuggestions && (
            <div className="space-y-3 animate-fade-in">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                Recommended Questions
              </div>
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="w-full text-left p-3 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-2">
                    <svg 
                      className="w-4 h-4 text-gray-400 group-hover:text-brand-600 mt-0.5 flex-shrink-0 transition-colors" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-brand-700 font-medium leading-relaxed">
                      {question}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white">
        {/* Prompt Panel */}
        {showPromptPanel && (
          <div className="border-b border-gray-200 bg-gray-50 max-h-64 overflow-y-auto">
            <div className="p-3">
              <div className="text-xs font-semibold text-gray-700 mb-2">Recommend</div>
              <div className="space-y-1">
                {suggestedQuestions.slice(0, 5).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleSuggestedQuestion(question);
                      setShowPromptPanel(false);
                    }}
                    className="w-full text-left p-2 hover:bg-white rounded transition-colors text-sm text-gray-700"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Config Bar */}
        {showConfig && (
          <div className="border-b border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-700">Language</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4">
          <div className="relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="+ New chat."
              className="w-full pl-4 pr-20 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-sm resize-none"
              rows={2}
              style={{ minHeight: '44px' }}
            />
            <div className="absolute right-2 top-2 flex items-center gap-1">
              <button
                onClick={() => setShowPromptPanel(!showPromptPanel)}
                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                title="Suggested questions"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors ${showConfig ? 'bg-gray-200' : ''}`}
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Send"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
