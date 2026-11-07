const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function databaseConnectionOptions(connectionString: string, ca?: string) {
  const url = new URL(connectionString);
  // pg lets URL parameters override explicit SSL options.
  for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"]) {
    url.searchParams.delete(key);
  }
  const host = url.searchParams.get("host") ?? url.hostname;
  return {
    connectionString: url.toString(),
    ssl: LOCAL_HOSTS.has(host) ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  };
}
