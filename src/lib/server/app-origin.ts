type HeaderReader = {
  get(name: string): string | null;
};

export function resolveAppOrigin(headersList: HeaderReader, env: NodeJS.ProcessEnv = process.env) {
  const configuredOrigin = parseConfiguredOrigin(env.NEXT_PUBLIC_APP_URL);
  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL must be configured in production.");
  }

  const host = headersList.get("host") ?? "localhost:3000";
  if (!isLocalDevelopmentHost(host)) {
    throw new Error("Refusing to build a magic-link URL from an untrusted Host header.");
  }

  return `http://${host}`;
}

function parseConfiguredOrigin(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function isLocalDevelopmentHost(host: string) {
  return /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host);
}
