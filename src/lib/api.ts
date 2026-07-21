const getHeaders = () => {
  const userId = localStorage.getItem('mockUserId');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userId) headers['X-User-Id'] = userId;
  return headers;
};

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'API request failed');
  }

  // Any successful mutation can change sidebar badge counts (pending
  // approvals, processing queue, etc.) elsewhere in the app — refresh them
  // here instead of relying on every call site to remember to do it.
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    window.dispatchEvent(new CustomEvent('refresh-activity'));
  }

  return response.json();
};
