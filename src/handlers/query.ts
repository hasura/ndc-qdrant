import { QueryRequest, Expression } from "../schemas/QueryRequest";
import { QueryResponse, RowSet, Row } from "../schemas/QueryResponse";
import { QdrantConfig } from "../config";
import { getQdrantClient } from "../qdrant";
import { components } from "@qdrant/js-client-rest/dist/types/openapi/generated_schema";

type QueryFilter = components["schemas"]["Filter"];

interface VarSet {
    [key: string]: any
}

const isFloat = (v: any) => !isNaN(v) && Math.floor(v) !== Math.ceil(v);


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

    let rowSet: RowSet = {};
    let rows: Row[] = [];
    for (let p of res) {
        let row: Row = {};
        if (includeId) {
            row.id = p.id;
        }
        if (includeVector) {
            row.vector = p.vector!;
        }
        if (includeScore) {
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
        rows.push(row);
    }

    // Sort the response
    if (query.query.order_by !== undefined && query.query.order_by !== null) {
        let elems = query.query.order_by.elements;
        rows.sort((a, b) => {
            for (let e of elems) {
                if (e.target.type === "column") {
                    const column = e.target.name;
                    const direction = e.order_direction;
                    if (typeof a[column] === "number" && typeof b[column] === "number") {
                        let aVal = a[column] as number;
                        let bVal = b[column] as number;
                        if (aVal < bVal) {
                            return direction === 'asc' ? -1 : 1;
                        } else if (aVal > bVal) {
                            return direction === 'asc' ? 1 : -1;
                        }
                        continue;
                    } else if (typeof a[column] === "boolean" && typeof b[column] === "boolean") {
                        let aVal = a[column] as boolean;
                        let bVal = b[column] as boolean;
                        if (aVal < bVal) {
                            return direction === 'asc' ? -1 : 1;
                        } else if (aVal > bVal) {
                            return direction === 'asc' ? 1 : -1;
                        }
                    } else if (typeof a[column] === "string" && typeof b[column] === "string") {
                        let aVal = a[column] as string;
                        let bVal = b[column] as string;
                        if (aVal < bVal) {
                            return direction === 'asc' ? -1 : 1;
                        } else if (aVal > bVal) {
                            return direction === 'asc' ? 1 : -1;
                        }
                    } else {
                        throw new Error("Not Implemented");
                    }
                } else {
                    throw new Error("Not implemented");
                }
            }
            return 0; // Return 0 if all values are equal
        });
    }
    rowSet.rows = rows;
    rowSet.aggregates = null;
    return rowSet;
}


export async function postQuery(query: QueryRequest, config: QdrantConfig): Promise<QueryResponse> {
    // Assert that the collection is registered in the schema
    if (!config.collections.includes(query.collection)) {
        throw new Error("Collection not found in schema!");
    }

    // TODO: RELATIONSHIPS NOT IMPLEMENTED
    if (Object.keys(query.collection_relationships).length !== 0) {
        throw new Error("Querying with collection relationships not implemented yet!");
    }

    // TODO: EMPTY FIELDS NOT IMPLEMENTED
    if (query.query.fields === null || Object.keys(query.query.fields!).length === 0) {
        throw new Error("Querying with null fields not implemented yet!");
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

    // Collect the payload fields to include in the response. 
    let includedPayloadFields: string[] = [];
    let includeVector: boolean = false;
    let includeId: boolean = false;
    let includePayload: boolean = false;
    let includeScore: boolean = false;
    // Field Selection -> Collect the fields to be gathered.
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