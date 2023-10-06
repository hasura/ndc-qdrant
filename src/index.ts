import {
    SchemaResponse,
    ObjectType,
    FunctionInfo,
    ProcedureInfo,
    QueryRequest,
    QueryResponse,
    MutationRequest,
    MutationResponse,
    CapabilitiesResponse,
    ExplainResponse,
    start,
    Connector,
    InternalServerError
} from "@hasura/ndc-sdk-typescript";
import { CAPABILITIES_RESPONSE, CONFIGURATION_SCHEMA } from "./constants";
import { doQuery } from "./handlers/query";
import { doExplain } from "./handlers/explain";
import { doGetSchema } from "./handlers/schema";
import { doUpdateConfiguration } from "./handlers/updateConfiguration";
import { JSONSchemaObject } from "@json-schema-tools/meta-schema";
console.info("INDEX ENTRYPOINT");

export interface ConfigurationSchema {
    collection_names: string[];
    object_fields: {[k: string]: string[]};
    object_types: { [k: string]: ObjectType};
    functions: FunctionInfo[];
    procedures: ProcedureInfo[];
}

export interface Configuration {
    qdrant_url: string;
    qdrant_api_key?: string;
    config?: ConfigurationSchema;
}

export interface State { }

const connector: Connector<Configuration, State> = {
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
        _: Configuration,
        __: unknown
    ): Promise<State> {
        console.info("INIT STATE CALLED");
        return Promise.resolve({});
    },

    /**
     * Get the connector's capabilities.
     *
     * This function implements the [capabilities endpoint](https://hasura.github.io/ndc-spec/specification/capabilities.html)
     * from the NDC specification.
     * @param configuration
     */
    get_capabilities(_: Configuration): CapabilitiesResponse {
        console.info("GIVING CAPABILITIES");
        return CAPABILITIES_RESPONSE;
    },

    /**
   * Return jsonschema for the configuration for this connector
   */
    get_configuration_schema(): JSONSchemaObject {
        console.info("GIVING CONFIGURATION SCHEMA");
        return CONFIGURATION_SCHEMA;
    },

    make_empty_configuration(): Configuration {
        console.info("MAKING EMPTY CONFIGURATION");
        const conf: Configuration = {
            qdrant_url: "",
            config: {
                collection_names: [],
                object_fields: {},
                object_types: {},
                functions: [],
                procedures: []
            }
        };
        return conf;
    },

    update_configuration(configuration: Configuration): Promise<Configuration> {
        console.info("UPDATING CONFIGURATION");
        return doUpdateConfiguration(configuration);
    },

    /**
     * Validate the raw configuration provided by the user,
     * returning a configuration error or a validated [`Connector::Configuration`].
     * @param configuration
     */
    validate_raw_configuration(
        configuration: Configuration
    ): Promise<Configuration> {
        console.info("VALIDATING CONFIGURATION NOT IMPLEMENTED YET");
        return Promise.resolve(configuration);
    },

    /**
     * Get the connector's schema.
     *
     * This function implements the [schema endpoint](https://hasura.github.io/ndc-spec/specification/schema/index.html)
     * from the NDC specification.
     * @param configuration
     */
    async get_schema(configuration: Configuration): Promise<SchemaResponse> {
        if (!configuration.config){
            throw new InternalServerError("Internal Server Error, server configuration is invalid", {});
        }
        console.info("GIVING SCHEMA");
        return Promise.resolve(doGetSchema(configuration.config.object_types, configuration.config.collection_names, configuration.config.functions, configuration.config.procedures));
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
        configuration: Configuration,
        _: State,
        request: QueryRequest
    ): Promise<ExplainResponse> {
        if (!configuration.config){
            throw new InternalServerError("Internal Server Error, server configuration is invalid", {});
        }
        return doExplain(request, configuration.config.collection_names, configuration.config.object_fields);
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
        _: State,
        request: QueryRequest
    ): Promise<QueryResponse> {
        console.info("QUERY ENTRY");
        if (!configuration.config){
            throw new InternalServerError("Internal Server Error, server configuration is invalid", {});
        }
        console.info(request);
        try {
            let res = doQuery(
                request,
                configuration.config.collection_names,
                configuration.config.object_fields,
                configuration.qdrant_url,
                configuration.qdrant_api_key);
            console.info(res);
            return res;
        } catch (e) {
            console.info(e);
            throw new Error("Unexpected Error");
        }
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
     * Return any read regions defined in the connector's configuration
     * @param configuration
     */
    get_read_regions(_: Configuration): string[] {
        return [];
    },

    /**
     * Return any write regions defined in the connector's configuration
     * @param configuration
     */
    get_write_regions(_: Configuration): string[] {
        return [];
    },

    /**
     * Check the health of the connector.
     *
     * For example, this function should check that the connector
     * is able to reach its data source over the network.
     * @param configuration
     * @param state
     */
    health_check(_: Configuration, __: State): Promise<undefined> {
        // TODO
        // https://qdrant.github.io/qdrant/redoc/index.html#tag/service/operation/healthz
        console.info("HEALTH-CHECKING");
        return Promise.resolve(undefined);
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
    fetch_metrics(_: Configuration, __: State): Promise<undefined> {
        // TODO: Metrics
        // https://qdrant.github.io/qdrant/redoc/index.html#tag/service/operation/metrics
        return Promise.resolve(undefined);
    },
};

start(connector);