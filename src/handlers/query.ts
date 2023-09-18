import { QueryRequest, Expression } from "../schemas/QueryRequest";
import { QueryResponse, RowSet, Row } from "../schemas/QueryResponse";
import { QdrantConfig } from "../config";
import { getQdrantClient } from "../qdrant";
import { components } from "@qdrant/js-client-rest/dist/types/openapi/generated_schema";

type QueryFilter = components["schemas"]["Filter"];

interface VarSet {
    [key: string]: any
}

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
                    if (varSet !== null){
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
                    } else if (!isFloat(value)) {
                        filter.must = [
                            {
                                key: expression.column.name,
                                match: { value }
                            }
                        ];
                    } else {
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
                for (let val of expression.values){
                    switch (val.type){
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
 * @async
 * @param {QueryRequest} query - The query request object.
 * @param {QdrantConfig} config - The Qdrant configuration object.
 * @param {string} individualCollectionName - The name of the individual collection.
 * @param {boolean} vectorSearch - A flag indicating whether to perform a vector search.
 * @param {string[]} includedPayloadFields - The payload fields to include in the response.
 * @param {boolean} includeVector - A flag indicating whether to include vectors in the response.
 * @param {boolean} includeId - A flag indicating whether to include IDs in the response.
 * @param {boolean} includePayload - A flag indicating whether to include payload in the response.
 * @param {boolean} includeScore - A flag indicating whether to include score in the response.
 * @param {VarSet | null} varSet - The set of variables to be used in the query.
 * @returns {Promise<RowSet>} - The results of the query as a RowSet.
 */
async function queryDatabase(
    query: QueryRequest,
    config: QdrantConfig,
    individualCollectionName: string,
    vectorSearch: boolean,
    includedPayloadFields: string[],
    includeVector: boolean,
    includeId: boolean,
    includePayload: boolean,
    includeScore: boolean,
    varSet: VarSet | null): Promise<RowSet> {
    let client = getQdrantClient(config);
    // Recursively build the query filter.
    let filter: QueryFilter = {};
    if (query.query.where !== undefined) {
        filter = recursiveBuildFilter(query.query.where!, filter, varSet);
    }

    let aggKeys: string[] = [];
    if (Array.isArray(query.query.aggregates)){
        for (let [_, agg] of Object.entries(query.query.aggregates)){
            if (agg.type !== "star_count"){
                aggKeys.push(agg.column);
            }
        }
    }

    // In order to properly calculate aggregation, we need to ensure we get all aggregate fields to calculate the aggregates, even if we drop some.
    let aggRemoveRows: string[] = [];
    for (let row of aggKeys){
        if (!includedPayloadFields.includes(row)){
            includedPayloadFields.push(row);
            aggRemoveRows.push(row);
        }
    }



    let res: any = null;
    if (vectorSearch) {
        let v: number[] = [];
        if (query.arguments.vector.type === "literal"){
            v = query.arguments.vector.value as number[];
        } else if (query.arguments.vector.type === "variable" && varSet !== null){
            v = varSet[query.arguments.vector.name] as number[];
        } else {
            throw new Error("Not Implemented");
        }
        res = await client.search(individualCollectionName, {
            vector: v,
            with_vector: includeVector,
            with_payload: {
                include: includedPayloadFields
            },
            filter: filter,
            offset: (query.query.offset !== undefined && query.query.offset !== null) ? query.query.offset! : undefined,
            limit: (query.query.limit !== undefined && query.query.limit !== null) ? query.query.limit! : undefined
        });
    } else {
        res = (await client.scroll(individualCollectionName, {
            with_vector: includeVector,
            with_payload: {
                include: includedPayloadFields
            },
            filter: filter,
            offset: (query.query.offset !== undefined && query.query.offset !== null) ? query.query.offset! : undefined,
            limit: (query.query.limit !== undefined && query.query.limit !== null) ? query.query.limit! : undefined
        })).points;
    }


    // Prep for aggregates
    let agg_res: {[key: string]: any} = {};
    let agg_vars: {[key: string]: any[]} = {};

    let rowSet: RowSet = {};
    let rows: Row[] = [];
    for (let p of res) {
        let row: Row = {};
        if (includeId || includedPayloadFields.includes("id")) {
            row.id = p.id;
        }
        if (includeVector || includedPayloadFields.includes("vector")) {
            row.vector = p.vector!;
        }
        if (includeScore || includedPayloadFields.includes("score")) {
            row.score = p.score !== undefined ? p.score : null;
        }
        if (includePayload) {
            for (let row_name of includedPayloadFields) {
                if (p.payload![row_name] === undefined || p.payload![row_name] === null) {
                    row[row_name] = null;
                } else {
                    row[row_name] = p.payload![row_name];
                }
            }
        }

        // Calculate aggregate
        if (query.query.aggregates !== undefined && query.query.aggregates !== null){
            for (let [key, agg] of Object.entries(query.query.aggregates)){
                switch (agg.type){
                    case "single_column":
                        switch (agg.function){
                            case "sum":
                                if (typeof row[agg.column] === "number"){
                                    if (agg_res[key] === undefined){
                                        agg_res[key] = 0;
                                    }
                                    agg_res[key] += row[agg.column];
                                    break;
                                } else if (typeof row[agg.column] === "string"){ // I added a string aggregate, it might be useful but the sort order isn't maintained on string agg.
                                    if (agg_res[key] === undefined){
                                        agg_res[key] = "";
                                    }
                                    agg_res[key] += row[agg.column];
                                    break;
                                } else {
                                    throw new Error("Not implemented");
                                }
                            case "avg":
                                if (typeof row[agg.column] === "number"){
                                    if (agg_res[key] === undefined){
                                        agg_res[key] = 0;
                                    }
                                    agg_res[key] += (row[agg.column] as number / res.length) as number;
                                    break;
                                } else {
                                    throw new Error("Not implemented");
                                }
                            default:
                                throw new Error("Not implemented");
                        }
                        break;
                    case "column_count":
                        if (agg_vars[key] === undefined){
                            agg_vars[key] = [];
                        }
                        if (agg_res[key] === undefined){
                            agg_res[key] = 0;
                        }
                        if (row[agg.column] !== null && row[agg.column] !== undefined){
                            if (agg.distinct){
                                if (Array.isArray(agg_vars[key]) && !agg_vars[key].includes(row[agg.column])){
                                    agg_vars[key].push(row[agg.column]);
                                    agg_res[key] += 1;
                                }
                            } else {
                                agg_res[key] += 1;
                            }
                        }
                        break;
                    case "star_count":
                        if (agg_res[key] === undefined){
                            agg_res[key] = 0;
                        }
                        agg_res[key] += 1;
                        break;
                    default:
                        throw new Error("Not implemented");
                }
            }
        }
        // Remove the rows needed to calculate the aggregate but not returned in the field.
        for (let undef of aggRemoveRows){
            row[undef] = undefined;
        }
        rows.push(row);
    }
    rowSet.rows = rows;
    if (Object.keys(agg_res).length > 0){
        rowSet.aggregates = agg_res;
    } else {
        rowSet.aggregates = null;
    }
    return rowSet;
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

    if (query.query.order_by !== undefined && query.query.order_by !== null){
        throw new Error("Order by not implemented");
    }

    const individualCollectionName: string = query.collection.slice(0, -1);
    let vectorSearch: boolean = false;
    let args = Object.keys(query.arguments);
    for (let arg of args) {
        switch (arg) {
            case "vector":
                vectorSearch = true;
                break;
            default:
                throw new Error("Argument not implemented");
        }
    }

    // This is where the response will go.
    let rowSets: RowSet[] = [];

    // When adding aggregates, we will need to get the fields even if we throw them out afterwards!
    // Collect the payload fields to include in the response. 
    let includedPayloadFields: string[] = [];
    let includeVector: boolean = false;
    let includeId: boolean = false;
    let includePayload: boolean = false;
    let includeScore: boolean = false;
    for (let f of Object.keys(query.query.fields!)) {
        if (f === "id") {
            includeId = true;
        } else if (f === "vector") {
            includeVector = true;
        } else if (f === "score") {
            includeScore = true;
        } else if (!config.collectionFields[individualCollectionName].includes(f)) {
            throw new Error("Requested field not in schema!");
        } else {
            includedPayloadFields.push(f);
            includePayload = true;
        }
    }

    if (query.variables === undefined || query.variables === null){
        let res = await queryDatabase(
            query,
            config,
            individualCollectionName,
            vectorSearch,
            includedPayloadFields,
            includeVector,
            includeId,
            includePayload,
            includeScore,
            null
        );
        rowSets.push(res);
    } else {
        // Call these asynchronously
        let promises = query.variables.map(varSet => {
            let vSet: VarSet = varSet;
            return queryDatabase(
                query,
                config,
                individualCollectionName,
                vectorSearch,
                includedPayloadFields,
                includeVector,
                includeId,
                includePayload,
                includeScore,
                vSet
            );
        });
        let results = await Promise.all(promises);
        for (let result of results){
            rowSets.push(result);
        }
    }
    return rowSets;
}