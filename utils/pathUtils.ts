/**
 * Utility functions for handling paths with base URL
 * Vite provides import.meta.env.BASE_URL which includes the base path
 */

/**
 * Gets the base URL from Vite's environment
 * This will be "/livebook" in production or "/" in development
 */
export function getBaseUrl(): string {
  // Vite provides BASE_URL which includes the base path
  // It always ends with a slash, so we remove it for consistency
  const baseUrl = import.meta.env.BASE_URL || '/';
  // Remove trailing slash if present (except for root)
  return baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
}

/**
 * Constructs a full URL with the base path
 * @param path The path to append (should start with /)
 * @returns The full path with base URL
 */
export function withBaseUrl(path: string): string {
  const baseUrl = getBaseUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

