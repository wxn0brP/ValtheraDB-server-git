import { ValtheraClass } from "@wxn0brp/db-core/db/valthera";
import { loadEnvFile } from "node:process";
import { startHttp } from "./http";
import { createAdapter } from "./init";
import { gitUrl, wolfToken } from "./vars";

try {
	loadEnvFile();
} catch {}

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
	const adapter = await createAdapter();
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
