## Qdrant Connector

Running the connector

```shell
npm install
ts-node ./src/index.ts serve --configuration=config.json
```

## Generating the config:

If you have Qdrant running locally:

```shell
ts-node generate-config.ts --url http://localhost:6333 --output config_local.json
```

Optional parameter --key to pass API key if using Qdrant cloud

Example Usage:

```shell
ts-node generate-config.ts --url https://28263b36-###.us-east4-0.gcp.cloud.qdrant.io --key secret-key --output config.json
```