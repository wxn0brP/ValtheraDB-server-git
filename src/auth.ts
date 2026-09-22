import { RouteHandler } from "@wxn0brp/falcon-frame";
import { timingSafeEqual } from "crypto";
import { wolfToken } from "./vars";

function safeCompare(a: string, b: string) {
	if (a.length !== b.length) return false;
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	return timingSafeEqual(bufA, bufB);
}

export const authMiddleware: RouteHandler = async (req, res, next) => {
	let token = req.headers["authorization"];

	if (!token && req.body.auth) token = req.body.auth;

	if (!token) {
		return res.status(401).json({
			err: true,
			msg: "Access denied. No token provided.",
		});
	}

	if (token.includes(" ")) token = token.split(" ")[1];

	const provided = token.replace("_wolf_", "");

	if (!wolfToken || !safeCompare(provided, wolfToken)) {
		return res.status(401).json({
			err: true,
			msg: "Invalid token.",
		});
	}

	next();
};
