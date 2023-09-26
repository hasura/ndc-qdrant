## Qdrant Connector

Running the connector

```shell
npm install
npm start
```

## Running the tests:

```shell
npm test
```

## Generating the object_types and collections:

```shell
npm run generate-config --url http://localhost:6333 --output output_file.json
```

Optional parameter --key to pass API key if using Qdrant cloud

## Importing test data

```shell
npm run import-data --url http://localhost:6333 --file=__tests__/data/data.json
```

Optional parameter --key to pass API key if using Qdrant cloud