import { getQdrantClient } from "./src/qdrant";
import fs from "fs";
import { promisify } from "util";
import { insertion } from "./src/utilities";
import { RESTRICTED_OBJECTS, BASE_FIELDS, BASE_TYPES, INSERT_FIELDS, INSERT_FIELDS_VECTOR } from "./src/constants";
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
let HASURA_CONFIGURATION_DIRECTORY = process.env["HASURA_CONFIGURATION_DIRECTORY"] as string | undefined;
if (HASURA_CONFIGURATION_DIRECTORY === undefined || HASURA_CONFIGURATION_DIRECTORY.length === 0){
    HASURA_CONFIGURATION_DIRECTORY = ".";
}
const QDRANT_URL = process.env["QDRANT_URL"] as string;
let QDRANT_API_KEY = process.env["QDRANT_API_KEY"] as string | undefined;
if (QDRANT_API_KEY?.length === 0){
    QDRANT_API_KEY = undefined;
}


let client = getQdrantClient(QDRANT_URL, QDRANT_API_KEY);

async function main() {
  const collections = await client.getCollections();
  const collectionNames = collections.collections.map((c) => c.name);
  let collectionVectors: Record<string, boolean> = {};
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
      with_vector: true
    });
    let fieldDict = {};
    let baseFields = {};
    let insertFields = {};
    if (records.length > 0) {
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
        if (Array.isArray(records[0].vector)){
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
          insertFields = {
            id: {
              description: null,
              type: {
                type: "named",
                name: "Int",
              },
            },
            ...INSERT_FIELDS_VECTOR
          };
        }
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

        if (Array.isArray(records[0].vector)){
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
        } else {
          insertFields = {
            id: {
              description: null,
              type: {
                type: "named",
                name: "String",
              },
            },
            ...INSERT_FIELDS_VECTOR
          };
        }
      }

      if (!Array.isArray(records[0].vector)){
        collectionVectors[cn] = true;
      } else {
        collectionVectors[cn] = false;
      }
    }

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
    collection_vectors: collectionVectors,
    functions: [],
    procedures: [],
  }
  const jsonString = JSON.stringify(res, null, 4);
  let filePath = `${HASURA_CONFIGURATION_DIRECTORY}/config.json`;
  try {
      const existingData = await readFile(filePath, 'utf8');
      if (existingData !== jsonString) {
          await writeFile(filePath, jsonString);
          console.log('File updated.');
      } else {
          console.log('No changes detected. File not updated.');
      }
  } catch (error) {
      await writeFile(filePath, jsonString);
      console.log('New file written.');
  }
}

main();
