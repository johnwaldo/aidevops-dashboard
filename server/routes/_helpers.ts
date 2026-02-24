export function apiResponse<T>(data: T, source: string, ttl: number, cached = false): Response {
  return Response.json({
    data,
    meta: {
      source,
      timestamp: new Date().toISOString(),
      cached,
      ttl,
    },
  });
}

export function apiError(code: string, message: string, source: string, status = 500): Response {
  return Response.json(
    {
      error: { code, message, source },
    },
    { status }
  );
}
