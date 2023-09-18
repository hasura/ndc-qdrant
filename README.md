# Qdrant connector

This Hasura Data Connector supports the Qdrant vector database. https://qdrant.tech/

## SETUP STEPS

First, you must start the qdrant vector database. This is easiest to do by running the docker-compose.yaml file.

Once the Qdrant database is running in the terminal navigate to the src directory, install dependencies, and start the connector:
```shell
cd src
npm install
npm start
```

## To run the tests
Open a new terminal with the connector running and type:
```shell
npm test
```

Ensure your tests are passing!
```
Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
```

Tests will create collections from data.json found in the \__tests__ directory.

Tests are encoded as JSON objects:

```json
{
    "article": [
        {
            "id": 1,
            "vector": [0.05, 0.61, 0.76, 0.74],
            "payload": {
                "string": "Berlin",
                "int": 0,
                "float": 1.5,
                "bool": true,
                "arr": [1, 2, 3]
            }
        },
        {
            "id": 2,
            "vector": [0.36, 0.55, 0.47, 0.94],
            "payload": {
                "string": "Moscow",
                "int": 0,
                "float": 1.5,
                "bool": false,
                "arr": [4, 5, 6]
            }
        } // ...
    ],
    "boolean": [
        {
            "id": 0,
            "vector": [0.23916668626241566, 0.23916668626241566],
            "payload": {
                "A": true,
                "B": true,
                "C": true,
                "D": true
            }
        } // ...
    ]
}
```

During test setup, each key in the JSON file will be turned into a collection, and each 

The collections that will be created are:
1. article
2. boolean

Each test is represented as a JSON file.


### Replacing the schema

The schema is currently hardcoded into the connector. This will be replaced with a configuration once V3 goes live.

To replace the schema or change the schema to reflect an existing database structure you can run the download_schema.py file in the database_introspect directory.

This script accepts the following command line arguments:

--qdrant_url = The url for the qdrant instance, DEFAULT: localhost
--qdrant_port = The port, DEFAULT: 6333
--qdrant_api_key = The API key if using Qdrant cloud, DEFAULT: None
--out_file = The file to output the generated schema types to. DEFAULT: type_stubs.json

Usage:

```shell
python3 download_schema.py --qdrant_url=localhost --qdrant_port=6333
```

This will generate a JSON file containing the data required in the schema.

With a blank database that will look like this:

```json
{"object_types": {}, "collections": []}
```

In the schema.ts file located at src/handlers/schema.ts you can replace the object_types & collections with the generated schema. (Once V3 is live/accessible this schema data will be passed through the connector configuration rather than hardcoded.)

### Uploading test data and generating a schema

A nifty python helper script exists that will upload data to the qdrant database. This script performs the same database load operations as the typescript tests, however it does not perform the teardown.

This script accepts the following command line arguments:

--file = The file to load the data from.
--qdrant_url = The url for the qdrant instance, DEFAULT: localhost
--qdrant_port = The port, DEFAULT: 6333
--qdrant_api_key = The API key if using Qdrant cloud, DEFAULT: None

Usage:

```shell
python3 import_data.py --file=data.json --qdrant_url=localhost --qdrant_port=6333
```
