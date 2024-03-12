import { getQdrantClient } from "./src/qdrant";
import fs from "fs";
import { promisify } from "util";
import { insertion } from "./src/utilities";
import { RESTRICTED_OBJECTS, BASE_FIELDS, BASE_TYPES, INSERT_FIELDS } from "./src/constants";

const writeFile = promisify(fs.writeFile);

const QDRANT_URL = process.env["QDRANT_URL"] as string;
const QDRANT_API_KEY = process.env["QDRANT_API_KEY"] as string | undefined;

let client = getQdrantClient(QDRANT_URL, QDRANT_API_KEY);

async function main() {
  const collections = await client.getCollections();
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

    objectTypes[`${cn}_InsertType`] = {
      description: null,
      fields: {
        ...fieldDict,
        ...INSERT_FIELDS
      }
    }
  }

  const objectFields: Record<string, string[]> = {};
  for (const [cn, objectType] of Object.entries(objectTypes)) {
    objectFields[cn] = Object.keys(objectType.fields);
  }

  let res: any = {};
  res["config"] = {
    collection_names: collectionNames,
    object_fields: objectFields,
    object_types: objectTypes,
    functions: [],
    procedures: [],
  }
  await writeFile(`/etc/connector/config.json`, JSON.stringify(res, null, 4));
}

main();
