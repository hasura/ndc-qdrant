import { SchemaResponse, ObjectType, CollectionInfo } from "ts-connector-sdk/schemas/SchemaResponse";
import { QueryRequest } from "ts-connector-sdk/schemas/QueryRequest";
import { QueryResponse } from "ts-connector-sdk/schemas/QueryResponse";
import { MutationRequest } from "ts-connector-sdk/schemas/MutationRequest";
import { MutationResponse } from "ts-connector-sdk/schemas/MutationResponse";
import { CapabilitiesResponse } from "ts-connector-sdk/schemas/CapabilitiesResponse";
import { ExplainResponse } from "ts-connector-sdk/schemas/ExplainResponse";
import { Connector } from "ts-connector-sdk/src/connector";
import { start } from "ts-connector-sdk/src/index";
import { CAPABILITIES_RESPONSE, SCALAR_TYPES, FUNCTIONS, PROCEDURES } from "./constants";
import { postQuery } from "./handlers/query";
import { getQdrantClient } from "./qdrant";
import { explainQuery } from "./handlers/explain";


// TODO: Update config -> Store more here?
export interface Configuration {
    read_regions: string[];
    write_regions: string[];
    object_types: { [k: string]: ObjectType };
    collections: CollectionInfo[];
    qdrant_url: string;
    qdrant_api_key: string | null;
}

export interface State {
    schema: SchemaResponse;
    collectionNames: string[];
    collectionFields: { [collectionName: string]: string[] };
}

const connector: Connector<Configuration, State> = {
    /**
   * Return jsonschema for the configuration for this connector
   */
    get_configuration_schema(): unknown {
        // TODO: Return configuration schema
        return null;
    },
    /**
     * Return any read regions defined in the connector's configuration
     * @param configuration
     */
    get_read_regions(configuration: Configuration): string[] {
        return configuration.read_regions;
    },
    /**
     * Return any write regions defined in the connector's configuration
     * @param configuration
     */
    get_write_regions(configuration: Configuration): string[] {
        return configuration.write_regions;
    },

    make_empty_configuration(): Configuration {
        const conf: Configuration = {
            read_regions: [],
            write_regions: [],
            object_types: {},
            collections: [],
            qdrant_url: "http://localhost:6333",
            qdrant_api_key: null
        };
        return conf;
    },

    update_configuration(configuration: Configuration): Promise<Configuration> {
        // TODO: What should this do?
        return Promise.resolve(configuration);
    },
    /**
     * Validate the raw configuration provided by the user,
     * returning a configuration error or a validated [`Connector::Configuration`].
     * @param configuration
     */
    validate_raw_configuration(
        configuration: Configuration
    ): Promise<Configuration> {
        // TODO
        return Promise.resolve(configuration);
    },

    /**
     * Initialize the connector's in-memory state.
     *
     * For example, any connection pools, prepared queries,
     * or other managed resources would be allocated here.
     *
     * In addition, this function should register any
     * connector-specific metrics with the metrics registry.
     * @param configuration
     * @param metrics
     */
    try_init_state(
        configuration: Configuration,
        metrics: unknown
    ): Promise<State> {
        const schemaResponse: SchemaResponse = {
            scalar_types: SCALAR_TYPES,
            functions: FUNCTIONS,
            procedures: PROCEDURES,
            object_types: configuration.object_types,
            collections: configuration.collections
        };
        let cols: string[] = [];
        let collectionFields: { [collectionName: string]: string[] } = {};
        for (let c of schemaResponse.collections) {
            cols.push(c.name);
        }
        for (let [collectionName, collectionObj] of Object.entries(schemaResponse.object_types)) {
            collectionFields[collectionName] = Object.keys(collectionObj.fields);
        }
        const state: State = {
            schema: schemaResponse,
            collectionNames: cols,
            collectionFields: collectionFields
        };
        return Promise.resolve(state);
    },

    /**
     *
     * Update any metrics from the state
     *
     * Note: some metrics can be updated directly, and do not
     * need to be updated here. This function can be useful to
     * query metrics which cannot be updated directly, e.g.
     * the number of idle connections in a connection pool
     * can be polled but not updated directly.
     * @param configuration
     * @param state
     */
    fetch_metrics(configuration: Configuration, state: State): Promise<undefined> {
        // TODO: Metrics
        return Promise.resolve(undefined);
    },
    /**
     * Check the health of the connector.
     *
     * For example, this function should check that the connector
     * is able to reach its data source over the network.
     * @param configuration
     * @param state
     */
    health_check(configuration: Configuration, state: State): Promise<undefined> {
        // TODO
        const client = getQdrantClient(configuration.qdrant_url, configuration.qdrant_api_key);
        return Promise.resolve(undefined);
    },

    /**
     * Get the connector's capabilities.
     *
     * This function implements the [capabilities endpoint](https://hasura.github.io/ndc-spec/specification/capabilities.html)
     * from the NDC specification.
     * @param configuration
     */
    get_capabilities(configuration: Configuration): Promise<CapabilitiesResponse> {
        return Promise.resolve(CAPABILITIES_RESPONSE);
    },

    /**
     * Get the connector's schema.
     *
     * This function implements the [schema endpoint](https://hasura.github.io/ndc-spec/specification/schema/index.html)
     * from the NDC specification.
     * @param configuration
     */
    get_schema(configuration: Configuration): Promise<SchemaResponse> {
        const schemaResponse: SchemaResponse = {
            scalar_types: SCALAR_TYPES,
            functions: FUNCTIONS,
            procedures: PROCEDURES,
            object_types: configuration.object_types,
            collections: configuration.collections
        };
        return Promise.resolve(schemaResponse);
    },

    /**
     * Explain a query by creating an execution plan
     *
     * This function implements the [explain endpoint](https://hasura.github.io/ndc-spec/specification/explain.html)
     * from the NDC specification.
     * @param configuration
     * @param state
     * @param request
     */
    explain(
        _: Configuration,
        state: State,
        request: QueryRequest
    ): Promise<ExplainResponse> {
        return explainQuery(request, state.collectionNames, state.collectionFields);
    },

    /**
     * Execute a mutation
     *
     * This function implements the [mutation endpoint](https://hasura.github.io/ndc-spec/specification/mutations/index.html)
     * from the NDC specification.
     * @param configuration
     * @param state
     * @param request
     */
    mutation(
        configuration: Configuration,
        state: State,
        request: MutationRequest
    ): Promise<MutationResponse> {
        throw new Error("Mutation endpoint not implemented!");
    },

    /**
     * Execute a query
     *
     * This function implements the [query endpoint](https://hasura.github.io/ndc-spec/specification/queries/index.html)
     * from the NDC specification.
     * @param configuration
     * @param state
     * @param request
     */
    query(
        configuration: Configuration,
        state: State,
        request: QueryRequest
    ): Promise<QueryResponse> {
        return postQuery(
            request,
            state.collectionNames,
            state.collectionFields,
            configuration.qdrant_url,
            configuration.qdrant_api_key);
    }
};

start(connector);