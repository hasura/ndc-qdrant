import Fastify from "fastify";
import FastifyCors from "@fastify/cors";
import { CapabilitiesResponse } from "./schemas/CapabilitiesResponse";
import { QueryRequest } from "./schemas/QueryRequest";
import { QueryResponse } from "./schemas/QueryResponse";
import { SchemaResponse } from "./schemas/SchemaResponse";

import { getCapabilities } from "./handlers/capabilities";
import { getSchema } from "./handlers/schema";
import { postQuery } from "./handlers/query";
import { getConfig } from "./config";

const port = 8101;
const server = Fastify({logger: {transport: {target: "pino-pretty"}}});
const schema = getSchema();
const config = getConfig(schema);

server.register(FastifyCors, {
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    // Headers are removed from configuration header?
});

server.get<{Reply: CapabilitiesResponse}>(
    "/capabilities",
    async (request, _response) => {
        server.log.info(
            {
            headers: request.headers,
            query: request.body
        },
        "capabilities.request"
        );
    return getCapabilities();
    }
)

// schema.collections -> The "tables"/"items", should map directly to Qdrant collections
// schema.object_types -> The entity for a class. Should be able to extract and parse from Collection Info endpoint
// schema.scalar_types -> Scalars!!!!
// schema.procedures -> None at the moment
// schema.functions -> None at the moment
server.get<{ Reply: SchemaResponse}>(
    "/schema",
    async (request, _response) => {
        server.log.info({
            headers: request.headers,
            query: request.body
        },
        "schema.request"
        );
        return getSchema();
    }
)

server.post<{ Body: QueryRequest, Reply: QueryResponse }>(
    "/query",
    async (request, _response) => {
        server.log.info(
        //     {
        //     headers: request.headers,
        //     query: request.body
        // },
        "query.request"
        );
        return await postQuery(request.body, config);
    }
)

process.on("SIGINT", () => {
    server.log.info("Interupt");
    process.exit(0)
});

const start = async () => {
    try {
        await server.listen({port: port, host: "0.0.0.0"});
    } catch (err) {
        server.log.fatal(err);
        process.exit(1);
    }
};
start();