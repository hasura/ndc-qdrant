# Querying Example

Hasura instrospects the database and allows for Querying a pre-existing Qdrant database.

If you want to try these queries out yourself, please see [this supergraph](https://github.com/hasura/super_supergraph/tree/main).

These examples use [these Qdrant collections](https://github.com/hasura/super_supergraph/tree/main/qdrant/connector/qdrant/initdb) which contains data from the Chinook Music database.

All Qdrant queries must pass an "args" object. An empty args object will perform a scroll request. You can also use the args object to perform a vector search, or a recommendation. JOIN's can be performed from the result of a Qdrant query to other connectors, but currently parameterized joins aren't supported. (And wouldn't make much sense to support!)

Fetch all Albums

```graphql
query Query {
  qdrant_album(args: {}) {
    albumId
    artistId
    title
  }
}
```

Fetch all Albums where Album ID = 1

```graphql
query Query {
  qdrant_album(args: {}, where: {albumId: {eq: 1}}) {
    albumId
    artistId
    title
  }
}
```

Perform a vector search:

```
query Query {
  qdrant_boolean(args: {search: {vector: [0.5, 0.5]}}) {
    a
    b
    c
    d
    id
    score
    vector
  }
}
```

Get reccomendations providing positive and negative examples by ID:

```
query Query {
  qdrant_boolean(args: {recommend: {positive: [0], negative: [1]}}) {
    a
    b
    c
    d
    id
    score
    vector
  }
}
```