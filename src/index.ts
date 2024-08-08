import {
    SchemaResponse,
    ObjectType,
    FunctionInfo,
    ProcedureInfo,
    QueryRequest,
    QueryResponse,
    MutationRequest,
    MutationResponse,
    Capabilities,
    ExplainResponse,
    start,
    Connector,
    Forbidden
} from "@hasura/ndc-sdk-typescript";
import { CAPABILITIES_RESPONSE } from "./constants";
import { doQuery } from "./handlers/query";
import { doExplain } from "./handlers/explain";
import { doGetSchema } from "./handlers/schema";
import { do_mutation } from "./handlers/mutation";
import {QdrantClient} from "@qdrant/js-client-rest";
import { getQdrantClient } from "./qdrant";
import { readFileSync } from "fs"; // Import synchronous file read function

const QDRANT_URL = process.env["QDRANT_URL"] as string;
let QDRANT_API_KEY = process.env["QDRANT_API_KEY"] as string | undefined;
if (QDRANT_API_KEY?.length === 0){
    QDRANT_API_KEY = undefined;
}

export type ConfigurationSchema = {
    collection_names: string[];
    object_fields: {[k: string]: string[]};
    object_types: { [k: string]: ObjectType};
    collection_vectors: {[k: string]: boolean};
    functions: FunctionInfo[];
    procedures: ProcedureInfo[];
}

export type Configuration = {
    config?: ConfigurationSchema;
}

export type State = {
    client: QdrantClient
}

const connector: Connector<Configuration, State> = {
  /**
   * Validate the configuration files provided by the user, returning a validated 'Configuration',
   * or throwing an 'Error'. Throwing an error prevents Connector startup.
   * @param configuration
   */
  parseConfiguration(configurationDir: string): Promise<Configuration> {
    let filePath = `${configurationDir}/config.json`;
    if (configurationDir.length === 0){
        filePath = "config.json";
    }
    try {
      const fileContent = readFileSync(filePath, 'utf8');
      const configObject: Configuration = JSON.parse(fileContent);
      return Promise.resolve(configObject);
    } catch (error) {
      console.error("Failed to parse configuration:", error);
      throw new Forbidden(
        "Internal Server Error, server configuration is invalid",
        {}
      );
    }

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
    tryInitState(
        _: Configuration,
        __: unknown
    ): Promise<State> {
        const client = getQdrantClient(QDRANT_URL, QDRANT_API_KEY);
        return Promise.resolve({
            client: client
        });
    },

    /**
     * Get the connector's capabilities.
     *
     * This function implements the [capabilities endpoint](https://hasura.github.io/ndc-spec/specification/capabilities.html)
     * from the NDC specification.
     * @param configuration
     */
    getCapabilities(_: Configuration): Capabilities {
        return CAPABILITIES_RESPONSE;
    },

    /**
     * Get the connector's schema.
     *
     * This function implements the [schema endpoint](https://hasura.github.io/ndc-spec/specification/schema/index.html)
     * from the NDC specification.
     * @param configuration
     */
    async getSchema(configuration: Configuration): Promise<SchemaResponse> {
        if (!configuration.config){
            throw new Forbidden("Internal Server Error, server configuration is invalid", {});
        }
        return Promise.resolve(doGetSchema(configuration.config.object_types, configuration.config.collection_names, configuration.config.functions, configuration.config.procedures, configuration.config.collection_vectors));
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
    queryExplain(
        configuration: Configuration,
        _: State,
        request: QueryRequest
    ): Promise<ExplainResponse> {
        if (!configuration.config){
            throw new Forbidden("Internal Server Error, server configuration is invalid", {});
        }
        return doExplain(request, configuration.config.collection_names, configuration.config.object_fields, configuration.config.collection_vectors);
    },

      /**
   * Explain a mutation by creating an execution plan
   * @param configuration
   * @param state
   * @param request
   */
  mutationExplain(
    configuration: Configuration,
    _: State,
    request: MutationRequest
  ): Promise<ExplainResponse> {
    if (!configuration.config) {
      throw new Forbidden(
        "Internal Server Error, server configuration is invalid",
        {}
      );
    }
    throw new Forbidden("Not implemented", {});
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
        if (!configuration.config){
            throw new Forbidden("Internal Server Error, server configuration is invalid", {});
        }
        return doQuery(
                state,
                request,
                configuration.config.collection_names,
                configuration.config.object_fields,
                configuration.config.collection_vectors
                );
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
        if (!configuration.config){
            throw new Forbidden("Internal Server Error, server configuration is invalid", {});
        }
        return do_mutation(
            configuration,
            state,
            request
            );
    },

    /**
     * Check the health of the connector.
     *
     * For example, this function should check that the connector
     * is able to reach its data source over the network.
     * @param configuration
     * @param state
     */
    getHealthReadiness(_: Configuration, __: State): Promise<undefined> {
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
    fetchMetrics(_: Configuration, __: State): Promise<undefined> {
        // TODO: Metrics
        // https://qdrant.github.io/qdrant/redoc/index.html#tag/service/operation/metrics
        return Promise.resolve(undefined);
    },
};

start(connector);