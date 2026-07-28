import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { petRoutes } from './features/pet/pet.routes.js';
import { heroRebirthRoutes } from './features/hero-rebirth/hero-rebirth.routes.js';
import { eggGenerationRoutes } from './features/egg-generation/egg-generation.routes.js';
import { notificationsRoutes } from './features/notifications/notifications.routes.js';
import { adminRoutes } from './admin/admin.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { startBot } from './bot/bot.js';
import { startNotificationCron } from './features/notifications/notifications.cron.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: config.env });
});

app.use('/api/pet', petRoutes);
app.use('/api/hero-rebirth', heroRebirthRoutes);
app.use('/api/egg-generation', eggGenerationRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
});

startBot();
startNotificationCron();
