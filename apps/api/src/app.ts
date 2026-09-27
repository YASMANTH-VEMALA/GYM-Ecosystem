import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';
import routes from './routes';

const app = express();
app.set('trust proxy', 1);

// Build allowed origins list dynamically
const rawAllowedOrigins = [
  'https://gym.zitters.com',
  'https://zitters.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  env.WEB_URL,
  ...(env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : []),
  ...(env.CORS_ORIGIN ? [env.CORS_ORIGIN] : []),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
];

const normalizedOrigins = Array.from(
  new Set(
    rawAllowedOrigins
      .map((o) => o?.trim().replace(/\/+$/, ''))
      .filter(Boolean) as string[]
  )
);

const allowedOrigins: (string | RegExp)[] = [
  ...normalizedOrigins,
  /^https?:\/\/([a-z0-9-]+\.)*zitters\.com(:\d+)?(\/)?$/i,
  /^https?:\/\/([a-z0-9-]+\.)*mygymapp\.in(:\d+)?(\/)?$/i,
  /^https?:\/\/([a-z0-9-]+\.)*vercel\.app(:\d+)?(\/)?$/i,
  /^https?:\/\/localhost(:\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/i,
];

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
  exposedHeaders: ['Server-Timing', 'X-Response-Time'],
};

// 1. CORS middleware - MUST run before routes, auth, rate limiters, body parsers, and helmet
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 2. Helmet security headers with cross-origin resource policy configured for cross-origin access
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 3. Response timing instrumentation
app.use((req, res, next) => {
  const start = Date.now();
  const originalWriteHead = res.writeHead;
  res.writeHead = function (this: typeof res, ...args: any[]) {
    const duration = Date.now() - start;
    res.setHeader('Server-Timing', `total;dur=${duration}`);
    res.setHeader('X-Response-Time', `${duration}ms`);
    return originalWriteHead.apply(this, args as any);
  };
  next();
});

// 4. Body parser
app.use(express.json({ limit: '10mb' }));

// 5. HTTP request logging
app.use(morgan('short'));

// 6. Rate limiting and routes
app.use('/api', apiLimiter);
app.use('/api', routes);

// 7. Error handling
app.use(errorHandler);

export default app;
