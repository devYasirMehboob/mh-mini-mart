export default function normalizeApiError(error) {
  // If it's not an axios error, or has no response, it's likely a network error or crash
  if (!error.response) {
    return {
      type: 'network',
      message: 'The local server is unavailable. Check Apache and MySQL.',
      fieldErrors: {},
      status: 0,
      code: 'NETWORK_ERROR',
    };
  }

  const { status, data } = error.response;
  const message = data?.message || 'An unexpected error occurred.';
  const code = data?.code || null;
  const fieldErrors = data?.errors || {};

  let type = 'server';
  if (status === 422 || status === 400) type = 'validation';
  else if (status === 401) type = 'authentication';
  else if (status === 403) type = 'authorization';
  else if (status === 404) type = 'not_found';
  else if (status === 409) type = 'conflict';

  return { type, message, fieldErrors, status, code };
}
