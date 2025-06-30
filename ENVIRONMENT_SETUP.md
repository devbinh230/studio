# Environment Variables Setup Guide

## 🌟 Overview

This project uses environment variables to securely manage API keys and tokens. All sensitive keys are now centralized in configuration files instead of being hardcoded.

## 📋 Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

### Resta.vn API Configuration
```bash
# Legacy token (used in server actions)
RESTA_AUTH_TOKEN_LEGACY=your_legacy_resta_token_here

# Current token (used in client components and API routes)
RESTA_AUTH_TOKEN=your_current_resta_token_here
```

### Geoapify API Configuration
```bash
# Server-side Geoapify API key
GEOAPIFY_API_KEY=your_geoapify_api_key_here

# Client-side public environment variables
NEXT_PUBLIC_GEOAPIFY_API_KEY=your_geoapify_api_key_here
NEXT_PUBLIC_RESTA_AUTH_TOKEN=your_current_resta_token_here
```

## 🔧 Configuration Structure

The project uses a centralized configuration system:

- **Server-side config**: Located in `src/lib/config.ts` - uses regular environment variables
- **Client-side config**: Uses `NEXT_PUBLIC_` prefixed variables for browser access
- **Helper functions**: Provides easy access to API keys and tokens

## 📁 Files Updated

The following files have been updated to use environment variables:

### Server Actions
- `src/app/actions.ts` - Uses `config.resta.authTokenLegacy`

### API Routes  
- `src/app/api/complete-flow/route.ts` - Uses passed auth tokens
- `src/app/api/valuation/route.ts` - Uses passed auth tokens

### Components
- `src/components/property-input-form.tsx` - Uses `getDefaultAuthToken()`
- `src/components/interactive-map-simple.tsx` - Uses `getGeoapifyApiKey()`
- `src/components/map-view.tsx` - Uses `getGeoapifyApiKey()`

### Demo Pages
- `src/app/map-demo/page.tsx` - Uses `getDefaultAuthToken()`  
- `src/app/demo-api/page.tsx` - Uses `getDefaultAuthToken()`

## 🚀 Usage Examples

### Getting API Keys in Components
```typescript
import { getDefaultAuthToken, getGeoapifyApiKey } from '@/lib/config';

// Get Resta auth token
const authToken = getDefaultAuthToken();

// Get Geoapify API key
const apiKey = getGeoapifyApiKey();
```

### Server-side Usage
```typescript
import { config } from '@/lib/config';

// Get server config
const authToken = config.resta.authToken;
const geoapifyKey = config.geoapify.apiKey;
```

## 🔒 Security Notes

1. **Never commit `.env.local`** - It's in `.gitignore` for security
2. **Use different tokens for different environments** (development, staging, production)
3. **Regularly rotate your API keys** for security
4. **Use `NEXT_PUBLIC_` prefix only when necessary** - these are exposed to the browser

## 🛠️ Development Setup

1. Copy the environment variables template:
   ```bash
   cp .env.example .env.local  # If .env.example exists
   ```

2. Fill in your actual API keys in `.env.local`

3. Restart your development server:
   ```bash
   npm run dev
   ```

## 📝 Environment Variable Descriptions

| Variable | Type | Usage | Description |
|----------|------|-------|-------------|
| `RESTA_AUTH_TOKEN_LEGACY` | Server | Server actions | Legacy Resta.vn authentication token |
| `RESTA_AUTH_TOKEN` | Server | API routes | Current Resta.vn authentication token |
| `GEOAPIFY_API_KEY` | Server | Server-side map operations | Geoapify mapping service API key |
| `NEXT_PUBLIC_GEOAPIFY_API_KEY` | Public | Client-side maps | Public Geoapify API key for browser |
| `NEXT_PUBLIC_RESTA_AUTH_TOKEN` | Public | Client components | Public Resta token for demos |

## ✨ Benefits

- **Security**: No hardcoded secrets in source code
- **Flexibility**: Easy to change keys per environment
- **Maintainability**: Centralized configuration management
- **Development**: Easy setup with default fallbacks 