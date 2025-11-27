import type { Plugin } from 'vite';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import Busboy from 'busboy';
import { loadEnv } from 'vite';

/**
 * Vite plugin to handle cache file operations
 * Provides API endpoints to save and read cache files from the file system
 */
export function cacheFilePlugin(): Plugin {
  return {
    name: 'cache-file-plugin',
    configResolved(config) {
      // Load environment variables and set them in process.env for server-side use
      // This gracefully handles missing .env.local files
      try {
        const env = loadEnv(config.mode, process.cwd(), '');
        // Set API keys in process.env so they're available to server-side imports
        // Use empty string as default if not found
        process.env.API_KEY = env.GEMINI_API_KEY || env.API_KEY || '';
        process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || env.API_KEY || '';
        process.env.AZURE_ENDPOINT = env.AZURE_ENDPOINT || '';
        process.env.AZURE_API_KEY = env.AZURE_API_KEY || '';
        process.env.AZURE_DEPLOYMENT_NAME = env.AZURE_DEPLOYMENT_NAME || '';
        process.env.GEMINI_MODEL = env.GEMINI_MODEL || '';
        process.env.LLM_PROVIDER = env.LLM_PROVIDER || '';
      } catch (error) {
        // If loading env fails (e.g., .env.local doesn't exist), set defaults
        console.warn('Could not load environment variables, using defaults:', error);
        process.env.API_KEY = '';
        process.env.GEMINI_API_KEY = '';
        process.env.AZURE_ENDPOINT = '';
        process.env.AZURE_API_KEY = '';
        process.env.AZURE_DEPLOYMENT_NAME = '';
        process.env.GEMINI_MODEL = '';
        process.env.LLM_PROVIDER = '';
      }
    },
    configureServer(server) {
      // Middleware to handle cache file operations
      server.middlewares.use('/api/cache', async (req, res, next) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        try {
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          
          if (req.method === 'POST') {
            // Save cache file
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            
            req.on('end', async () => {
              try {
                const { bookId, moduleId, format, content } = JSON.parse(body);
                
                // Construct cache file path
                const cacheDir = path.join(process.cwd(), 'books', bookId, 'cache');
                const cacheFileName = `${moduleId}_${format}.md`;
                const cacheFilePath = path.join(cacheDir, cacheFileName);
                
                // Ensure cache directory exists
                if (!existsSync(cacheDir)) {
                  await mkdir(cacheDir, { recursive: true });
                }
                
                // Write cache file
                await writeFile(cacheFilePath, content, 'utf-8');
                
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, path: cacheFilePath }));
              } catch (error: any) {
                console.error('Error saving cache file:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: error.message }));
              }
            });
          } else if (req.method === 'GET') {
            // Read cache file
            const bookId = url.searchParams.get('bookId');
            const moduleId = url.searchParams.get('moduleId');
            const format = url.searchParams.get('format');
            
            if (!bookId || !moduleId || !format) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Missing parameters' }));
              return;
            }
            
            const cacheDir = path.join(process.cwd(), 'books', bookId, 'cache');
            const cacheFileName = `${moduleId}_${format}.md`;
            const cacheFilePath = path.join(cacheDir, cacheFileName);
            
            if (existsSync(cacheFilePath)) {
              try {
                const content = await readFile(cacheFilePath, 'utf-8');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, content }));
              } catch (error: any) {
                console.error('Error reading cache file:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: error.message }));
              }
            } else {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Cache file not found' }));
            }
          } else {
            next();
          }
        } catch (error: any) {
          console.error('Cache API error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });

      // Middleware to handle questions.json operations
      server.middlewares.use('/api/questions', async (req, res, next) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        try {
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          const bookId = url.searchParams.get('bookId');
          
          if (!bookId) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Missing bookId parameter' }));
            return;
          }

          const questionsPath = path.join(process.cwd(), 'books', bookId, 'cache', 'questions.json');
          
          if (req.method === 'POST') {
            // Save questions.json
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            
            req.on('end', async () => {
              try {
                const questions = JSON.parse(body);
                
                // Ensure cache directory exists
                const cacheDir = path.join(process.cwd(), 'books', bookId, 'cache');
                if (!existsSync(cacheDir)) {
                  await mkdir(cacheDir, { recursive: true });
                }
                
                // Write questions.json file
                await writeFile(questionsPath, JSON.stringify(questions, null, 2), 'utf-8');
                
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, path: questionsPath }));
              } catch (error: any) {
                console.error('Error saving questions.json:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: error.message }));
              }
            });
          } else if (req.method === 'GET') {
            // Read questions.json
            if (existsSync(questionsPath)) {
              try {
                const content = await readFile(questionsPath, 'utf-8');
                const questions = JSON.parse(content);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, questions }));
              } catch (error: any) {
                console.error('Error reading questions.json:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: error.message }));
              }
            } else {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'questions.json not found' }));
            }
          } else {
            next();
          }
        } catch (error: any) {
          console.error('Questions API error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });

      // Middleware to handle EPUB and PDF book uploads
      server.middlewares.use('/api/upload-book', async (req, res, next) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          next();
          return;
        }

        try {
          const busboy = Busboy({ headers: req.headers });
          let fileBuffer: Buffer | null = null;
          let fileType: string = 'epub';
          let metadata: any = null;
          let chapters: any[] = [];

          busboy.on('file', (fieldname, file, info) => {
            if (fieldname === 'epub' || fieldname === 'pdf') {
              fileType = fieldname;
              const chunks: Buffer[] = [];
              file.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
              });
              file.on('end', () => {
                fileBuffer = Buffer.concat(chunks);
              });
            }
          });

          busboy.on('field', (fieldname, value) => {
            if (fieldname === 'fileType') {
              fileType = value;
            } else if (fieldname === 'metadata') {
              try {
                metadata = JSON.parse(value);
              } catch (e) {
                console.error('Error parsing metadata:', e);
              }
            } else if (fieldname === 'chapters') {
              try {
                chapters = JSON.parse(value);
              } catch (e) {
                console.error('Error parsing chapters:', e);
              }
            }
          });

          busboy.on('finish', async () => {
            try {
              if (!fileBuffer || !metadata || !chapters || chapters.length === 0) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 
                  success: false, 
                  error: 'Missing required data: book file, metadata, or chapters' 
                }));
                return;
              }

              // Generate book ID from title (sanitize for filesystem)
              const bookId = metadata.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 50) + '-' + Date.now();

              const bookDir = path.join(process.cwd(), 'books', bookId);
              const chaptersDir = path.join(bookDir, 'chapters');
              const cacheDir = path.join(bookDir, 'cache');

              // Create directories
              await mkdir(chaptersDir, { recursive: true });
              await mkdir(cacheDir, { recursive: true });

              // Save book file (optional, for reference)
              const bookFileName = `book.${fileType}`;
              const bookFilePath = path.join(bookDir, bookFileName);
              await writeFile(bookFilePath, fileBuffer);

              // Save each chapter as a directory with module.md file
              const modules = chapters.map((chapter, index) => {
                // Generate directory name from chapter title or use chapter-{index}
                const chapterTitle = chapter.title || `Chapter ${index + 1}`;
                const chapterDirName = chapterTitle
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-+|-+$/g, '')
                  .substring(0, 50) || `chapter-${index + 1}`;
                
                const chapterDir = path.join(chaptersDir, chapterDirName);
                return {
                  id: chapter.id || `module-${index + 1}`,
                  title: chapterTitle,
                  description: chapter.description || chapterTitle,
                  path: `chapters/${chapterDirName}/module.md`,
                  dirName: chapterDirName,
                  dirPath: chapterDir,
                };
              });

              // Write chapter markdown files in their own directories
              for (let i = 0; i < chapters.length; i++) {
                const chapter = chapters[i];
                const module = modules[i];
                
                // Create chapter directory
                await mkdir(module.dirPath, { recursive: true });
                
                // Write module.md file
                const modulePath = path.join(module.dirPath, 'module.md');
                await writeFile(modulePath, chapter.content, 'utf-8');
              }
              
              // Clean up modules array to remove internal properties before saving to metadata
              const cleanModules = modules.map(({ dirName, dirPath, ...module }) => module);

              // Create metadata.json
              const metadataJson = {
                name: metadata.title,
                description: metadata.description || `Uploaded book: ${metadata.title}`,
                author: metadata.author || 'Unknown',
                requestFramePermissions: [],
                modules: cleanModules,
              };

              const metadataPath = path.join(bookDir, 'metadata.json');
              await writeFile(metadataPath, JSON.stringify(metadataJson, null, 2), 'utf-8');

              // Create empty questions.json
              const questionsPath = path.join(cacheDir, 'questions.json');
              await writeFile(questionsPath, JSON.stringify({}, null, 2), 'utf-8');

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                bookId,
                message: `Book "${metadata.title}" uploaded successfully with ${chapters.length} chapters`
              }));
            } catch (error: any) {
              console.error(`Error processing ${fileType.toUpperCase()} upload:`, error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: false, 
                error: error.message || `Failed to process ${fileType.toUpperCase()} upload` 
              }));
            }
          });

          req.pipe(busboy);
        } catch (error: any) {
          console.error('Upload API error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });

      // Middleware to list available books
      server.middlewares.use('/api/books', async (req, res, next) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'GET') {
          next();
          return;
        }

        try {
          const { readdir } = await import('fs/promises');
          const booksDir = path.join(process.cwd(), 'books');
          
          if (!existsSync(booksDir)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, bookIds: [] }));
            return;
          }

          const entries = await readdir(booksDir, { withFileTypes: true });
          const bookIds = entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name)
            .filter(name => {
              // Check if directory has metadata.json
              const metadataPath = path.join(booksDir, name, 'metadata.json');
              return existsSync(metadataPath);
            });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, bookIds }));
        } catch (error: any) {
          console.error('Error listing books:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });

      // Middleware to handle PDF text extraction (server-side processing)
      server.middlewares.use('/api/extract-pdf', async (req, res, next) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          next();
          return;
        }

        try {
          const busboy = Busboy({ headers: req.headers });
          let fileBuffer: Buffer | null = null;

          busboy.on('file', (fieldname, file, info) => {
            if (fieldname === 'pdf') {
              const chunks: Buffer[] = [];
              file.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
              });
              file.on('end', () => {
                fileBuffer = Buffer.concat(chunks);
              });
            }
          });

          busboy.on('finish', async () => {
            if (!fileBuffer) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: false, 
                error: 'No PDF file provided' 
              }));
              return;
            }

            try {
              // Set up Server-Sent Events for progress updates
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/event-stream');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');
              
              // Process PDF server-side with progress updates
              const { extractPdfText } = await import('./services/pdfServerService');
              
              // Send progress updates via SSE
              const sendProgress = (progress: { page: number; totalPages: number; percentage: number }) => {
                res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
              };
              
              // Process PDF asynchronously
              extractPdfText(fileBuffer, sendProgress)
                .then((result) => {
                  // Send final result
                  res.write(`data: ${JSON.stringify({ type: 'complete', success: true, ...result })}\n\n`);
                  res.end();
                })
                .catch((error: any) => {
                  console.error('PDF extraction error:', error);
                  res.write(`data: ${JSON.stringify({ type: 'error', success: false, error: error.message || 'Failed to extract PDF text' })}\n\n`);
                  res.end();
                });
            } catch (error: any) {
              console.error('PDF extraction API error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: false, 
                error: error.message || 'Failed to extract PDF text' 
              }));
            }
          });

          req.pipe(busboy);
        } catch (error: any) {
          console.error('PDF extraction API error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });

      // Middleware to handle LLM requests (proxies to keep API keys server-side)
      server.middlewares.use('/api/llm', async (req, res, next) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          next();
          return;
        }

        try {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', async () => {
            try {
              const { messages, systemInstruction, config } = JSON.parse(body);
              
              // Import and use the LLM provider on the server side
              const { getLLMProvider } = await import('./services/llmProvider');
              const provider = getLLMProvider();
              
              const response = await provider.sendMessage(
                messages,
                systemInstruction,
                config
              );
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, text: response.text }));
            } catch (error: any) {
              console.error('LLM API error:', error);
              // Return a user-friendly error message instead of failing completely
              res.statusCode = 200; // Return 200 so client can handle gracefully
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, // Mark as success so client receives the message
                text: `I'm sorry, but the AI assistant is not currently configured. Please set up an LLM provider (Azure OpenAI or Gemini) by configuring the necessary API keys in your environment variables. Error: ${error.message || 'LLM service unavailable'}`
              }));
            }
          });
        } catch (error: any) {
          console.error('LLM API error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });
    }
  };
}

