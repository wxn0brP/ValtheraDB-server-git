import { execFileSync } from "child_process";
import { Router } from "@wxn0brp/falcon-frame";

export function createGitRouter(gitDir: string) {
	const router = new Router();

	router.get("/status", (req, res) => {
		try {
			const status = execFileSync("git", ["status", "--porcelain"], {
				cwd: gitDir,
				encoding: "utf8",
			});

			const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
				cwd: gitDir,
				encoding: "utf8",
			}).trim();

			const lastCommit = execFileSync(
				"git",
				["log", "-1", "--format=%H|%s|%an|%ar"],
				{
					cwd: gitDir,
					encoding: "utf8",
				},
			).trim();

			const [hash, message, author, date] = lastCommit.split("|");

			const files = status
				.split("\n")
				.map(line => line.trim())
				.filter(Boolean)
				.map(line => ({
					status: line.substring(0, 2),
					file: line.substring(3),
				}));

			res.json({
				err: false,
				result: {
					branch,
					lastCommit: {
						hash,
						message,
						author,
						date,
					},
					files,
					hasChanges: files.length > 0,
				},
			});
		} catch (err: any) {
			console.error(`[GIT] status failed: ${err.message}`);
			res.status(500).json({
				err: true,
				msg: err.message,
			});
		}
	});

	return router;
}
