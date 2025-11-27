/**
 * Utility to validate if content is a valid mindmap format
 * Uses the actual parser to verify the content can be parsed into nodes
 */

import { parseMindmapToFlow } from './mindmapParser';

export function isValidMindmap(content: string): boolean {
  if (!content || content.trim().length === 0) {
    return false;
  }

  try {
    // Try to parse the content - if it produces nodes, it's valid
    const { nodes, edges } = parseMindmapToFlow(content);
    
    // Valid if we have at least one node (the root)
    const isValid = nodes.length > 0;
    
    if (!isValid) {
      console.log('[Mindmap Validator] No nodes generated from content');
      console.log('[Mindmap Validator] Content preview:', content.substring(0, 300));
    }
    
    return isValid;
  } catch (error) {
    console.error('[Mindmap Validator] Error parsing content:', error);
    console.log('[Mindmap Validator] Content preview:', content.substring(0, 300));
    return false;
  }
}

