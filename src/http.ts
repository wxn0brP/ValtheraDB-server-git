import type { ValtheraClass } from "@wxn0brp/db-core/db/valthera";
import FalconFrame from "@wxn0brp/falcon-frame";
import { PluginSystem } from "@wxn0brp/falcon-frame-plugin";
import { createRateLimiterPlugin } from "@wxn0brp/falcon-frame-plugin/plugins/rateLimit";
import { existsSync, readFileSync } from "fs";
import http from "http";
import https from "https";
import { authMiddleware } from "./auth";
import { createDbRouter } from "./db";
import { createGitRouter } from "./git";
import {
	gitDir,
	port,
	rateLimitMax,
	rateLimitWindow,
	sslCa,
	sslCert,
	sslKey,
	sslPort,
} from "./vars";

export function startHttp(db: ValtheraClass) {
	const app = new FalconFrame();
	app.setOrigin("*");
	app.get("/", () => "Server is running.");

	const apiLimiter = new PluginSystem();
	apiLimiter.register(
		createRateLimiterPlugin({
			maxRequests: rateLimitMax,
			windowMs: rateLimitWindow,
			onLimitReached: (req, res) => {
				res.status(429).json({
					err: true,
					msg: "Too many requests",
				});
			},
		}),
	);

	const apiRouter = app.router("/");
	apiRouter.use(apiLimiter.getRouteHandler());
	apiRouter.use(authMiddleware);
	apiRouter.use((req, res, next) => {
		res.setHeader("Connection", "keep-alive");
		res.setHeader(
			"Cache-Control",
			"no-store, no-cache, must-revalidate, max-age=0",
		);
		res.setHeader("Pragma", "no-cache");
		next!();
	});

	const { router: dbRouter, rootHandler } = createDbRouter(db);
	apiRouter.use("/db", dbRouter);
	apiRouter.post("/", rootHandler);

	const gitRouter = createGitRouter(gitDir);
	apiRouter.use("/git", gitRouter);

	const handler = app.getApp();

	const httpServer = http.createServer(handler);
	httpServer.keepAliveTimeout = 60000;
	httpServer.headersTimeout = 65000;
	httpServer.listen(port, () => {
		console.log(`HTTP server started on port ${port}`);
	});

	if (sslCert && sslKey) {
		if (!existsSync(sslCert) || !existsSync(sslKey)) {
			console.warn(
				"SSL_CERT or SSL_KEY file not found, HTTPS server not started",
			);
		} else {
			const sslOpts: {
				key: string;
				cert: string;
				ca?: string;
			} = {
				key: readFileSync(sslKey, "utf8"),
				cert: readFileSync(sslCert, "utf8"),
			};

			if (sslCa && existsSync(sslCa)) {
				sslOpts.ca = readFileSync(sslCa, "utf8");
			}

			const httpsServer = https.createServer(sslOpts, handler);
			httpsServer.keepAliveTimeout = 60000;
			httpsServer.headersTimeout = 65000;
			httpsServer.listen(sslPort, () => {
				const proto = sslCa ? " (CA)" : "";
				console.log(`HTTPS${proto} server started on port ${sslPort}`);
			});
		}
	}
}
