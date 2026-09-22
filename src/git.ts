import { Router } from "@wxn0brp/falcon-frame";
import { execFileSync } from "child_process";
import { rmSync } from "fs";
import { gitBranch } from "./vars";
import { createAdapter } from "./init";

export function createGitRouter(gitDir: string) {
	const router = new Router();

	function runGit(args: string[]) {
		return execFileSync("git", args, {
			cwd: gitDir,
			encoding: "utf8",
			stdio: [
				"pipe",
				"pipe",
				"pipe",
			],
		});
	}

	function hasCommits() {
		try {
			runGit([
				"rev-parse",
				"HEAD",
			]);
			return true;
		} catch {
			return false;
		}
	}

	function getCurrentBranch() {
		try {
			return runGit([
				"rev-parse",
				"--abbrev-ref",
				"HEAD",
			]).trim();
		} catch {
			return gitBranch;
		}
	}

	router.get("/status", (req, res) => {
		try {
			const status = runGit([
				"status",
				"--porcelain",
			]);

			const files = status
				.split("\n")
				.map(line => line.trim())
				.filter(Boolean)
				.map(line => ({
					status: line.substring(0, 2),
					file: line.substring(3),
				}));

			const result: any = {
				files,
				hasChanges: files.length > 0,
			};

			if (hasCommits()) {
				result.branch = getCurrentBranch();

				const lastCommit = runGit([
					"log",
					"-1",
					"--format=%H|%s|%an|%ar",
				]).trim();
				const [hash, message, author, date] = lastCommit.split("|");
				result.lastCommit = {
					hash,
					message,
					author,
					date,
				};
			} else {
				result.branch = getCurrentBranch();
				result.lastCommit = null;
			}

			res.json({
				err: false,
				result,
			});
		} catch (err: any) {
			console.error(`[GIT] status failed: ${err.message}`);
			res.status(500).json({
				err: true,
				msg: err.message,
			});
		}
	});

	router.post("/pull", (req, res) => {
		try {
			const branch = req.body.branch || getCurrentBranch();
			runGit([
				"fetch",
				"origin",
				branch,
			]);
			runGit([
				"reset",
				"--hard",
				`origin/${branch}`,
			]);
			console.log(`[GIT] force pull completed for branch ${branch}`);
			res.json({
				err: false,
				msg: `Pulled from origin/${branch}`,
			});
		} catch (err: any) {
			console.error(`[GIT] pull failed: ${err.message}`);
			res.status(500).json({
				err: true,
				msg: err.message,
			});
		}
	});

	router.post("/commit", (req, res) => {
		try {
			const message =
				req.body.message || `Auto commit ${new Date().toISOString()}`;
			runGit([
				"add",
				".",
			]);
			runGit([
				"commit",
				"-m",
				message,
			]);
			console.log(`[GIT] commit: ${message}`);
			res.json({
				err: false,
				msg: `Committed: ${message}`,
			});
		} catch (err: any) {
			console.error(`[GIT] commit failed: ${err.message}`);
			res.status(500).json({
				err: true,
				msg: err.message,
			});
		}
	});

	router.post("/push", (req, res) => {
		try {
			const branch = req.body.branch || getCurrentBranch();
			const force = req.body.force === true;

			if (force) {
				runGit([
					"push",
					"--force",
					"origin",
					branch,
				]);
			} else {
				try {
					runGit([
						"push",
						"origin",
						branch,
					]);
				} catch {
					runGit([
						"push",
						"--force",
						"origin",
						branch,
					]);
				}
			}

			console.log(
				`[GIT] push${force ? " --force" : ""} completed for branch ${branch}`,
			);
			res.json({
				err: false,
				msg: `Pushed to origin/${branch}${force ? " (force)" : ""}`,
			});
		} catch (err: any) {
			console.error(`[GIT] push failed: ${err.message}`);
			res.status(500).json({
				err: true,
				msg: err.message,
			});
		}
	});

	router.post("/reset", (req, res) => {
		try {
			const branch = req.body.branch || getCurrentBranch();
			runGit([
				"fetch",
				"origin",
				branch,
			]);
			runGit([
				"reset",
				"--hard",
				`origin/${branch}`,
			]);
			runGit([
				"clean",
				"-fd",
			]);
			console.log(`[GIT] reset to origin/${branch} completed`);
			res.json({
				err: false,
				msg: `Reset to origin/${branch}`,
			});
		} catch (err: any) {
			console.error(`[GIT] reset failed: ${err.message}`);
			res.status(500).json({
				err: true,
				msg: err.message,
			});
		}
	});

	router.post("/reinit", async (req, res) => {
		try {
			console.log(`[GIT] cleaning ${gitDir}...`);
			rmSync(gitDir, {
				recursive: true,
				force: true,
			});

			await createAdapter();
		} catch (err: any) {
			console.error(`[GIT] reclone failed: ${err.message}`);
			res.status(500).json({
				err: true,
				msg: err.message,
			});
		}
	});

	return router;
}
