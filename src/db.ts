import { VQuery } from "@wxn0brp/db-core/types/query";
import { FFResponse, Router } from "@wxn0brp/falcon-frame";
import { deserializeFunctions } from "@wxn0brp/wts-run-fn";
import type { ValtheraClass } from "@wxn0brp/db-core/db/valthera";

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
	PARAMS_REQ = "params is required",
	COLLECTION_REQ = "collection is required",
}

export function createDbRouter(db: ValtheraClass) {
	const router = new Router();

	function getQuery(req: any) {
		const { query, params } = req.body;
		if (query) return query;
		if (params) return {};
		const data = Array.isArray(params) ? params[0] : params;
		return data || {};
	}

	async function dbLogic(query: Query): Promise<Response> {
		const { type, query: params, keys } = query;
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

			if (!params || typeof params !== "object" || !params.collection)
				return res.e(Codes.PARAMS_REQ);

			const parsedParams = deserializeFunctions(
				[
					params,
				],
				keys || [],
			);
			const parsedVQuery = parsedParams[0] as VQuery;

			const collection = parsedVQuery.collection as string;
			if (!collection) return res.e(Codes.COLLECTION_REQ);

			console.log(`[OP] ${type} ${collection}`);

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
			query: getQuery(req),
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
				...getQuery(req),
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
				query: getQuery(req),
				keys: req.body.keys || [],
			});
			result.ff(res);
		},
	};
}
