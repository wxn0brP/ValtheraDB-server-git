import type { ValtheraClass } from "@wxn0brp/db-core/db/valthera";
import { VQuery } from "@wxn0brp/db-core/types/query";
import { FFResponse, Router } from "@wxn0brp/falcon-frame";
import { deserializeFunctions } from "@wxn0brp/wts-run-fn";

export interface Query {
	type: string;
	query: VQuery;
	keys: string[][];
}

export class Response {
	err: boolean = false;
	result: any;
	msg: string = "";
	code?: number;

	e(msg: string, code: number = 400) {
		this.err = true;
		this.msg = msg;
		this.code = code;
		return this;
	}

	r(result: any) {
		this.err = false;
		this.result = result;
		return this;
	}

	ff(res: FFResponse) {
		const response: any = {
			err: this.err,
		};
		if (this.code) res.status(this.code);
		if (this.msg) response.msg = this.msg;
		if (this.result !== undefined) response.result = this.result;
		return res.json(response);
	}
}

export enum Codes {
	TYPE_REQ = "type is required",
	INVALID_TYPE = "invalid type",
	ACCESS_DENIED = "access denied",
	QUERY_REQ = "query is required",
	QUERY_REQ_OBJ = "query must be an object",
	COLLECTION_REQ = "collection is required",
	INVALID_COLLECTION = "invalid collection",
}

function isPathSafe(collection: string) {
	if (collection.startsWith("..")) return false;
	if (collection.startsWith("/")) return false;
	return true;
}

export function createDbRouter(db: ValtheraClass) {
	const router = new Router();

	async function dbLogic(serverQuery: Query): Promise<Response> {
		const { type, query, keys } = serverQuery;
		const res = new Response();

		if (!type) return res.e(Codes.TYPE_REQ);

		try {
			const dbAny = db as any;
			if (!dbAny[type] || typeof dbAny[type] !== "function")
				return res.e(Codes.INVALID_TYPE);

			if (type === "getCollections") {
				console.log("[OP] getCollections");
				const collections = await db.getCollections();
				return res.r(collections);
			}

			if (!query) return res.e(Codes.QUERY_REQ);
			if (typeof query !== "object") return res.e(Codes.QUERY_REQ_OBJ);
			if (!query.collection) return res.e(Codes.COLLECTION_REQ);

			const parsedVQuery = deserializeFunctions(query, keys || []) as VQuery;

			if (!isPathSafe(query.collection)) return res.e(Codes.INVALID_COLLECTION);

			console.log(`[OP] ${type} ${query.collection}`);

			const result = await dbAny[type](parsedVQuery);
			return res.r(result);
		} catch (err: any) {
			console.error(`[DB] ${type} failed: ${err.message}`);
			return res.e(err.message, 500);
		}
	}

	router.post("/:type", async (req, res) => {
		const result = await dbLogic({
			type: req.params.type,
			query: req.query,
			keys: req.body.keys || [],
		});
		result.ff(res);
	});

	router.post("/:db/:type", async (req, res) => {
		const collection = req.query?.c || "";
		const result = await dbLogic({
			type: req.params.type,
			query: {
				collection,
				...req.query,
			},
			keys: req.body.keys || [],
		});
		result.ff(res);
	});

	return {
		router,
		rootHandler: async (req: any, res: any) => {
			const result = await dbLogic({
				type: req.body.op,
				query: req.query,
				keys: req.body.keys || [],
			});
			result.ff(res);
		},
	};
}
