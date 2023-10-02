import {
  CapabilitiesResponse,
  ScalarType,
  ObjectField,
  ObjectType,
} from "ndc-sdk-typescript";
const ID_FIELD_TYPE: "Int" | "String" = "Int";
export const CAPABILITIES_RESPONSE: CapabilitiesResponse = {
  versions: "^0.1.0",
  capabilities: {
    query: {
      foreach: {},
    },
  },
};
export const SCALAR_TYPES: { [key: string]: ScalarType } = {
  Int: {
    aggregate_functions: {},
    comparison_operators: {
      gt: {
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      lt: {
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      gte: {
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      lte: {
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
    },
    update_operators: {},
  },
  Float: {
    aggregate_functions: {},
    comparison_operators: {
      gt: {
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      lt: {
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      gte: {
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      lte: {
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
    },
    update_operators: {},
  },
  Bool: {
    aggregate_functions: {},
    comparison_operators: {},
    update_operators: {},
  },
  String: {
    aggregate_functions: {},
    comparison_operators: {
      like: {
        argument_type: {
          type: "named",
          name: "String",
        },
      },
    },
    update_operators: {},
  },
  // Geo Type? https://qdrant.tech/documentation/concepts/payload/
};
export const BASE_FIELDS: Record<string, ObjectField> = {
  id: {
    description: null,
    type: {
      type: "named",
      name: ID_FIELD_TYPE,
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
export const BASE_TYPES: { [k: string]: ObjectType } = {
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
export const RESTRICTED_NAMES: string[] = ["id", "score", "vector", "version"];
export const RESTRICTED_OBJECTS: string[] = [
  "_search",
  "_recommend",
  "_params",
  "_quantization",
];
export const MAX_32_INT: number = 2147483647;
