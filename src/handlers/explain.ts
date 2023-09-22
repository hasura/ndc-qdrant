import { ExplainResponse } from "ts-connector-sdk/schemas/ExplainResponse";
import { QueryRequest } from "ts-connector-sdk/schemas/QueryRequest";
import { QueryPlan, planQueries } from "./query";

export async function explainQuery(query: QueryRequest, collectionNames: string[], collectionFields: {[key: string]: string[]}): Promise<ExplainResponse>{
    // TODO: Make this more useful
    let queryPlan: QueryPlan = await planQueries(query, collectionNames, collectionFields);
    let explainResponse: ExplainResponse = {details:{
        explain: JSON.stringify(queryPlan)
    }}
    return explainResponse;
}