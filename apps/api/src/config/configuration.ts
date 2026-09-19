export interface AppConfiguration {
  port: number;
  database: {
    url?: string;
  };
  redis: {
    url?: string;
  };
  auth: {
    jwksUrl?: string;
    issuer?: string;
    audience?: string;
  };
}

const FIREBASE_PROJECT_ID = 'jain-community-platform';
const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

export function configuration(): AppConfiguration {
  const firebaseProjectId =
    process.env.FIREBASE_PROJECT_ID?.trim() || FIREBASE_PROJECT_ID;

  return {
    port: parsePort(process.env.PORT),
    database: {
      url: process.env.DATABASE_URL,
    },
    redis: {
      url: process.env.REDIS_URL,
    },
    auth: {
      jwksUrl: process.env.AUTH_JWKS_URL?.trim() || FIREBASE_JWKS_URL,
      issuer:
        process.env.AUTH_ISSUER?.trim() ||
        `https://securetoken.google.com/${firebaseProjectId}`,
      audience: process.env.AUTH_AUDIENCE?.trim() || firebaseProjectId,
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
