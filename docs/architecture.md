# General Architecture of the Qdrant Connector

## Query Engine
The query engine's job is to take a `QueryRequest`, which contains information about the query a user would like to run, translate it it into an API call using the Qdrant API, execute it, and return the results as a `QueryResponse`.

One place in particular that uses the Query Engine is the `/query` endpoint (defined in the `ndc-hub` repository).

`/query` endpoints receives a `QueryRequest`, and calls the `plan_queries` function from the Query Engine in order to create a QueryPlan which includes the information needed to execute the query. It then calls the `perform_query` function using the QueryPlan (which is run against the Qdrant API) and gets back a `QueryResponse` which it can then return to the caller.

API:

```typescript
export async function planQueries(query: QueryRequest, collectionNames: string[], collectionFields: { [key: string]: string[] }, collectionVectors: {[k: string]: boolean}): Promise<QueryPlan>
```

```typescript
export async function performQueries(
    state: State,
    query: QueryRequest,
    queryPlan: QueryPlan): Promise<RowSet[]>
```

Note that the response from this function should be in the format of an ndc-spec [QueryResponse](https://hasura.github.io/ndc-spec/reference/types.html#queryresponse) represented as JSON.

### Query Planning
The query plan is essentially side-effect free - we use information from the request as well as the information about the metadata to translate the query request into an API call to run against the database.

This process is currently found in the [src/handlers](/src/handlers/query.ts) directory in the query.ts file. The API is the following function:

```typescript
export async function planQueries(query: QueryRequest, collectionNames: string[], collectionFields: { [key: string]: string[] }, collectionVectors: {[k: string]: boolean}): Promise<QueryPlan>
```

The `plan_queries` function returns a `QueryPlan` which functions as an execution plan.

```typescript
export type QueryPlan = {
    collectionName: string;
    scrollQueries: ScrollRequest[];
    searchQueries: SearchRequest[];
    recommendQueries: RecommendRequest[];
    dropAggregateRows: string[];
    fieldAliases: {[key: string]: string}
};
```

The incoming `QueryRequest` is used to construct an API call that ultimately wraps the Qdrant API.

## Patterns and guiding principles

Here are a few ideas I have about working with this connector.

### KISS (Keep it simple stupid!)
Robust and full-featured connector implementations should preferably be written in Rust for performance purposes. For Community Connectors it is preferred to try to keep things simple where possible, all we are doing is mapping the Query Request to an API call.
