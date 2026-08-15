import type { APIResponse } from '@real/types';
import { publicEnv } from './env';

/** A failed API call, carrying the machine-readable code from the server. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string | null;
}

/**
 * Typed fetch wrapper for the Express API.
 * Unwraps the APIResponse envelope so callers get plain data or a thrown ApiError.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;

  const response = await fetch(`${publicEnv.apiUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  let payload: APIResponse<T>;
  try {
    payload = (await response.json()) as APIResponse<T>;
  } catch {
    throw new ApiError('INTERNAL_ERROR', 'The server sent something unreadable.', response.status);
  }

  if (!payload.ok) {
    throw new ApiError(payload.error.code, payload.error.message, response.status);
  }

  return payload.data;
}

/** Client-side helper — pulls the token from the browser Supabase session. */
export function createApiClient(getToken: () => Promise<string | null>) {
  return {
    get: async <T>(path: string) => apiFetch<T>(path, { method: 'GET', token: await getToken() }),
    post: async <T>(path: string, body?: unknown) =>
      apiFetch<T>(path, { method: 'POST', body, token: await getToken() }),
    patch: async <T>(path: string, body?: unknown) =>
      apiFetch<T>(path, { method: 'PATCH', body, token: await getToken() }),
    delete: async <T>(path: string) =>
      apiFetch<T>(path, { method: 'DELETE', token: await getToken() }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
