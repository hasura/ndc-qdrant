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

The test data is encoded as JSON and will be uploaded to Qdrant. The root-level field of the tests (e.g. "article" and "boolean") will become the name
of the collections in Qdrant.

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


The collections that will be created are:
1. article
2. boolean

Each test is represented as a JSON file. Here's an example of a simple test.

```json
{
    "method": "POST",
    "url": "query",
    "request": {
        "collection": "articles",
        "arguments": {},
        "query": {
            "fields": {
                "id": {
                    "type": "column",
                    "column": "id"
                }
            },
            "where": {
                "type": "binary_array_comparison_operator",
                "column": {
                    "type": "column",
                    "name": "id",
                    "path": []
                },
                "operator": "in",
                "values": [
                    {
                        "type": "scalar",
                        "value": 1
                    }
                ]
            }
        },
        "collection_relationships": {}
    },
    "response": [
        {
            "aggregates": null,
            "rows": [
                {
                    "id": 1
                }
            ]
        }
    ]
}
```


The request will be sent as the body of the request.
The expected response must match the actual response or the test will fail!

### Replacing the schema

To download the latest schema for an existing database structure you can run the download_schema.py file in the database_introspect directory, and then pass that value as the 'schema' header to the API.

This script accepts the following command line arguments:

--qdrant_url = The url for the qdrant instance, DEFAULT: localhost

--qdrant_port = The port, DEFAULT: 6333

--qdrant_api_key = The API key if using Qdrant cloud, DEFAULT: None

--out_file = The file to output the generated schema types to. DEFAULT: type_stubs.json

Usage:

```shell
python3 download_schema.py --qdrant_url=localhost --qdrant_port=6333 --out_file=type_stubs.json
```

With a blank database that will write the following to "type_stubs.json"

```json
{"object_types": {}, "collections": []}
```

When sending a request to the connector, you may specify the object_types and the collections.


Here's an example of how to send the schema to a connector that has no collections:


```http
GET http://localhost:8101/schema
Content-Type: application/json
schema: {"object_types": {}, "collections": []}
```


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


Provided in the database_introspect directory, you'll find a file called "recipes.json" which has been created by encoding the first 1000 data-points in the dataset located at: https://www.kaggle.com/datasets/shuyangli94/food-com-recipes-and-user-interactions into the vector database.

