import { createGitAdapter } from "@wxn0brp/db-storage-git";
import { flushDelay, gitBranch, gitDir, gitToken, gitUrl } from "./vars";

export function createAdapter() {
	return createGitAdapter({
		dir: gitDir,
		git: {
			url: gitUrl,
			auth: {
				type: "token",
				token: gitToken,
			},
			branch: gitBranch,
		},
		flusher: {
			delay: flushDelay,
			autoFlush: true,
		},
	});
}
