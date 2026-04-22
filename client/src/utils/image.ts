const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const getImageUrl = (path: string | null | undefined) => {
  if (!path || typeof path !== 'string') {
    return 'https://placehold.co/400x400/f9a8d4/831843?text=No+Image';
  }
  
  if (path.startsWith('http')) {
    return path;
  }
  
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_HOST}${normalizedPath}`;
};
