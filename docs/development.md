# Qdrant Connector Development

### Prerequisites
1. Follow the steps in the [README](../README.md)
2. Install [NodeJS & npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

### Clone the repo

In a new directory, clone the repo using:

```git clone https://github.com/hasura/ndc-qdrant```

### Run the Introspection

If you are working with a Qdrant hosted database, you can run the introspection using:

```QDRANT_URL=https://7312d6c4-3f6c-432c-987c-34d7d96428ef.us-east4-0.gcp.cloud.qdrant.io QDRANT_API_KEY=Ch8I... ts-node generate-config```

This will generate a `config.json` file.

### Run the Connector

To start the connector on port 9094, for a Qdranto hosted database instance run:
```HASURA_CONNECTOR_PORT=9094 QDRANT_URL=https://7312d6c4-3f6c-432c-987c-34d7d96428ef.us-east4-0.gcp.cloud.qdrant.io QDRANT_API_KEY=Ch8I... ts-node ./src/index.ts serve --configuration=.```

### Attach the connector to the locally running engine

There should a file located at `.env` that contains 

```env
APP_QDRANT_READ_URL="http://local.hasura.dev:<port>"
APP_QDRANT_WRITE_URL="http://local.hasura.dev:<port>"
```

Edit the values in the `.env` file to point at port 9094 with the locally running connector.

```env
APP_QDRANT_READ_URL="http://local.hasura.dev:9094"
APP_QDRANT_WRITE_URL="http://local.hasura.dev:9094"
```

Do a local supergraph build:

```ddn supergraph build local```

Mutations and Queries will now be issued against your locally running connector instance. 

Depending on the changes made to the connector, you may need to re-generate the config. The best way to do this is to regenerate the config locally then move that config into the supergraph.