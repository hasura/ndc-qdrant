import { ExplainResponse, QueryRequest } from "ndc-sdk-typescript";
import { QueryPlan, planQueries } from "./query";

export async function doExplain(query: QueryRequest, collectionNames: string[], collectionFields: {[key: string]: string[]}): Promise<ExplainResponse>{
    let explainResponse: ExplainResponse;
    try {
        let queryPlan: QueryPlan = await planQueries(query, collectionNames, collectionFields);
        let isScroll: boolean = queryPlan.scrollQueries.length > 0;
        explainResponse = {details:{
            queryRequest: JSON.stringify(query),
            queryPlan: JSON.stringify(queryPlan),
            scrollsRows: isScroll ? "Query will scroll over rows": "Query will vector search rows",
            concurrentQueriesRan: `${queryPlan.scrollQueries.length}`,
            batchedQueriesRan: `${queryPlan.searchQueries.length}`
        }}
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e); 
        explainResponse = {details:{
            queryRequest: JSON.stringify(query),
            queryPlan: `Query failed to plan with message: ${errorMessage}`
        }}
    }
    return explainResponse;
}