export const port = parseInt(process.env.PORT || "14785");
export const wolfToken = process.env.WOLF_TOKEN || "";
export const gitUrl = process.env.GIT_URL || "";
export const gitBranch = process.env.GIT_BRANCH || "main";
export const gitToken = process.env.GIT_TOKEN || "";
export const gitDir = process.env.GIT_DIR || "./data";
export const flushDelay = parseInt(process.env.FLUSH_DELAY || "10000");

export const sslCert = process.env.SSL_CERT;
export const sslKey = process.env.SSL_KEY;
export const sslCa = process.env.SSL_CA;
export const sslPort = parseInt(process.env.SSL_PORT || String(port + 1));

export const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || "100");
export const rateLimitWindow = parseInt(
	process.env.RATE_LIMIT_WINDOW || "60000",
);
