export default () => ({
  port: parseInt(process.env['API_PORT'] ?? '4000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  apiPrefix: process.env['API_PREFIX'] ?? 'api/v1',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
  },

  redis: {
    url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
  },

  jwt: {
    secret: process.env['JWT_SECRET'] ?? 'change-me',
    expiresIn: process.env['JWT_EXPIRES_IN'] ?? '15m',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
  },

  google: {
    clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    callbackUrl: process.env['GOOGLE_CALLBACK_URL'] ?? 'http://localhost:4000/api/v1/auth/google/callback',
  },

  scraper: {
    enabled: process.env['SCRAPER_ENABLED'] !== 'false',
    enabledBanks: process.env['SCRAPER_ENABLED_BANKS'] ?? '',
    requestTimeout: parseInt(process.env['SCRAPER_REQUEST_TIMEOUT'] ?? '30000', 10),
    scheduleHour: parseInt(process.env['SCRAPER_SCHEDULE_HOUR'] ?? '8', 10),
    scheduleMinute: parseInt(process.env['SCRAPER_SCHEDULE_MINUTE'] ?? '30', 10),
    maxRetries: parseInt(process.env['SCRAPER_MAX_RETRIES'] ?? '3', 10),
    telegramBotToken: process.env['TELEGRAM_BOT_TOKEN'] ?? '',
    telegramChatId: process.env['TELEGRAM_CHAT_ID'] ?? '',
  },

  cors: {
    origins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
  },
});
