type Env = Record<string, string | undefined>;

export default function envValidation(config: Env): Env {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'ALLOWED_GOOGLE_DOMAINS'];

  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return config;
}
