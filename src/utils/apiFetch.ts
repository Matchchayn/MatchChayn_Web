// Mocking apiFetch for now, as we'll use Firebase for most things.
// For OTP, we might need a backend, but I'll simulate it for this demo.

export async function apiFetch(endpoint: string, options: any = {}) {
  // Mocking notifications for the demo to prevent 404/HTML responses
  if (endpoint.includes('/api/notifications')) {
    if (options.method === 'DELETE') return { success: true };
    if (options.method === 'POST') return { success: true };
    
    return [
      {
        _id: 'mock_1',
        type: 'like',
        isRead: false,
        sender: {
          firstName: 'joseph',
          lastName: 'Sunday',
          avatarUrl: 'https://picsum.photos/seed/joseph/100/100'
        },
        createdAt: new Date().toISOString()
      },
      {
        _id: 'mock_2',
        type: 'match',
        isRead: true,
        sender: {
          firstName: 'Sarah',
          lastName: 'Adams',
          avatarUrl: 'https://picsum.photos/seed/sarah/100/100'
        },
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}
