import { configDotenv } from "dotenv";
import { ValtheraClass } from "@wxn0brp/db-core/db/valthera";
import { createGitAdapter } from "@wxn0brp/db-storage-git";
import { startHttp } from "./http";
import {
	wolfToken,
	gitUrl,
	gitBranch,
	gitToken,
	gitDir,
	flushDelay,
} from "./vars";

configDotenv({
	quiet: true,
});

async function main() {
	if (!wolfToken) {
		console.error("WOLF_TOKEN is required");
		process.exit(1);
	}

	if (!gitUrl) {
		console.error("GIT_URL is required");
		process.exit(1);
	}

	console.log("Initializing git adapter...");
	const adapter = await createGitAdapter({
		git: {
			url: gitUrl,
			auth: {
				type: "token",
				token: gitToken,
			},
			workdir: gitDir,
			branch: gitBranch,
		},
		flusher: {
			delay: flushDelay,
			autoFlush: true,
		},
	});

	console.log("Creating Valthera instance...");
	const db = new ValtheraClass({
		adapter,
	});

	console.log("Starting HTTP server...");
	startHttp(db);
}

main().catch(err => {
	console.error("Failed to start server:", err);
	process.exit(1);
});
