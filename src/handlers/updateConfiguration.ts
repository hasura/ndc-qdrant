import { ObjectType, ObjectField, Type } from "ts-connector-sdk/src/index";
import { Configuration } from "..";
import { getQdrantClient } from "../qdrant";

const RESTRICTED_NAMES = ["id", "score", "vector", "version"];

const RESTRICTED_OBJECTS = [
  "_search",
  "_recommend",
  "_params",
  "_quantization",
];

const baseFields: Record<string, ObjectField> = {
  id: {
    description: null,
    type: {
      type: "named",
      name: "Int",
    },
  },
  score: {
    description: null,
    type: {
      type: "nullable",
      underlying_type: {
        type: "named",
        name: "Float",
      },
    },
  },
  vector: {
    description: null,
    type: {
      type: "nullable",
      underlying_type: {
        type: "array",
        element_type: {
          type: "named",
          name: "Float",
        },
      },
    },
  },
};

const baseTypes: { [k: string]: ObjectType } = {
  _quantization: {
    description: "Quantization Parameters for Qdrant",
    fields: {
      ignore: {
        type: {
          type: "nullable",
          underlying_type: {
            type: "named",
            name: "Bool",
          },
        },
      },
      rescore: {
        type: {
          type: "nullable",
          underlying_type: {
            type: "named",
            name: "Bool",
          },
        },
      },
      oversampling: {
        type: {
          type: "nullable",
          underlying_type: {
            type: "named",
            name: "Float",
          },
        },
      },
    },
  },
  _params: {
    description: "Search parameters for Qdrant",
    fields: {
      hnsw_ef: {
        type: {
          type: "nullable",
          underlying_type: {
            type: "named",
            name: "Int",
          },
        },
      },
      exact: {
        type: {
          type: "nullable",
          underlying_type: {
            type: "named",
            name: "Bool",
          },
        },
      },
      indexed_only: {
        type: {
          type: "nullable",
          underlying_type: {
            type: "named",
            name: "Bool",
          },
        },
      },
      quantization: {
        type: {
          type: "nullable",
          underlying_type: {
            type: "named",
            name: "_quantization",
          },
        },
      },
    },
  },
  _search: {
    description: "Search the vector database for similar vectors",
    fields: {
      vector: {
        type: {
          type: "array",
          element_type: {
            type: "named",
            name: "Float",
          },
        },
      },
      params: {
        type: {
          type: "nullable",
          underlying_type: {
            type: "named",
            name: "_params",
          },
        },
      },
      score_threshold: {
        type: {
          type: "nullable",
          underlying_type: {
            type: "named",
            name: "Float",
          },
        },
      },
    },
  },
  _recommend: {
    description:
      "Provide an array of positive and negative example points and get a recommendation",
    fields: {
      positive: {
        type: {
          type: "array",
          element_type: {
            type: "named",
            name: "Int",
          },
        },
      },
      negative: {
        type: {
          type: "nullable",
          underlying_type: {
            type: "array",
            element_type: {
              type: "named",
              name: "Int",
            },
          },
        },
      },
      params: {
        type: {
          type: "nullable",
          underlying_type: {
            type: "named",
            name: "_params",
          },
        },
      },
      score_threshold: {
        type: {
          type: "nullable",
          underlying_type: {
            type: "named",
            name: "Float",
          },
        },
      },
    },
  },
};

const recursiveType = (val: any, namePrefix: string, objTypes: any): Type => {
  const wrapNull = (x: Type): Type => ({
    type: "nullable",
    underlying_type: x,
  });

  if (Array.isArray(val)) {
    const new_val = val.length === 0 ? "str" : val[0];
    return wrapNull({
      type: "array",
      element_type: recursiveType(new_val, namePrefix, objTypes),
    });
  } else if (typeof val === "boolean") {
    return wrapNull({
      type: "named",
      name: "Bool",
    });
  } else if (typeof val === "string") {
    return wrapNull({
      type: "named",
      name: "String",
    });
  } else if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return wrapNull({
        type: "named",
        name: "Int",
      });
    } else {
      return wrapNull({
        type: "named",
        name: "Float",
      });
    }
  } else if (typeof val === "object") {
    const fDict: any = {};
    for (const [k, v] of Object.entries(val)) {
      const nestedName = namePrefix + "_" + k;
      const fieldType = recursiveType(v, nestedName, objTypes);
      fDict[k] = {
        description: null,
        type: fieldType,
      };
    }
    objTypes[namePrefix] = {
      description: null,
      fields: fDict,
    };
    return {
      type: "named",
      name: namePrefix,
    };
  } else {
    throw new Error(`Not Implemented: ${typeof val}`);
  }
};

const insertion = (
  collectionName: string,
  payloadDict: Record<string, any>,
  objTypes: any
): Record<string, ObjectField> => {
  let responseDict: Record<string, ObjectField> = {};
  for (const [k, v] of Object.entries(payloadDict)) {
    if (RESTRICTED_NAMES.includes(k)) {
      throw new Error(`${k} is a restricted name!`);
    }
    responseDict[k] = {
      description: null,
      type: recursiveType(v, collectionName + "_" + k, objTypes),
    };
  }
  return responseDict;
};

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

  // Updating collection names
  configuration.config.collection_names = pluralCollectionNames;

  // If `object_types` isn't present, initialize and populate it
  if (!configuration.config.object_types) {
    configuration.config.object_types = { ...baseTypes };
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
          ...baseFields,
        },
      };
    }
  }

  // Initialize and populate the object fields
  if (!configuration.config.object_fields) {
    configuration.config.object_fields = {};
  }

  for (const [cn, objectType] of Object.entries(
    configuration.config.object_types
  )) {
    configuration.config.object_fields[cn] = Object.keys(objectType.fields);
  }

  // Initialize the other fields if not present
  if (!configuration.config.functions) {
    configuration.config.functions = [];
  }

  if (!configuration.config.procedures) {
    configuration.config.procedures = [];
  }

  return configuration;
}
