import { z } from 'zod';
import apiClient from './client';

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export function buildPathWithQuery(path: string, params?: QueryParams): string {
  if (!params) {
    return path;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

async function parseResponse<T>(request: Promise<unknown>, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(await request);
}

export function apiGet<T>(path: string, schema: z.ZodType<T>, params?: QueryParams): Promise<T> {
  return parseResponse(apiClient.get(buildPathWithQuery(path, params)) as Promise<unknown>, schema);
}

export function apiPost<TResponse, TBody = undefined>(
  path: string,
  body: TBody,
  schema: z.ZodType<TResponse>,
  params?: QueryParams,
): Promise<TResponse> {
  return parseResponse(
    apiClient.post(buildPathWithQuery(path, params), body) as Promise<unknown>,
    schema,
  );
}
