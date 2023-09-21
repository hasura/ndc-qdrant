import { QueryRequest, Expression } from "../schemas/QueryRequest";
import { QueryResponse, RowSet, Row, RowFieldValue } from "../schemas/QueryResponse";
import { QdrantConfig } from "../config";
import { getQdrantClient } from "../qdrant";
import { components } from "@qdrant/js-client-rest/dist/types/openapi/generated_schema";
import { MAX_32_INT } from "../constants";
import axios from 'axios';


type QueryFilter = components["schemas"]["Filter"];
type SearchRequest = components["schemas"]["SearchRequest"];
type ScrollRequest = components["schemas"]["ScrollRequest"];

type VarSet = {
    [key: string]: any
};

type QueryCollection = {
    searchRequest: SearchRequest | null;
    scrollRequest: ScrollRequest | null;
};

// Helper function to determine if a value is a float
const isFloat = (v: any) => !isNaN(v) && Math.floor(v) !== Math.ceil(v);

/**
 * Recursively builds a query filter based on the expression and the variable set.
 * Throws an error for unsupported operation types.
 * 
 * @param {Expression} expression - The expression object to be parsed.
 * @param {QueryFilter} filter - The query filter to be built.
 * @param {VarSet | null} varSet - The set of variables to be used in the query filter.
 * @returns {QueryFilter} - The constructed query filter.
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
                    throw new Error("Not implemented");
            }
            break;
        case "binary_comparison_operator":
            let operator: string = expression.operator.type;
            let value: any;
            switch (expression.value.type) {
                case "scalar":
                    value = expression.value.value
                    break;
                case "column":
                    throw new Error("Binary comparison operator on column Not implemented");
                case "variable":
                    if (varSet !== null) {
                        value = varSet[expression.value.name];
                    }
                    break;
                default:
                    throw new Error("Not implemented");
            }
            switch (operator) {
                case "equal":
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
                        throw new Error("Not implemented");
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
                        throw new Error("Not Implemented");
                    }
                    break;
                case "gt":
                    if (expression.column.name === "id") {
                        throw Error("Not Implemented");
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
                        throw new Error("Not Implemented");
                    }
                    break;
                case "lt":
                    if (expression.column.name === "id") {
                        throw Error("Not Implemented");
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
                        throw new Error("Not Implemented");
                    }
                    break;
                case "gte":
                    if (expression.column.name === "id") {
                        throw Error("Not Implemented");
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
                        throw new Error("Not Implemented");
                    }
                    break;
                case "lte":
                    if (expression.column.name === "id") {
                        throw Error("Not Implemented");
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
                        throw new Error("Not Implemented");
                    }
                    break;
                default:
                    throw new Error("Binary Comparison Custom Operator not implemented");
            }
            break;
        case "binary_array_comparison_operator":
            if (expression.operator === "in") {
                if (expression.values.length === 0) {
                    throw new Error("In requires a lsit");
                }
                if (expression.column.name === "id") {
                    filter.must = [
                        {
                            "has_id": expression.values.map(val => val.type === "scalar" ? val.value : undefined) as (string | number)[]
                        }
                    ];
                    break;
                }
                if (expression.column.name === "vector") {
                    throw new Error("Vector in not implemented");
                }
                let matchList: any[] = [];
                for (let val of expression.values) {
                    switch (val.type) {
                        case "scalar":
                            matchList.push(val.value);
                            break;
                        case "variable":
                            // Is this not in spec?
                            throw new Error("Not implemented");
                        case "column":
                            throw new Error("Not implemented");
                        default:
                            throw new Error("Not implemented");
                    }
                }
                filter.must = [
                    {
                        key: expression.column.name,
                        match: { any: matchList }
                    }
                ]
            } else {
                throw new Error("Binary Array Comparison Operator not implemented!");
            }
            break;
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
            throw new Error("Exists not implemented yet!");
        default:
            throw new Error("Not implemented");
    }
    return filter;
}

/**
 * Queries the database based on various parameters and returns the results as a RowSet.
 * 
 * @param {QueryRequest} query - The query request object.
 * @param {boolean} vectorSearch - A flag indicating whether to perform a vector search.
 * @param {string[]} includedPayloadFields - The payload fields to include in the response.
 * @param {boolean} includeVector - A flag indicating whether to include vectors in the response.
 * @param {VarSet | null} varSet - The set of variables to be used in the query.
 * @returns {Promise<RowSet>} - The results of the query as a RowSet.
 */
async function collectQueries(query: QueryRequest,
    vectorSearch: boolean,
    includedPayloadFields: string[],
    includeVector: boolean,
    varSet: VarSet | null): Promise<QueryCollection> {
    // Recursively build the query filter.
    let filter: QueryFilter = {};
    if (query.query.where !== undefined) {
        filter = recursiveBuildFilter(query.query.where!, filter, varSet);
    }

    let searchRequest: SearchRequest | null = null;
    let scrollRequest: ScrollRequest | null = null;
    if (vectorSearch) {
        let v: number[] = [];
        if (query.arguments.vector.type === "literal"){
            v = query.arguments.vector.value as number[];
        } else if (query.arguments.vector.type === "variable" && varSet !== null){
            v = varSet[query.arguments.vector.name] as number[];
        } else {
            throw new Error("Not implemented");
        }
        searchRequest = {
            vector: v,
            with_vector: includeVector,
            with_payload: {
                include: includedPayloadFields
            },
            filter: filter,
            offset: (query.query.offset !== undefined && query.query.offset !== null) ? query.query.offset! : 0,
            limit: (query.query.limit !== undefined && query.query.limit !== null) ? query.query.limit! : MAX_32_INT
        }
    } else {
        scrollRequest = {
            with_vector: includeVector,
            with_payload: {
                include: includedPayloadFields
            },
            filter: filter,
            offset: (query.query.offset !== undefined && query.query.offset !== null) ? query.query.offset! : 0,
            limit: (query.query.limit !== undefined && query.query.limit !== null) ? query.query.limit! : MAX_32_INT
        }
    }

    if (searchRequest === null && scrollRequest === null){
        throw new Error("Must supply a search request or a scroll request.");
    }

    let queryCollection: QueryCollection = {
        searchRequest: searchRequest,
        scrollRequest: scrollRequest
    };
    return queryCollection;
}

/**
 * Mutates the aggResults and aggVars to add-on aggregation in the required O(N*P) where N is the number of rows, and P is the number of aggregates to take
 * 
 * @param aggResults The current aggregate results
 * @param aggVars Any variables needed accross the aggregates
 * @param query The query object
 * @param row The row to use to mutate the aggregation object
 * @param numRows The number of rows in total. (Useful for avg and other aggregates)
 * @returns - None, mutates the aggResults in place
 */
function rowAggregate(aggResults: {[key: string]: any}, aggVars: {[key: string]: any},  query: QueryRequest, row: Row, numRows: number): {[key: string]: any} {
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
                                throw new Error("Not implemented");
                            }
                        case "avg":
                            if (typeof row[agg.column] === "number") {
                                if (aggResults[key] === undefined) {
                                    aggResults[key] = 0;
                                }
                                aggResults[key] += (row[agg.column] as number / numRows) as number;
                                break;
                            } else {
                                throw new Error("Not implemented");
                            }
                        default:
                            throw new Error("Not implemented");
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
                    throw new Error("Not implemented");
            }
        }
    }
    return aggResults;
}

/**
 * Processes the query request and returns the query response.
 * 
 * @async
 * @param {QueryRequest} query - The query request object.
 * @param {QdrantConfig} config - The Qdrant configuration object.
 * @returns {Promise<QueryResponse>} - The query response.
 */
export async function postQuery(query: QueryRequest, config: QdrantConfig): Promise<QueryResponse> {
    // Assert that the collection is registered in the schema
    if (!config.collections.includes(query.collection)) {
        throw new Error("Collection not found in schema!");
    }

    // Currently not planning to implement relationships - Does not make sense for DB target
    if (Object.keys(query.collection_relationships).length !== 0) {
        throw new Error("Querying with collection relationships not implemented yet!");
    }

    // TODO: EMPTY FIELDS NOT IMPLEMENTED
    if (query.query.fields === null || Object.keys(query.query.fields!).length === 0) {
        throw new Error("Querying with null fields not implemented yet!");
    }

    // Sorting not supported by database!
    if (query.query.order_by !== undefined && query.query.order_by !== null) {
        throw new Error("Order by not implemented");
    }

    const individualCollectionName: string = query.collection.slice(0, -1);
    let vectorSearch: boolean = false;
    let args = Object.keys(query.arguments);
    let textParamCounter: number = 0;
    // Handle the argument collection
    for (let arg of args) {
        switch (arg) {
            case "vector":
                vectorSearch = true;
                break;
            case "search":
                textParamCounter += 1;
                break;
            case "searchModel":
                textParamCounter += 1;
                break;
            case "searchUrl":
                textParamCounter += 1;
                break;
            default:
                throw new Error("Argument not implemented");
        }
    }

    // Adding the ability to call an external API to get embeddings from a string of text.
    if (textParamCounter === 3) {
        // What if we smashed vectors together. To combine multiple sensory vectors, i.e. images, text, and audio... vector into a bigger vector by combining the vector of an image and some text? 🤔💭
        let search: string = query.arguments.search.value as string;
        let searchUrl: string = query.arguments.searchUrl.value as string;
        let searchModel: string = query.arguments.searchModel.value as string;
        const response = await axios.post(searchUrl, {
            search: search,
            model: searchModel
        });
        let responseData: number[] = response.data;
        query.arguments.vector = {
            type: "literal",
            value: responseData
        };
        vectorSearch = true;
    } else if (textParamCounter > 0) {
        throw new Error("You must provide a search, searchModel, and searchUrl to perform a text-search");
    }

    // Collect the payload fields to include in the response. 
    let includedPayloadFields: string[] = [];
    let orderedFields: string[] = [];
    let includeVector: boolean = false;
    for (const f in query.query.fields) {
        if (f === "vector") {
            includeVector = true;
        }  else if (!config.collectionFields[individualCollectionName].includes(f)) {
            throw new Error("Requested field not in schema!");
        } else {
            includedPayloadFields.push(f);
        }
        // Hasura needs to maintain field ordering, so I would think the connector will as well?
        orderedFields.push(f);
    }

    // Here we collect all the queries we might want to make.
    let scrollQueries: ScrollRequest[] = [];
    let searchQueries: SearchRequest[] = [];
    let queryResponse: QueryCollection;
    if (query.variables === undefined || query.variables === null){
        // In the simplest case, we do not have any variables! So we will only have 1 request to make.
        queryResponse = await collectQueries(
            query,
            vectorSearch,
            includedPayloadFields,
            includeVector,
            null
        );
        if (queryResponse.scrollRequest !== null){
            scrollQueries.push(queryResponse.scrollRequest);
        } else if (queryResponse.searchRequest !== null){
            searchQueries.push(queryResponse.searchRequest);
        } else {
            throw new Error("Not Implemented");
        }
    } else {
        // When there are variables, we will build multiple queries, which we will either run concurrently, or as a batch if batching is supported. It's only possible to either perform ALL searches, or ALL scrolls.
        let promises = query.variables.map(varSet => {
        let vSet: VarSet = varSet;
            return collectQueries(
                query,
                vectorSearch,
                includedPayloadFields,
                includeVector,
                vSet
            );
        });
        let results = await Promise.all(promises);
        for (let result of results){
            if (result.scrollRequest !== null){
                scrollQueries.push(result.scrollRequest);
            } else if (result.searchRequest !== null){
                searchQueries.push(result.searchRequest);
            } else {
                throw new Error("Not implemented");
            }
        }
    };

    if (scrollQueries.length > 0 && searchQueries.length > 0){
        // All queries are either a "scroll" -> full scan or a "search" -> vector search
        throw new Error("Not implemented");
    }

    let aggKeys: string[] = [];
    let aggRemoveRows: string[] = [];
    if (Array.isArray(query.query.aggregates)) {
        for (let [_, agg] of Object.entries(query.query.aggregates)) {
            if (agg.type !== "star_count") {
                aggKeys.push(agg.column);
                if (!includedPayloadFields.includes(agg.column)) {
                    includedPayloadFields.push(agg.column);
                    aggRemoveRows.push(agg.column);
                }
            }
        }
    }

    // This is where the response will go.
    let rowSets: RowSet[] = [];

    // Scroll Queries are a list of scroll requests
    // SearchQueries are a list of search requests and can be batched!
    if (scrollQueries.length > 0) {
        // Run the scrollQueries
        let promises = scrollQueries.map(scrollQuery => {
            let client = getQdrantClient(config.clientConfig);
            return client.scroll(individualCollectionName, scrollQuery);
        });
        let results = await Promise.all(promises);
        for (let result of results){
            let rowSet: RowSet = {};
            let rows: Row[] = [];
            let aggResults: {[key: string]: any} = {};
            let aggVars: {[key: string]: any} = {};
            for (let p of result.points){
                let row: Row = {};
                for (let rowField of orderedFields){
                    if (rowField === "id"){
                        row.id = p.id;
                    } else if (rowField === "vector") {
                        row.vector = p.vector as number[];
                    } else {
                        if (p.payload !== undefined && p.payload !== null && (p.payload[rowField] === null || p.payload[rowField] === undefined)){
                            row[rowField] = null;
                        } else if (p.payload !== undefined && p.payload !== null){
                            row[rowField] = p.payload[rowField] as RowFieldValue;
                        } else {
                            throw new Error("Not implemented");
                        }
                    } 
                }
                rowAggregate(aggResults, aggVars, query, row, result.points.length);
                for (let undef of aggRemoveRows){
                    row[undef] = undefined;
                }
                rows.push(row);
            }
            rowSet.rows = rows;
            if (Object.keys(aggResults).length > 0){
                rowSet.aggregates = aggResults;
            } else {
                // TODO: Might want to remove this actually instead of having it return null but will need to change in tests!!
                rowSet.aggregates = null;
            }
            rowSets.push(rowSet);
        }
    } else if (searchQueries.length > 0){
        // Run the searchQueries as a batch!
        let client = getQdrantClient(config.clientConfig);
        let results = await client.searchBatch(individualCollectionName, {searches: searchQueries});

        for (let result of results){
            let rowSet: RowSet = {};
            let rows: Row[] = [];
            let aggResults: {[key: string]: any} = {};
            let aggVars: {[key: string]: any} = {};
            for (let p of result){
                let row: Row = {};
                for (let rowField of orderedFields){
                    if (rowField === "id"){
                        row.id = p.id;
                    } else if (rowField === "vector") {
                        row.vector = p.vector as number[];
                    } else if (rowField === "score") {
                        row.score = p.score;
                    } else if (rowField === "version"){
                        row.version = p.version;
                    } else {
                        if (p.payload !== undefined && p.payload !== null && (p.payload[rowField] === null || p.payload[rowField] === undefined)){
                            row[rowField] = null;
                        } else if (p.payload !== undefined && p.payload !== null){
                            row[rowField] = p.payload[rowField] as RowFieldValue;
                        } else {
                            throw new Error("Not implemented");
                        }
                    } 
                }
                rowAggregate(aggResults, aggVars, query, row, result.length);
                for (let undef of aggRemoveRows){
                    row[undef] = undefined;
                }
                rows.push(row);
            }
            rowSet.rows = rows;
            if (Object.keys(aggResults).length > 0){
                rowSet.aggregates = aggResults;
            } else {
                // TODO: Might want to remove this actually instead of having it return null but will need to change in tests!!
                rowSet.aggregates = null;
            }
            rowSets.push(rowSet);
        }
    } else {
        throw new Error("Not implemented");
    }
    if (scrollQueries.length === 0 && searchQueries.length === 0){
        throw new Error("Not implemented!");
    }
    return rowSets;
}