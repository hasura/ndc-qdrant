import { QueryRequest, Expression } from "../schemas/QueryRequest";
import { QueryResponse, RowSet, Row } from "../schemas/QueryResponse";
import { QdrantConfig } from "../config";
import { getQdrantClient } from "../qdrant";
import { components } from "@qdrant/js-client-rest/dist/types/openapi/generated_schema";

type QueryFilter = components["schemas"]["Filter"];


const isFloat = (v: any) => !isNaN(v) && Math.floor(v) !== Math.ceil(v);


function recursiveBuildFilter(expression: Expression, filter: QueryFilter): QueryFilter {
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
                    throw new Error("Binary comparison operator on variable Not implemented");
                default:
                    throw new Error("Not implemented");
            }
            switch (operator) {
                case "equal":
                    if (!isFloat(value)) {
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
                let expression_value_type: string = expression.values[0].type;
                // TODO: Test with a float?
                switch (expression_value_type) {
                    case "scalar":
                        filter.must = [
                            {
                                key: expression.column.name,
                                match: { any: expression.values.map(val => val.type === "scalar" ? val.value : undefined) }
                            }
                        ];
                        break;
                    case "column":
                        throw new Error("Binary array comparison operator on column Not implemented");
                    case "variable":
                        throw new Error("Binary array comparison operator on variable Not implemented");
                    default:
                        throw new Error("Not implemented");
                }
            } else {
                throw new Error("Binary Array Comparison Operator not implemented!");
            }
            break;
        case "and":
            filter.must = expression.expressions.map(expr => recursiveBuildFilter(expr, {}));
            break;
        case "or":
            filter.should = expression.expressions.map(expr => recursiveBuildFilter(expr, {}))
            break;
        case "not":
            filter.must_not = [recursiveBuildFilter(expression.expression, {})];
            break;
        case "exists":
            throw new Error("Exists not implemented yet!");
        default:
            throw new Error("Not implemented");
    }
    return filter;
}

export async function postQuery(query: QueryRequest, config: QdrantConfig): Promise<QueryResponse> {
    // Assert that the collection is registered in the schema
    if (!config.collections.includes(query.collection)) {
        throw new Error("Collection not found in schema!");
    }

    // TODO: VARIABLES NOT IMPLEMENTED
    if (query.variables !== undefined) {
        throw new Error("Querying with variables not implemented yet!");
    }

    // TODO: RELATIONSHIPS NOT IMPLEMENTED
    if (Object.keys(query.collection_relationships).length !== 0) {
        throw new Error("Querying with collection relationships not implemented yet!");
    }

    // TODO: EMPTY FIELDS NOT IMPLEMENTED
    if (query.query.fields === null || Object.keys(query.query.fields!).length === 0) {
        throw new Error("Querying with null fields not implemented yet!");
    }

    // Cannot support both order_by and pagination.
    if (query.query.order_by !== undefined && ( (query.query.limit !== undefined) || (query.query.offset !== undefined))) {
        throw new Error("Cannot perform both order_by and pagination");
    }

    // Implement Return Sorting To Spec! (Does it even make sense to implement sorting?)
    if (query.query.order_by !== undefined && query.query.order_by !== null) {
        throw new Error("Sorting not implemented");
    }

    const individual_collection_name: string = query.collection.slice(0, -1);
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

    // OrderBy conflicts with the vector search.
    if (vectorSearch && query.query.order_by !== undefined && query.query.order_by !== null) {
        throw new Error("Order by not implemented when performing a vector search");
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
        } else if (!config.collectionFields[individual_collection_name].includes(f)) {
            throw new Error("Requested field not in schema!");
        } else {
            includedPayloadFields.push(f);
            includePayload = true;
        }
    }

    // Recursively build the query filter. 
    let filter: QueryFilter = {};
    if (query.query.where !== undefined) {
        filter = recursiveBuildFilter(query.query.where!, filter);
    }
    let client = getQdrantClient(config);
    let res: any = null;

    if (vectorSearch) {
        if (query.arguments.vector.type === "literal") {
            query.arguments.vector.value as number[];
            res = await client.search(individual_collection_name, {
                vector: query.arguments.vector.value as number[],
                with_vector: includeVector,
                with_payload: {
                    include: includedPayloadFields
                },
                filter: filter,
                offset: (query.query.offset !== undefined && query.query.offset !== null) ? query.query.offset! : undefined,
                limit: (query.query.limit !== undefined && query.query.limit !== null) ? query.query.limit! : undefined
            });

        } else if (query.arguments.vector.type === "variable") {
            throw new Error("Variable Not implemented");
        } else {
            throw new Error("Variable Not implemented");
        }
    } else {
        res = (await client.scroll(individual_collection_name, {
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
    rowSet.rows = rows;
    rowSet.aggregates = null;
    rowSets.push(rowSet);

    return rowSets;
}