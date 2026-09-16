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

app.use(helmet());
app.use(cors({
  origin: [env.WEB_URL, /\.mygymapp\.in$/],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('short'));
app.use('/api', apiLimiter);
app.use('/api', routes);
app.use(errorHandler);

export default app;
