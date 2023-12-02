import { getQdrantClient } from "./src/qdrant";
import fs from "fs";
import { promisify } from "util";
import { insertion } from "./src/utilities";
import { RESTRICTED_OBJECTS, BASE_FIELDS, BASE_TYPES } from "./src/constants";

const writeFile = promisify(fs.writeFile);

const DEFAULT_URL = "http://localhost:6333";
const DEFAULT_OUTPUT_FILENAME = "config.json";

const args = process.argv.slice(2);
let clientUrl = DEFAULT_URL;
let outputFileName = DEFAULT_OUTPUT_FILENAME;
let apiKey: string | undefined = undefined;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--url":
      clientUrl = args[i + 1];
      i++;
      break;
    case "--key":
      apiKey = args[i + 1];
      i++;
      break;
    case "--output":
      outputFileName = args[i + 1];
      i++;
      break;
    default:
      console.error(`Unknown argument: ${args[i]}`);
      process.exit(1);
  }
}

let client = getQdrantClient(clientUrl, apiKey);

async function main() {
  const collections = await client.getCollections();
  console.log(collections);
  const collectionNames = collections.collections.map((c) => c.name);

  let objectTypes: Record<string, any> = {
    ...BASE_TYPES,
  };
  for (const cn of collectionNames) {
    if (RESTRICTED_OBJECTS.includes(cn)) {
      throw new Error(`${cn} is a restricted name!`);
    }
    const { points: records } = await client.scroll(cn, {
      limit: 1,
      with_payload: true,
    });
    let fieldDict = {};
    if (records.length > 0) {
      const recordPayload = records[0].payload;
      fieldDict = insertion(cn, recordPayload!, objectTypes);
    }
    objectTypes[cn] = {
      description: null,
      fields: {
        ...fieldDict,
        ...BASE_FIELDS,
      },
    };
  }

  const objectFields: Record<string, string[]> = {};
  for (const [cn, objectType] of Object.entries(objectTypes)) {
    objectFields[cn] = Object.keys(objectType.fields);
  }

  console.log(`Writing object_types and collections to ${outputFileName}`);
  let res: any = {
    qdrant_url: clientUrl,
  };
  if (apiKey) {
    res["qdrant_api_key"] = apiKey;
  }
  res["config"] = {
    collection_names: collectionNames,
    object_fields: objectFields,
    object_types: objectTypes,
    functions: [],
    procedures: [],
  }
  await writeFile(outputFileName, JSON.stringify(res, null, 4));
}

main();
