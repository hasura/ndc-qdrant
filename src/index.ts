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
    ExplainResponse
} from "ts-connector-sdk/src/schemas";
import { start, Connector } from "ts-connector-sdk/src/index";
import { CAPABILITIES_RESPONSE } from "./constants";
import { doQuery } from "./handlers/query";
import { doExplain } from "./handlers/explain";
import { doGetSchema } from "./handlers/schema";
import { doUpdateConfiguration } from "./handlers/updateConfiguration";
import { JSONSchemaObject } from "@json-schema-tools/meta-schema";

export interface ConfigurationSchema {
    collection_names: string[];
    object_fields: {[k: string]: string[]};
    object_types: { [k: string]: ObjectType};
    functions: FunctionInfo[];
    procedures: ProcedureInfo[];
}

// TODO: Update config -> Store more here?
export interface Configuration {
    qdrant_url: string;
    qdrant_api_key?: string;
    config: ConfigurationSchema;
}

// JSON-schema generator package -> 
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
        return CAPABILITIES_RESPONSE;
    },

    /**
   * Return jsonschema for the configuration for this connector
   */
    get_configuration_schema(): JSONSchemaObject {
        return {};
    },

    make_empty_configuration(): Configuration {
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
        // TODO -> Ensure that all object_types exist?
        return Promise.resolve(configuration);
    },

    /**
     * Get the connector's schema.
     *
     * This function implements the [schema endpoint](https://hasura.github.io/ndc-spec/specification/schema/index.html)
     * from the NDC specification.
     * @param configuration
     */
    get_schema(configuration: Configuration): SchemaResponse {
        return doGetSchema(configuration.config.object_types, configuration.config.collection_names, configuration.config.functions, configuration.config.procedures);
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
        return doQuery(
            request,
            configuration.config.collection_names,
            configuration.config.object_fields,
            configuration.qdrant_url,
            configuration.qdrant_api_key);
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