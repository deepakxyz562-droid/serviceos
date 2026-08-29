/**
 * Standardized API Client & Typed Error Handling
 */

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      // response is not JSON
    }
    const message = errorData?.error || errorData?.message || `API request failed with status ${response.status}`;
    throw new ApiError(message, response.status, errorData);
  }

  // Support 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
