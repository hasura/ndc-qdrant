import {QueryRequest, Expression, QueryResponse, RowSet, RowFieldValue, Conflict, Forbidden} from "@hasura/ndc-sdk-typescript";
import { components } from "@qdrant/js-client-rest/dist/types/openapi/generated_schema";
import { MAX_32_INT } from "../constants";
import { State } from "..";

type QueryFilter = components["schemas"]["Filter"];
type SearchRequest = components["schemas"]["SearchRequest"];
type NamedVectorStruct = components["schemas"]["NamedVectorStruct"];
type ScrollRequest = components["schemas"]["ScrollRequest"];
type RecommendRequest = components["schemas"]["RecommendRequest"];

// TODO: Multi-Vector
// Group By
// With lookup

export type QueryPlan = {
    collectionName: string;
    scrollQueries: ScrollRequest[];
    searchQueries: SearchRequest[];
    recommendQueries: RecommendRequest[];
    dropAggregateRows: string[];
    fieldAliases: {[key: string]: string}
};

type VarSet = {
    [key: string]: any
};

type QueryCollection = {
    searchRequest: SearchRequest | null;
    scrollRequest: ScrollRequest | null;
    recomendRequest: RecommendRequest | null;
};

type SearchQuantization = {
    ignore?: boolean; // false default
    rescore?: boolean; // false default
    oversampling?: number; 
};

type SearchParams = {
    hnsw_ef?: number;
    exact?: boolean; // false default
    indexed_only?: boolean; // false default
    quantization?: SearchQuantization
};

type SearchArguments = {
    vector: number[];
    name?: string;
    params?: SearchParams;
    score_threshold?: number;
};

type RecommendArguments = {
    positive: number[];
    negative?: number[];
    params?: SearchParams;
    score_threshold?: number;
    using?: string;
};

// Helper function to determine if a value is a float
const isFloat = (v: any) => !isNaN(v) && Math.floor(v) !== Math.ceil(v);

/**
 * Constructs a filter based on the provided expression, potentially using recursion for nested expressions.
 * 
 * This function constructs a `QueryFilter` for a given `Expression`. The filter creation process 
 * depends on the type of the expression and its components. The function handles various expression types,
 * including unary comparison, binary comparison, binary array comparison, logical operators (AND, OR, NOT), 
 * and others.
 * 
 * @param {Expression} expression - The expression based on which the filter needs to be constructed.
 * @param {QueryFilter} filter - The filter object to which the conditions should be added.
 * @param {VarSet | null} varSet - Variable set that may be used to resolve variable-based arguments in the expression.
 * @returns {QueryFilter} - The constructed filter based on the provided expression.
 * @throws {Error} Throws an error if the provided expression type or its components are not supported or are in an incorrect format.
 * @example
 *   const myFilter = recursiveBuildFilter(myExpression, {}, myVarSet);
 */
function recursiveBuildFilter(expression: Expression, filter: QueryFilter, varSet: VarSet | null): QueryFilter {
    switch (expression.type) {
        case "unary_comparison_operator":
            switch (expression.operator) {
                case "is_null":
                    filter.must = [
                        {
                            is_empty: {
                                key: expression.column.name
                            }
                        }
                    ]
                    break;
                default:
                    throw new Forbidden("Unknown Unary Comparison Operator", {"Unknown Operator": "This should never happen."});
            }
            break;
        case "binary_comparison_operator":
            let value: any;
            switch (expression.value.type) {
                case "scalar":
                    value = expression.value.value
                    break;
                case "column":
                    throw new Forbidden("Binary comparisons on columns are not supported yet.", {});
                case "variable":
                    if (varSet !== null) {
                        value = varSet[expression.value.name];
                    }
                    break;
                default:
                    throw new Forbidden("Unknown Binary Comparison Operator", {"Unknown Expression Value Type": "This should never happen."});
            }

            if (expression.column.type === "column" && expression.column.path.length > 0){
                throw new Forbidden("Not supported yet.");
            }

            // switch (expression.operator.type) {
            switch (expression.operator) {
                case "eq":
                    if (expression.column.name === "id") {
                        filter.must = [
                            {
                                "has_id": [value]
                            }
                        ];
                    } else if (typeof value === "number" && isFloat(value)) {
                        filter.must = [
                            {
                                key: expression.column.name,
                                range: {
                                    gte: value,
                                    lte: value
                                }
                            }
                        ]
                    }
                    else if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
                        filter.must = [
                            {
                                key: expression.column.name,
                                match: { value }
                            }
                        ];
                    } else {
                        throw new Forbidden(`Cannot perform equality comparison on ${expression.column.name}`, {});
                    }
                    break;
                case "like":
                    if (typeof value === "string") {
                        filter.must = [
                            {
                                key: expression.column.name,
                                match: {
                                    "text": value
                                }
                            }
                        ]
                    } else {
                        throw new Forbidden(`Like is not implemented for ${typeof value}`, {});
                    }
                    break;
                case "gt":
                    if (expression.column.name === "id") {
                        throw new Forbidden("Cannot perform > operation on column ID", {});
                    }
                    if (typeof value === "number") {
                        filter.must = [
                            {
                                key: expression.column.name,
                                range: {
                                    gt: value
                                }
                            }
                        ]
                    } else {
                        throw new Forbidden("> operation only supported by number types", {});
                    }
                    break;
                case "lt":
                    if (expression.column.name === "id") {
                        throw new Forbidden("Cannot perform < operation on column ID", {});
                    }
                    if (typeof value === "number") {
                        filter.must = [
                            {
                                key: expression.column.name,
                                range: {
                                    lt: value
                                }
                            }
                        ]
                    } else {
                        throw new Forbidden("< operation only supported by number types", {});
                    }
                    break;
                case "gte":
                    if (expression.column.name === "id") {
                        throw new Forbidden("Cannot perform >= operation on column ID", {});
                    }
                    if (typeof value === "number") {
                        filter.must = [
                            {
                                key: expression.column.name,
                                range: {
                                    gte: value
                                }
                            }
                        ]
                    } else {
                        throw new Forbidden(">= operation only supported by number types", {});
                    }
                    break;
                case "lte":
                    if (expression.column.name === "id") {
                        throw new Forbidden("Cannot perform <= operation on column ID", {});
                    }
                    if (typeof value === "number") {
                        filter.must = [
                            {
                                key: expression.column.name,
                                range: {
                                    lte: value
                                }
                            }
                        ]
                    } else {
                        throw new Forbidden("<= operation only supported by number types", {});
                    }
                    break;
                default:
                    throw new Forbidden("Binary Comparison Custom Operator not implemented", {"Unknown Expression Value Type": "This should never happen."});
            }
            break;
        // case "binary_array_comparison_operator":
        //     if (expression.operator === "in") {
        //         if (expression.values.length === 0) {
        //             throw new NotSupported("In requires an array of items", {});
        //         }
        //         if (expression.column.name === "id") {
        //             filter.must = [
        //                 {
        //                     "has_id": expression.values.map(val => val.type === "scalar" ? val.value : undefined) as (string | number)[]
        //                 }
        //             ];
        //             break;
        //         }
        //         if (expression.column.name === "vector") {
        //             throw new NotSupported("Vector in not implemented", {});
        //         }
        //         let matchList: any[] = [];
        //         for (let val of expression.values) {
        //             switch (val.type) {
        //                 case "scalar":
        //                     matchList.push(val.value);
        //                     break;
        //                 case "variable":
        //                     // Is this not in spec?
        //                     throw new NotSupported("In not supported by variables", {});
        //                 case "column":
        //                     throw new NotSupported("In not supported on columns", {});
        //                 default:
        //                     throw new BadRequest("In not supported on unknown value type", {});
        //             }
        //         }
        //         filter.must = [
        //             {
        //                 key: expression.column.name,
        //                 match: { any: matchList }
        //             }
        //         ]
        //     } else {
        //         throw new BadRequest("Binary Array Comparison Operator not implemented!", {});
        //     }
        //     break;
        case "and":
            filter.must = expression.expressions.map(expr => recursiveBuildFilter(expr, {}, varSet));
            break;
        case "or":
            filter.should = expression.expressions.map(expr => recursiveBuildFilter(expr, {}, varSet))
            break;
        case "not":
            filter.must_not = [recursiveBuildFilter(expression.expression, {}, varSet)];
            break;
        case "exists":
            throw new Forbidden("Expression type Exists not implemented!", {});
        default:
            throw new Forbidden("Unknown Expression Type!", {});
    }
    return filter;
};

/**
 * Constructs the appropriate search or scroll request based on the provided query request and other parameters.
 * 
 * This function, based on whether a vector search is required or not, creates either a vector search request or 
 * a scroll request. The function uses helper functions like `recursiveBuildFilter` to create complex query 
 * filters if needed.
 * 
 * @param {QueryRequest} query - The main query request containing filtering, arguments, and other details.
 * @param {boolean} vectorSearch - Indicates if a vector-based search needs to be performed.
 * @param {string[]} includedPayloadFields - List of fields from the payload to be included in the response.
 * @param {boolean} includeVector - Indicates if the vector itself should be included in the response.
 * @param {VarSet | null} varSet - Variable set that may be used to resolve variable-based arguments in the query.
 * @returns {Promise<QueryCollection>} - Returns a promise that resolves to a query collection containing either a search request or a scroll request.
 * @throws {Error} Throws an error if the required arguments or request types are not provided or are in an incorrect format.
 * @example
 *   const queryCol = await collectQueries(myQuery, true, ['field1', 'field2'], true, myVarSet);
 * 
 */
async function collectQuery(query: QueryRequest,
    includedPayloadFields: string[],
    includeVector: boolean,
    varSet: VarSet | null): Promise<QueryCollection> {
    // Recursively build the query filter.
    let filter: QueryFilter = {};
    // if (query.query.where !== undefined) {
    //     filter = recursiveBuildFilter(query.query.where!, filter, varSet);
    // }

    if (query.query.predicate) {
        filter = recursiveBuildFilter(query.query.predicate, filter, varSet);
    }

    let searchRequest: SearchRequest | null = null;
    let scrollRequest: ScrollRequest | null = null;
    let recommendRequest: RecommendRequest | null = null;
    if (query.arguments.search) {
        let searchArgs: SearchArguments;
        if (query.arguments.search.type === "literal"){
            searchArgs = query.arguments.search.value as SearchArguments;
        } else if (query.arguments.search.type === "variable" && varSet !== null) {
            searchArgs = varSet[query.arguments.search.name] as SearchArguments;
        } else {
            throw new Forbidden("Unknown search argument type", {});
        }
        searchRequest = {
            vector: searchArgs.name ? {vector: searchArgs.vector, name: searchArgs.name} : searchArgs.vector,
            with_vector: includeVector,
            with_payload: {
                include: includedPayloadFields
            },
            filter: filter,
            offset: (query.query.offset !== undefined && query.query.offset !== null) ? query.query.offset! + 1 : 0,
            limit: (query.query.limit !== undefined && query.query.limit !== null) ? query.query.limit! : MAX_32_INT
        };
        if (searchArgs.params){
            searchRequest.params = searchArgs.params;
        }
        if (searchArgs.score_threshold){
            searchRequest.score_threshold = searchArgs.score_threshold;
        }
    } else if (query.arguments.recommend){
        let recommendArgs: RecommendArguments;
        if (query.arguments.recommend.type === "literal"){
            recommendArgs = query.arguments.recommend.value as RecommendArguments;
        } else if (query.arguments.recommend.type === "variable" && varSet !== null){
            recommendArgs = varSet[query.arguments.recommend.name] as RecommendArguments;
        } else {
            throw new Forbidden("Unknown recommend argument type", {});
        }
        recommendRequest = {
            positive: recommendArgs.positive,
            with_vector: includeVector,
            with_payload: {include: includedPayloadFields},
        filter: filter,
        offset: (query.query.offset !== undefined && query.query.offset !== null) ? query.query.offset! + 1 : 0,
        limit: (query.query.limit !== undefined && query.query.limit !== null) ? query.query.limit! : MAX_32_INT
        }
        if (recommendArgs.negative){
            recommendRequest.negative = recommendArgs.negative;
        }
        if (recommendArgs.params){
            recommendRequest.params = recommendArgs.params;
        }
        if (recommendArgs.score_threshold){
            recommendRequest.score_threshold = recommendArgs.score_threshold;
        }
        if (recommendArgs.using){
            recommendRequest.using = recommendArgs.using;
        }
    } else {
        scrollRequest = {
            with_vector: includeVector,
            with_payload: {
                include: includedPayloadFields
            },
            filter: filter,
            offset: (query.query.offset !== undefined && query.query.offset !== null) ? query.query.offset! + 1 : 0,
            limit: (query.query.limit !== undefined && query.query.limit !== null) ? query.query.limit! : MAX_32_INT
        }
    }

    if (searchRequest === null && scrollRequest === null && recommendRequest === null) {
        throw new Forbidden("Must supply a search/scroll/reccomend request.", {});
    }

    let queryCollection: QueryCollection = {
        searchRequest: searchRequest,
        scrollRequest: scrollRequest,
        recomendRequest: recommendRequest
    };
    return queryCollection;
};

/**
 * Performs aggregation operations on a single row based on the specified aggregate criteria in the query.
 * 
 * The function supports various aggregation operations such as sum, average, count, and distinct count. 
 * It modifies the passed `aggResults` object in place to accumulate the aggregation results over multiple rows.
 * Additionally, the function uses the `aggVars` object as a storage for intermediate aggregate values 
 * (e.g., for distinct count operation).
 * 
 * @param {{[key: string]: any}} aggResults - Accumulated aggregate results. This object is updated in place.
 * @param {{[key: string]: any}} aggVars - Intermediate storage for certain aggregate operations, e.g., storing unique values for the distinct count.
 * @param {QueryRequest} query - The main query request that contains the aggregate criteria.
 * @param {RowFieldValue} row - The single row of data on which the aggregate operations need to be performed.
 * @param {number} numRows - Total number of rows over which the aggregates are computed. Used in certain operations like average.
 * @returns {{[key: string]: any}} - Returns the updated `aggResults` object.
 * @throws {Error} Various errors can be thrown depending on the unsupported aggregate operations or data types.
 * @example
 *   const aggResult = rowAggregate(accumulatedAggs, aggVariables, myQuery, singleRow, totalRows);
 * 
 */
function rowAggregate(aggResults: { [key: string]: any }, aggVars: { [key: string]: any }, query: QueryRequest, row: any, numRows: number): { [key: string]: any } {
    if (query.query.aggregates !== undefined && query.query.aggregates !== null) {
        for (let [key, agg] of Object.entries(query.query.aggregates)) {
            switch (agg.type) {
                case "single_column":
                    switch (agg.function) {
                        case "sum":
                            if (typeof row[agg.column] === "number") {
                                if (aggResults[key] === undefined) {
                                    aggResults[key] = 0;
                                }
                                aggResults[key] += row[agg.column];
                                break;
                            } else if (typeof row[agg.column] === "string") { // I added a string aggregate, might be useful. ;)
                                if (aggResults[key] === undefined) {
                                    aggResults[key] = "";
                                }
                                aggResults[key] += row[agg.column];
                                break;
                            } else {
                                throw new Forbidden("Sum operation not supported on this type", {});
                            }
                        case "avg":
                            if (typeof row[agg.column] === "number") {
                                if (aggResults[key] === undefined) {
                                    aggResults[key] = 0;
                                }
                                aggResults[key] += (row[agg.column] as unknown as number / numRows) as number;
                                break;
                            } else {
                                throw new Forbidden("Average operation not supported on this type", {});
                            }
                        default:
                            throw new Forbidden("Unknown aggregate operation not supported!", {});
                    }
                    break;
                case "column_count":
                    if (aggVars[key] === undefined) {
                        aggVars[key] = [];
                    }
                    if (aggResults[key] === undefined) {
                        aggResults[key] = 0;
                    }
                    if (row[agg.column] !== null && row[agg.column] !== undefined) {
                        if (agg.distinct) {
                            if (Array.isArray(aggVars[key]) && !aggVars[key].includes(row[agg.column])) {
                                aggVars[key].push(row[agg.column]);
                                aggResults[key] += 1;
                            }
                        } else {
                            aggResults[key] += 1;
                        }
                    }
                    break;
                case "star_count":
                    if (aggResults[key] === undefined) {
                        aggResults[key] = 0;
                    }
                    aggResults[key] += 1;
                    break;
                default:
                    throw new Forbidden("Unkown aggregate type not supported.", {});
            }
        }
    }
    return aggResults;
};

/**
 * Plans and prepares the set of queries that need to be executed based on the provided input query request.
 * 
 * This function checks various conditions in the query such as the collection name, relationships, fields, 
 * ordering, arguments, etc., and creates a plan in the form of scroll or search queries. This planning is
 * essential to understand how the actual queries will be run against the qdrant service.
 * 
 * @async
 * @param {QueryRequest} query - The main query request that specifies what data needs to be fetched.
 * @param {string[]} collectionNames - List of available collections in the qdrant service.
 * @param {{[key: string]: string[]}} collectionFields - Mapping of each collection to its fields, indicating which fields are available in each collection.
 * @returns {Promise<QueryPlan>} - A promise that resolves to a query plan. The plan indicates which type of queries need to be run (scroll or search), the fields that need to be retrieved, and any other specific details.
 * @throws {Error} Various errors can be thrown if the provided query does not match the expected criteria such as if the collection is not found, if querying with relationships is attempted, if fields are null or if ordering is specified.
 * @example
 *   const myQueryPlan = await planQueries(myQuery, availableCollections, availableFields);
 */
export async function planQueries(query: QueryRequest, collectionNames: string[], collectionFields: { [key: string]: string[] }, collectionVectors: {[k: string]: boolean}): Promise<QueryPlan> {
    // Assert that the collection is registered in the schema
    if (!collectionNames.includes(query.collection)) {
        throw new Conflict("Collection not found in schema!", {});
    }

    // Currently not planning to implement relationships - Does not make sense for DB target
    if (Object.keys(query.collection_relationships).length !== 0) {
        throw new Forbidden("Querying with collection relationships not implemented yet!", {});
    }

    // Sorting not supported by database!
    if (query.query.order_by !== undefined && query.query.order_by !== null) {
        throw new Forbidden("Order by not implemented", {});
    }

    // Collect the payload fields to include in the response. 
    let includedPayloadFields: string[] = [];
    let includeVector: boolean = false;
    let fieldAliases: {[k: string]: string} = {};
    if (query.query.fields !== null && query.query.fields !== undefined){
        for (const [fieldName, fieldDetails] of Object.entries(query.query.fields)) {
            if (fieldDetails.type === "column"){
                // if (fieldName === "vector") {
                if (fieldDetails.column === "vector") {
                    includeVector = true;
                } else if (!collectionFields[query.collection].includes(fieldDetails.column)) {
                    throw new Forbidden(`Requested field ${fieldName} not in schema!`, {});
                } else {
                    if (!includedPayloadFields.includes(fieldDetails.column)){
                        includedPayloadFields.push(fieldDetails.column);
                    }
                }
                fieldAliases[fieldName] = fieldDetails.column
            } else if (fieldDetails.type === "relationship"){
                throw new Forbidden("Relationships not implemented", {});
            }
        }
    }

    // Here we collect all the queries we might want to make.
    let scrollQueries: ScrollRequest[] = [];
    let searchQueries: SearchRequest[] = [];
    let recommendQueries: RecommendRequest[] = [];

    let queryResponse: QueryCollection;
    if (query.variables === undefined || query.variables === null) {
        // In the simplest case, we do not have any variables! So we will only have 1 request to make.
        queryResponse = await collectQuery(
            query,
            includedPayloadFields, // MARK
            includeVector,
            null
        );
        if (queryResponse.scrollRequest !== null) {
            scrollQueries.push(queryResponse.scrollRequest);
        } else if (queryResponse.searchRequest !== null) {
            searchQueries.push(queryResponse.searchRequest);
        } else if (queryResponse.recomendRequest !== null) {
            recommendQueries.push(queryResponse.recomendRequest);
        } else {
            throw new Forbidden("Unknown Query type not supported", {});
        }
    } else {
        // When there are variables, we will build multiple queries, which we will either run concurrently, or as a batch if batching is supported. It's only possible to either perform ALL searches, or ALL scrolls.
        let promises = query.variables.map(varSet => {
            let vSet: VarSet = varSet;
            return collectQuery(
                query,
                includedPayloadFields,
                includeVector,
                vSet
            );
        });
        let results = await Promise.all(promises);
        for (let result of results) {
            if (result.scrollRequest !== null) {
                scrollQueries.push(result.scrollRequest);
            } else if (result.searchRequest !== null) {
                searchQueries.push(result.searchRequest);
            } else if (result.recomendRequest !== null) {
                recommendQueries.push(result.recomendRequest);
            } else {
                throw new Forbidden("Unknown Query Type not supported", {});
            }
        }
    };

    let aggregateKeys: string[] = [];
    let dropAggregateRows: string[] = [];
    if (Array.isArray(query.query.aggregates)) {
        for (let agg of Object.values(query.query.aggregates)) {
            if (agg.type !== "star_count") {
                aggregateKeys.push(agg.column);
                if (!includedPayloadFields.includes(agg.column)) {
                    includedPayloadFields.push(agg.column);
                    dropAggregateRows.push(agg.column);
                }
            }
        }
    };

    return {
        collectionName: query.collection,
        scrollQueries: scrollQueries,
        searchQueries: searchQueries,
        recommendQueries: recommendQueries,
        dropAggregateRows: dropAggregateRows,
        fieldAliases: fieldAliases
    };
};

/**
 * Executes a set of queries against a qdrant service and retrieves the results.
 * 
 * This function can handle both scroll and search queries. Scroll queries fetch a particular set of points, 
 * while search queries retrieve points based on certain search criteria. Both types of queries are performed against
 * a specified collection in the qdrant service.
 * 
 * @async
 * @param {QueryRequest} query - The original query request.
 * @param {QueryPlan} queryPlan - The query plan
 * @param {string} qdrantUrl - The URL endpoint for the qdrant service.
 * @param {string | null} qdrantApiKey - The API key for the qdrant service. Can be null if not required.
 * @returns {Promise<RowSet[]>} - A promise that resolves to an array of row sets. Each row set contains 
 *                                the rows of data retrieved from the query and any associated aggregate results.
 * @throws {Error} If an unknown type of query is provided or if an unsupported field is encountered in the results.
 * @example
 *   const rowSets = await performQueries(query, "myCollection", [], searchRequests, "https://qdrant.url", "api_key", ["id", "vector"], []);
 */
export async function performQueries(
    state: State,
    query: QueryRequest,
    queryPlan: QueryPlan): Promise<RowSet[]> {
    let rowSets: RowSet[] = [];
    let results: {
        id: string | number;
        version?: number;
        score?: number;
        payload?: Record<string, unknown> | {
            [key: string]: unknown;
        } | null | undefined;
        vector?: Record<string, unknown> | number[] | {
            [key: string]: number[] | undefined;
        } | null | undefined;
    }[][];
    // Scroll Queries are a list of scroll requests
    // SearchQueries are a list of search requests and can be batched!
    let hasOffset: boolean = false;
    if (queryPlan.scrollQueries.length > 0) {
        // Run the scrollQueries
        let promises = queryPlan.scrollQueries.map(scrollQuery => {
            if (scrollQuery.offset){
                hasOffset = true;
            }
            return state.client.scroll(queryPlan.collectionName, scrollQuery);
        });
        results = (await Promise.all(promises)).map(r => r.points);
    } else if (queryPlan.searchQueries.length > 0) {
        // Run the searchQueries as a batch!
        if (queryPlan.searchQueries[0].offset){
            hasOffset = true;
        }
        results = await state.client.searchBatch(queryPlan.collectionName, { searches: queryPlan.searchQueries });
    } else if (queryPlan.recommendQueries.length > 0) {
        // Run the reccomendQueries as a batch!
        if (queryPlan.recommendQueries[0].offset){
            hasOffset = true;
        }
        results = await state.client.recommend_batch(queryPlan.collectionName,
            {
                searches: queryPlan.recommendQueries
            });
    } else {
        throw new Forbidden("Unknown Query Type", {});
    }
    for (let result of results) {
        let rowSet: RowSet = {};
        let rows: RowFieldValue[] = [];
        let aggResults: { [key: string]: any } = {};
        let aggVars: { [key: string]: any } = {};
        for (let p of result) {
            let row: any = {};
            for (let [alias, field] of Object.entries(queryPlan.fieldAliases)){
                if (field === "id") {
                    row[alias] = p.id;
                } else if (field === "vector") {
                    row[alias] = p.vector;
                } else if (field === "score" && "score" in p) {
                    row[alias] = p.score;
                } else if (field === "version" && "version" in p) {
                    row[alias] = p.version;
                } else {
                    if (p.payload !== undefined && p.payload !== null && (p.payload[field] === null || p.payload[field] === undefined)) {
                        // These rows are explicitly nullable, and in this case, are null! I.e. User requested the field, and in this row it's null
                        row[alias] = null;
                    } else if (p.payload !== undefined && p.payload !== null) {
                        row[alias] = p.payload[field] as RowFieldValue;
                    } else {
                        throw new Forbidden("Unknown Field Not supported", {});
                    }
                }
            }
            rowAggregate(aggResults, aggVars, query, row, result.length);
            for (let undef of queryPlan.dropAggregateRows) {
                delete row[undef]
            }
            if (Object.keys(row).length > 0){
                rows.push(row);
            }
            if (typeof p.id === "string" && hasOffset){
                throw new Forbidden("Offset can only be used with points with Integer ID's", {});
            }
        }
        if (rows.length > 0){
            rowSet.rows = rows as {
                [k: string]: RowFieldValue;
            }[];
        }
        if (Object.keys(aggResults).length > 0) {
            rowSet.aggregates = aggResults;
        }
        rowSets.push(rowSet);
    }
    return rowSets;
};

/**
 * Sends a query to the specified qdrant endpoint and retrieves the corresponding response.
 * 
 * This function first plans the queries based on the provided query request and collection parameters.
 * It then performs the queries against the qdrant endpoint using the planned data.
 * 
 * @async
 * @param {QueryRequest} query - The query request object to process.
 * @param {string[]} collectionNames - List of collection names available.
 * @param {{[key: string]: string[]}} collectionFields - Dictionary mapping collection names to their corresponding fields.
 * @param {string} qdrantUrl - The URL endpoint for the qdrant service.
 * @param {string | null} qdrantApiKey - The API key for the qdrant service (can be null).
 * @returns {Promise<QueryResponse>} - A promise resolving to the query response.
 */
export async function doQuery(state: State, query: QueryRequest, collectionNames: string[], collectionFields: { [key: string]: string[] }, collection_vectors: {[k: string]: boolean}): Promise<QueryResponse> {
    let queryPlan = await planQueries(query, collectionNames, collectionFields, collection_vectors);
    return await performQueries(
        state,
        query,
        queryPlan
    );
};