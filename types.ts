
export interface CodeExample {
  language: string;
  description: string;
  code: string;
}

export interface Module {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  path: string; // Path to the .md file
}

export interface Part {
  id: string;
  title: string;
  description?: string;
  modules: Module[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
  sources?: string[]; // Source references (e.g., page numbers, module IDs)
  model?: string; // AI model used for the response
}

export interface Position {
  x: number;
  y: number;
}

export interface Comment {
  id: string;
  moduleId: string;
  textSelection: string;
  comment: string;
  author: string;
  timestamp: number;
}
