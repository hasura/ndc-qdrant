import { getQdrantClient } from "./src/qdrant";
import fs from "fs";
import { promisify } from "util";
import { insertion } from "./src/utilities";
import { RESTRICTED_OBJECTS, BASE_FIELDS, BASE_TYPES, INSERT_FIELDS } from "./src/constants";

const writeFile = promisify(fs.writeFile);

const QDRANT_URL = process.env["QDRANT_URL"] as string;
let QDRANT_API_KEY = process.env["QDRANT_API_KEY"] as string | undefined;
if (QDRANT_API_KEY?.length === 0){
    QDRANT_API_KEY = undefined;
}

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
    let baseFields = {};
    let insertFields = {};
    if (records.length > 0) {
      console.log(records);
      const recordPayload = records[0].payload;
      fieldDict = insertion(cn, recordPayload!, objectTypes);
      if (typeof records[0].id === "number"){
        baseFields = {
          id: {
            description: null,
            type: {
              type: "named",
              name: "Int",
            },
          },
          ...BASE_FIELDS
        };
        insertFields = {
          id: {
            description: null,
            type: {
              type: "named",
              name: "Int",
            },
          },
          ...INSERT_FIELDS
        };
      } else {
        baseFields = {
          id: {
            description: null,
            type: {
              type: "named",
              name: "String",
            },
          },
          ...BASE_FIELDS
        };
        insertFields = {
          id: {
            description: null,
            type: {
              type: "named",
              name: "String",
            },
          },
          ...INSERT_FIELDS
        };
      }
    }
    console.log(fieldDict);

    objectTypes[cn] = {
      description: null,
      fields: {
        ...fieldDict,
        ...baseFields,
      },
    };

    // Need to handle that here as well for insert fields.
    objectTypes[`${cn}_InsertType`] = {
      description: null,
      fields: {
        ...fieldDict,
        ...insertFields
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
