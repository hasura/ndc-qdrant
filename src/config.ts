import { SchemaResponse } from "./schemas/SchemaResponse";
import { FastifyRequest } from "fastify";
import { SCALAR_TYPES, FUNCTIONS, PROCEDURES, DEFAULT_QDRANT_URL } from "./constants";

export type QdrantClientConfig = {
    url: string;
    apiKey: string | null;
}


export type QdrantConfig = {
    clientConfig: QdrantClientConfig,
    schema: SchemaResponse,
    collections: string[];
    collectionFields: { [collectionName: string]: string[] };
}

export const getConfig = (request: FastifyRequest | null, requestSchema: SchemaResponse | null): QdrantConfig => {
    let url: string = DEFAULT_QDRANT_URL;
    let apiKey: string | null = null;
    let schema: SchemaResponse | null = null;
    if (request !== null) {
        schema = {
            "scalar_types": SCALAR_TYPES,
            "object_types": {},
            "collections": [],
            "functions": FUNCTIONS, // Does not have any functions yet, might be useful to add some later
            "procedures": PROCEDURES // Does not have any procedures yet, might be useful to add some later
        };
        // Parse the schema from the request headers to collect the object_types and collections
        if (request.headers.schema !== undefined && typeof request.headers.schema === "string") {
            try {
                const parsedSchema = JSON.parse(request.headers.schema);
                if (parsedSchema.object_types !== undefined) {
                    schema.object_types = parsedSchema.object_types;
                }
                if (parsedSchema.collections !== undefined) {
                    schema.collections = parsedSchema.collections;
                }
            } catch (error) {
                throw new Error("Failed to parse schema from headers");
            }
        }
        // If a new qdrant url has been passed in the headers, we will connect to that qdrant instance for our query instead
        if (request.headers.qdrant_url !== undefined && typeof request.headers.qdrant_url === "string") {
            url = request.headers.qdrant_url;
        }
        // If an API key has been passed in the headers, we will use that API key to connect to Qdrant cloud!
        if (request.headers.qdrant_api_key !== undefined && typeof request.headers.qdrant_api_key === "string") {
            apiKey = request.headers.qdrant_api_key;
        }
    } else if (request === null && requestSchema !== null) { // This overload allows testing to pass their known schema's for performing tests.
        schema = requestSchema;
    } else {
        throw new Error("Failed to load config");
    }
    let cols: string[] = [];
    let collectionFields: { [collectionName: string]: string[] } = {};
    for (let c of schema.collections) {
        cols.push(c.name);
    }
    for (let [collectionName, collectionObj] of Object.entries(schema.object_types)) {
        collectionFields[collectionName] = Object.keys(collectionObj.fields);
    }
    return {
        clientConfig: {
            url: url,
            apiKey: apiKey
        },
        schema: schema,
        collections: cols,
        collectionFields: collectionFields
    }
}