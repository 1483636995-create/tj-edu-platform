export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }

  return secret;
}

export function getJwtExpiresInSeconds() {
  const expiresIn = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 28800);

  if (!Number.isInteger(expiresIn) || expiresIn <= 0) {
    throw new Error('JWT_EXPIRES_IN_SECONDS must be a positive integer.');
  }

  return expiresIn;
}
