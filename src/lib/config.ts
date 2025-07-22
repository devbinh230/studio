// API Configuration from Environment Variables
export const config = {
  // Proxy Server Configuration (Primary AI provider)
  proxy: {
    // Support both naming conventions: PROXY_SERVER_* (preferred) or AI_SERVER_PROXY_* (legacy)
    baseUrl: process.env.PROXY_SERVER_URL || process.env.AI_SERVER_PROXY_URL,
    // Strip optional "Bearer " prefix if present in env value to avoid double prefixing later
    apiKey: (() => {
      const raw = process.env.PROXY_SERVER_API_KEY || process.env.AI_SERVER_PROXY_API_KEY || '';
      return raw.startsWith('Bearer ') ? raw.replace(/^Bearer\s+/i, '') : raw;
    })(),
    timeout: 120000, // 15 seconds timeout
    // Treat undefined as enabled (default true) unless explicitly set to 'false'
    enabled: process.env.PROXY_SERVER_ENABLED ? process.env.PROXY_SERVER_ENABLED === 'true' : true,
    model: process.env.PROXY_SERVER_MODEL || 'pplx-claude-4.0-sonnet', // Default model for proxy
  },

  // Resta.vn API Configuration
  resta: {
    // Accept both server-side and public token names for flexibility
    authToken: process.env.RESTA_AUTH_TOKEN || process.env.NEXT_PUBLIC_RESTA_AUTH_TOKEN
  },

  goong: {
    cookie: process.env.GOONG_COOKIE
  },

  // Geoapify API Configuration
  geoapify: {
    apiKey: process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY
  },

  // Perplexity AI API Configuration (Fallback)
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseUrl: process.env.PERPLEXITY_API_URL || "https://api.perplexity.ai/chat/completions",
    timeout: 10000, // 10 seconds timeout
    model: process.env.PERPLEXITY_MODEL || 'sonar-pro', // Default model for Perplexity
  },

  // Jina AI API Configuration (deprecated, kept for legacy support)
  jina: {
    apiKey: process.env.JINA_API_KEY
  },

  // AI Models Configuration
  models: {
    proxy: {
      // search: process.env.PROXY_SEARCH_MODEL || 'pplx-claude-4.0-sonnet',
      search: process.env.PROXY_SEARCH_MODEL || 'pplx-sonar',
      fallback: process.env.PROXY_FALLBACK_MODEL || 'o3'
    },
    perplexity: {
      search: process.env.PERPLEXITY_SEARCH_MODEL || 'sonar-pro',
      fallback: process.env.PERPLEXITY_FALLBACK_MODEL || 'pplx-7b-online'
    }
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

// Security utility to mask sensitive information
const maskSensitiveData = (data: string): string => {
  if (!data || data.length < 8) return '***';
  return data.substring(0, 4) + '***' + data.substring(data.length - 4);
};

// Security utility to mask API endpoints
const maskEndpoint = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname.replace(/\./g, '*')}/***`;
  } catch {
    return '***masked***';
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

// Helper function to get Mapbox access token (throws error if not set)
export const getMapboxAccessToken = () => {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set in environment variables');
  }
  return accessToken;
};

// Helper function to get Proxy Server config with security masking
export const getProxyServerConfig = () => {
  const baseUrl = config.proxy.baseUrl;
  const apiKey = config.proxy.apiKey;
  const enabled = config.proxy.enabled;
  const model = config.proxy.model;
  
  if (!enabled || !baseUrl || !apiKey) {
    console.log('🔄 Proxy server not available or disabled');
    return null;
  }
  
  console.log(`🔗 Using proxy server: ${maskEndpoint(baseUrl)}`);
  console.log(`🔑 Proxy API key: ${maskSensitiveData(apiKey)}`);
  console.log(`🤖 Proxy model: ${model}`);
  
  return {
    baseUrl,
    apiKey,
    timeout: config.proxy.timeout,
    enabled,
    model
  };
};

// Helper function to get Perplexity API key (throws error if not set)
export const getPerplexityApiKey = () => {
  const apiKey = config.perplexity.apiKey;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set in environment variables');
  }
  return apiKey;
};

// Helper function to get Perplexity config with security masking
export const getPerplexityConfig = () => {
  const apiKey = config.perplexity.apiKey;
  const baseUrl = config.perplexity.baseUrl;
  const model = config.perplexity.model;
  
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set in environment variables');
  }
  
  console.log(`🔗 Using Perplexity API: ${maskEndpoint(baseUrl)}`);
  console.log(`🔑 Perplexity API key: ${maskSensitiveData(apiKey)}`);
  console.log(`🤖 Perplexity model: ${model}`);
  
  return {
    baseUrl,
    apiKey,
    timeout: config.perplexity.timeout,
    model
  };
};

// Helper function to get model configuration
export const getModelConfig = () => {
  return {
    proxy: {
      primary: config.models.proxy.search,
      fallback: config.models.proxy.fallback
    },
    perplexity: {
      primary: config.models.perplexity.search,
      fallback: config.models.perplexity.fallback
    }
  };
};

// Helper function to get Jina API key (throws error if not set)
export const getJinaApiKey = () => {
  const apiKey = config.jina.apiKey;
  if (!apiKey) {
    throw new Error('JINA_API_KEY is not set in environment variables');
  }
  return apiKey;
};

// AI Provider Status Check
export const checkAIProviderStatus = () => {
  const proxy = getProxyServerConfig();
  const hasPerplexity = !!config.perplexity.apiKey;
  
  return {
    proxy: {
      available: !!proxy,
      masked_url: proxy ? maskEndpoint(proxy.baseUrl) : null,
      model: proxy ? proxy.model : null
    },
    perplexity: {
      available: hasPerplexity,
      masked_url: hasPerplexity ? maskEndpoint(config.perplexity.baseUrl) : null,
      model: hasPerplexity ? config.perplexity.model : null
    }
  };
};

// Guland Server Configuration
export const GULAND_CONFIG = {
  SERVER_URL: process.env.NEXT_PUBLIC_GULAND_SERVER_URL || 'http://localhost:8000',
  // Bearer token for authenticating requests to Guland FastAPI server (server-side only)
  AUTH_TOKEN: process.env.GULAND_AUTH_TOKEN || '',
  ENDPOINTS: {
    GET_PLANNING_DATA: '/get-planning-data',
    GEOCODING: '/geocoding',
    CHECK_PLAN: '/check-plan',
    ROAD_POINTS: '/road-points',
    GEOCODING_POST: '/geocoding-post',
    REFRESH_TOKEN: '/refresh-token',
    HEALTH: '/health'
  },
  PROXY_ENDPOINTS: {
    HEALTH: '/api/guland-proxy/health',
    PLANNING: '/api/guland-proxy/planning',
    GEOCODING: '/api/guland-proxy/geocoding',
    CHECK_PLAN: '/api/guland-proxy/check-plan',
    ROAD_POINTS: '/api/guland-proxy/road-points',
    REFRESH_TOKEN: '/api/guland-proxy/refresh-token',
    PRICING: '/api/guland-proxy/pricing'
  },
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second
};