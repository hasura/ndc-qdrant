## Qdrant Connector

The Qdrant Data Connector allows for connecting to a Qdrant database. This connector uses the [Typescript Data Connector SDK](https://github.com/hasura/ndc-sdk-typescript) and implements the [Data Connector Spec](https://github.com/hasura/ndc-spec). 

### Setting up the Qdrant connector using Hasura Cloud & a Qdrant database

#### Step 1: Prerequisites

1. Install the [new Hasura CLI](https://hasura.io/docs/3.0/cli/installation/) — to quickly and easily create and manage your Hasura projects and builds.
2. Install the [Hasura VS Code extension](https://marketplace.visualstudio.com/items?itemName=HasuraHQ.hasura) — with support for other editors coming soon!
3. Have a [Qdrant](https://qdrant.tech/) database — for supplying data to your API.

#### Step 2: Login to Hasura

After our prerequisites are taken care of, login to Hasura Cloud with the CLI:

`ddn login`

This will open up a browser window and initiate an OAuth2 login flow. If the browser window doesn't open automatically, use the link shown in the terminal output to launch the flow.

#### Step 3: Create a new project

We'll use the `create project` command to create a new project:

`ddn create project --dir ./ddn`

#### Step 4: Add a connector manifest

Let's move into the project directory:

`cd ddn`

Create a subgraph:

`ddn create subgraph qdrant`

Then, create a connector manifest:
`ddn add connector-manifest qdrant_connector --subgraph qdrant --hub-connector hasura/qdrant --type cloud`

#### Step 5: Edit the connector manifest

You should have a connector manifest created at `ddn/qdrant/qdrant_connector/connector/qdrant_connector.build.hml`

```yaml
kind: ConnectorManifest
version: v1
spec:
  supergraphManifests:
    - base
definition:
  name: qdrant_connector
  type: cloud
  connector:
    type: hub
    name: hasura/qdrant:v0.1.7
  deployments:
    - context: .
      env:
        QDRANT_API_KEY:
          value: ""
        QDRANT_URL:
          value: ""
```

Fill in the value for the QDRANT_API_KEY and QDRANT_URL environment variables with your Qdrant credentials.

(Make sure to save your changes to the file!)

#### Step 6: Start a development session

Start a Hasura dev session using the following command:

`ddn dev`

You should see something like this if the connector has been deployed successfully: 

```
3:29PM INF Building SupergraphManifest "base"...
+---------------+-------------------------------------------------------------------------------------------------------+
| Build Version | 39e8b49ed5                                                                                            |
+---------------+-------------------------------------------------------------------------------------------------------+
| API URL       | https://allowing-sturgeon-9867-39e8b49ed5.ddn.hasura.app/graphql                                      |
+---------------+-------------------------------------------------------------------------------------------------------+
| Console URL   | https://console.hasura.io/project/allowing-sturgeon-9867/environment/default/build/39e8b49ed5/graphql |
+---------------+-------------------------------------------------------------------------------------------------------+
| Project Name  | allowing-sturgeon-9867                                                                                |
+---------------+-------------------------------------------------------------------------------------------------------+
| Description   | Dev build - Mon, 15 Apr 2024 15:29:56 CDT                                                             |
+---------------+-------------------------------------------------------------------------------------------------------+
```

Navigate to your Console URL and you can issue a query or mutation.

### Setting up the Qdrant connector locally (Coming Soon)

Please keep an eye out for instructions on running things locally which will be coming soon. 

### Qdrant Introspection Details:

The current Qdrant introspection performed is naive, as it will simply poll the points for the first point, and assume the schema matches that point. In order to expose the schema via GraphQL all points must conform to the introspected schema. 

### Performing Joins

Joins cannot be performed to the Qdrant connector, as joins with collection arguments are not supported. Joins CAN be performed from the Qdrant connector to another connector such as Postgres for example.

### Qdrant Connector Usage Details

The Qdrant connector makes use of parameterized collections to allow for performing a vector search.

Here is an example of a query that passes an array of positive and negative examples by ID.

```graphql
query MyQuery {
  qdrant_album(args: {recommend: {positive: [1], negative: [2]}}) {
    artistId
    id
    score
    title
    vector
  }
}
```

The above query gets recommendations for albums with AlbumID = 1 as a positive example and AlbumID = 2 as a negative example.

Here is an example of a query that performs a vector search.

```graphql
query MyQuery {
  qdrant_album(args: {search: {vector: [0.5]}}) {
    artistId
    id
    score
    title
    vector
  }
}
```

This will perform a similarity search and surface the most relevant results to the provided vector. (Note: The vector inputs are likely to be the embeddings vectors. These will be a array of floats of varying size.)

There are additional parameters that can be used to configure the Qdrant search such as:

*  score_threshold - Define a minimal score threshold for the result. If defined, less similar results will not be returned. Score of the returned result might be higher or smaller than the threshold depending on the Distance function used. E.g. for cosine similarity only higher scores will be returned.

* params
  * hnsw_ef - Params relevant to HNSW index Size of the beam in a beam-search. Larger the value - more accurate the result, more time required for search.
  * exact - Default: false Search without approximation. If set to true, search may run long but with exact results.
  * indexed_only - Default: false If enabled, the engine will only perform search among indexed or small segments. Using this option prevents slow searches in case of delayed index, but does not guarantee that all uploaded vectors will be included in search results
  * quantization - Default null
    * ignore - Default: false If true, quantized vectors are ignored. Default is false.
    * rescore - Default: null If true, use original vectors to re-score top-k results. Might require more time in case if original vectors are stored on disk. If not set, qdrant decides automatically apply rescoring or not.
    * oversampling - Default: null Oversampling factor for quantization. Default is 1.0. Defines how many extra vectors should be pre-selected using quantized index, and then re-scored using original vectors. For example, if oversampling is 2.4 and limit is 100, then 240 vectors will be pre-selected using quantized index, and then top-100 will be returned after re-scoring.

For more information, please see the [official Qdrant documentation](https://qdrant.github.io/qdrant/redoc/index.html#tag/points/operation/search_points).