import { Configuration } from "..";
import { getQdrantClient } from "../qdrant";
import { RESTRICTED_OBJECTS, BASE_FIELDS, BASE_TYPES } from "../constants";
import { insertion } from "../utilities";


export async function doUpdateConfiguration(
  configuration: Configuration
): Promise<Configuration> {
  const client = getQdrantClient(
    configuration.qdrant_url,
    configuration.qdrant_api_key
  );

  const collections = await client.getCollections();
  const collectionNames = collections.collections.map((c) => c.name);
  const pluralCollectionNames = collectionNames.map((i) => i + "s");

  if (!configuration.config){
    configuration.config = {
      collection_names: pluralCollectionNames,
      object_types: { ...BASE_TYPES},
      object_fields: {},
      functions: [],
      procedures: []
    }
    // configuration.config.object_types = { ...baseTypes };
    for (const c of collections.collections) {
      if (RESTRICTED_OBJECTS.includes(c.name)) {
        throw new Error(`${c.name} is a restricted name!`);
      }
      const { points: records } = await client.scroll(c.name, {
        limit: 1,
        with_payload: true,
      });

      let fieldDict = {};
      if (records.length > 0) {
        const recordPayload = records[0].payload;
        fieldDict = insertion(
          c.name,
          recordPayload!,
          configuration.config.object_types
        );
      }
      configuration.config.object_types[c.name] = {
        description: null,
        fields: {
          ...fieldDict,
          ...BASE_FIELDS,
        },
      };
      for (const [cn, objectType] of Object.entries(
        configuration.config.object_types
      )) {
        configuration.config.object_fields[cn] = Object.keys(objectType.fields);
      }
    }
  }

  return configuration;
}
