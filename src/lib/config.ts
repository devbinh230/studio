// API Configuration from Environment Variables
export const config = {
  // Resta.vn API Configuration
  resta: {
    // Current token (used in client components and API routes)
    authToken: process.env.RESTA_AUTH_TOKEN
  },

  // Geoapify API Configuration
  geoapify: {
    apiKey: process.env.GEOAPIFY_API_KEY
  }
};

// Client-side configuration (for Next.js public env vars)
export const clientConfig = {
  resta: {
    authToken: process.env.NEXT_PUBLIC_RESTA_AUTH_TOKEN
  },
  geoapify: {
    apiKey: process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY
  }
};

// Helper function to get auth token for demos (throws error if not set)
export const getDefaultAuthToken = () => {
  const token = clientConfig.resta.authToken;
  if (!token) {
    throw new Error('NEXT_PUBLIC_RESTA_AUTH_TOKEN is not set in environment variables');
  }
  return token;
};

// Helper function to get Geoapify API key (throws error if not set)
export const getGeoapifyApiKey = () => {
  const apiKey = clientConfig.geoapify.apiKey;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GEOAPIFY_API_KEY is not set in environment variables');
  }
  return apiKey;
};