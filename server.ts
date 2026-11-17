import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface GroundedPlace {
  title: string;
  uri: string;
  reviewSnippets: string[];
  rating?: number | null;
  distanceText?: string | null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Minimal CORS support for packaged Capacitor Android WebView calling a private backend
  const extraCorsOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const allowedApiOrigins = new Set([
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    ...extraCorsOrigins,
  ]);

  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedApiOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Server-side Google Maps Grounding endpoint using gemini-4-hydrogen + googleMaps tool
  app.post('/api/maps-grounding', async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const mode = req.body?.mode === 'nearby' ? 'nearby' : 'place';
    const scopeLabel = typeof req.body?.scopeLabel === 'string' ? req.body.scopeLabel.trim() : '';
    const latitude = typeof req.body?.latitude === 'number' && Number.isFinite(req.body.latitude)
      ? req.body.latitude
      : undefined;
    const longitude = typeof req.body?.longitude === 'number' && Number.isFinite(req.body.longitude)
      ? req.body.longitude
      : undefined;

    if (!query) {
      res.status(400).json({ error: 'A location or stop query is required.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Google Maps Grounding is unavailable because GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    try {
      const hasCoords =
        latitude !== undefined &&
        longitude !== undefined &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180;

      const config: {
        tools: Array<{ googleMaps: Record<string, never> }>;
        toolConfig?: {
          retrievalConfig: {
            latLng: { latitude: number; longitude: number };
          };
        };
      } = {
        tools: [{ googleMaps: {} }],
      };

      if (hasCoords) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: latitude as number,
              longitude: longitude as number,
            },
          },
        };
      }

      const promptText =
        mode === 'nearby'
          ? `Using Google Maps data, list real nearby landmarks, transit points, or notable public places near: ${query}${scopeLabel ? ` (context: ${scopeLabel})` : ''}. Keep the summary concise and factual. Mention a rating or distance ONLY if explicitly present in Google Maps data; otherwise omit them. Do not invent places, distances, ratings, reviews, route-to-place connections, bus ETAs, or schedules.`
          : `Provide concise, factual Google Maps place and transit landmark details for: ${query}. Do not invent bus ETAs, distances, ratings, or schedules.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: promptText,
        config,
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const places: GroundedPlace[] = [];
      const seenUris = new Set<string>();

      for (const chunk of chunks as Array<Record<string, any>>) {
        const mapsData = chunk?.maps;
        if (!mapsData) continue;

        const uri = typeof mapsData.uri === 'string' ? mapsData.uri : '';
        const title = typeof mapsData.title === 'string' ? mapsData.title : 'Google Maps Place';
        const reviewSnippets: string[] = [];
        const rating =
          typeof mapsData.rating === 'number' && Number.isFinite(mapsData.rating)
            ? mapsData.rating
            : null;
        const distanceText =
          typeof mapsData.distance === 'string' && mapsData.distance.trim()
            ? mapsData.distance.trim()
            : null;

        const snippets = mapsData.placeAnswerSources?.reviewSnippets;
        if (Array.isArray(snippets)) {
          for (const snippet of snippets) {
            const snippetText =
              typeof snippet?.content === 'string'
                ? snippet.content
                : typeof snippet?.text === 'string'
                ? snippet.text
                : '';
            if (snippetText) {
              reviewSnippets.push(snippetText);
            }
          }
        }

        if (uri && !seenUris.has(uri)) {
          seenUris.add(uri);
          places.push({
            title,
            uri,
            reviewSnippets,
            ...(rating !== null ? { rating } : {}),
            ...(distanceText !== null ? { distanceText } : {}),
          });
        }
      }

      res.json({
        text: response.text || '',
        places,
        model: 'gemini-4-hydrogen',
        source: 'google-maps-grounding',
      });
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : 'Failed to query Google Maps data.';
      const status =
        rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')
          ? 429
          : rawMessage.includes('403') || rawMessage.includes('PERMISSION_DENIED')
          ? 403
          : 500;

      let cleanMessage = rawMessage;
      if (status === 429) {
        cleanMessage =
          'Google Maps Grounding quota exceeded (HTTP 429). Direct Google Maps search links above remain available.';
      } else if (status === 403) {
        cleanMessage =
          'Google Maps Grounding request was denied (HTTP 403). Verify GEMINI_API_KEY permissions and billing.';
      } else {
        try {
          const parsed = JSON.parse(rawMessage);
          if (typeof parsed?.error?.message === 'string') {
            cleanMessage = parsed.error.message;
          }
        } catch {
          // Keep rawMessage when not JSON
        }
      }

      console.error('Maps Grounding API error:', rawMessage);
      res.status(status).json({ error: cleanMessage });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CU BUS Transit server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
