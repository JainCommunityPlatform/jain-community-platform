export interface AppConfiguration {
  port: number;
  database: {
    url?: string;
  };
  redis: {
    url?: string;
  };
}

export function configuration(): AppConfiguration {
  return {
    port: parsePort(process.env.PORT),
    database: {
      url: process.env.DATABASE_URL,
    },
    redis: {
      url: process.env.REDIS_URL,
    },
  };
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return 3000;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return port;
}
