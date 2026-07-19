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

  session: {
    secret: process.env['SESSION_SECRET'] ?? 'change-me',
  },

  cors: {
    origins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
  },
});
