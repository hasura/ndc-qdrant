import Fastify from "fastify";
import FastifyCors from "@fastify/cors";
import { CapabilitiesResponse } from "./schemas/CapabilitiesResponse";
import { QueryRequest } from "./schemas/QueryRequest";
import { QueryResponse } from "./schemas/QueryResponse";
import { SchemaResponse } from "./schemas/SchemaResponse";

import { postQuery } from "./handlers/query";
import { getConfig } from "./config";
import { HOST, PORT, ORIGIN, CAPABILITIES } from "./constants";

const server = Fastify({logger: {transport: {target: "pino-pretty"}}});

server.register(FastifyCors, {
    origin: ORIGIN,
    methods: ["GET", "POST", "OPTIONS"]
});

server.get<{Reply: CapabilitiesResponse}>(
    "/capabilities",
    async (_request, _response) => {
        // server.log.info(
        //     {
        //     headers: request.headers,
        //     query: request.body
        // },
        // "capabilities.request"
        // );
    return CAPABILITIES;
    }
);

server.get<{ Reply: SchemaResponse}>(
    "/schema",
    async (request, _response) => {
        // server.log.info({
        //     headers: request.headers,
        //     query: request.body
        // },
        // "schema.request"
        // );
        return getConfig(request, null).schema;
    }
);

server.post<{ Body: QueryRequest, Reply: QueryResponse }>(
    "/query",
    async (request, _response) => {
        // server.log.info(
        //     {
        //     headers: request.headers,
        //     query: request.body
        // },
        // "query.request"
        // );
        return await postQuery(request.body, getConfig(request, null));
    }
);

process.on("SIGINT", () => {
    server.log.info("Interupt");
    process.exit(0)
});

const start = async () => {
    try {
        await server.listen({port: PORT, host: HOST});
    } catch (err) {
        server.log.fatal(err);
        process.exit(1);
    }
};
start();