import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'delivery-management-api',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  allowedGoogleDomains: (() => {
    const domains = (process.env.ALLOWED_GOOGLE_DOMAINS ?? '')
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);

    return domains.length > 0 ? domains : ['garena.vn'];
  })(),
  superAdminEmails: (process.env.SUPER_ADMIN_EMAILS ?? 'dinhphuc.luu@garena.vn')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
}));
