import {
  CapabilitiesResponse,
  ScalarType,
  ObjectField,
  ObjectType,
} from "@hasura/ndc-sdk-typescript";
import { JSONSchemaObject } from "@json-schema-tools/meta-schema";
const ID_FIELD_TYPE: "Int" | "String" = "Int";
export const CAPABILITIES_RESPONSE: CapabilitiesResponse = {
  version: "^0.1.0",
  capabilities: {
    query: {
      variables: {}
    },
    mutation: {
      transactional: {},
      explain: {}
    },
    relationships: {
      order_by_aggregate: {}
    }
  },
};
export const SCALAR_TYPES: { [key: string]: ScalarType } = {
  Int: {
    aggregate_functions: {},
    comparison_operators: {
      eq: {
        type: "equal"
      },
      gt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      lt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      gte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      lte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
    },
  },
  Float: {
    aggregate_functions: {},
    comparison_operators: {
      eq: {
        type: "equal"
      },
      gt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      lt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      gte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      lte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
    },
  },
  Bool: {
    aggregate_functions: {},
    comparison_operators: {
      eq: {
        type: "equal"
      },
    },
  },
  String: {
    aggregate_functions: {},
    comparison_operators: {
      eq: {
        type: "equal"
      },
      like: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "String",
        },
      },
    },
  },
  JSON: {
    aggregate_functions: {},
    comparison_operators: {},
  },
  // Geo Type? https://qdrant.tech/documentation/concepts/payload/
};

export const INSERT_FIELDS: Record<string, ObjectField> = {
  vector: {
    description: null,
    type: {
      type: "array",
      element_type: {
        type: "named",
        name: "Float",
      },
    },
  },
};

export const BASE_FIELDS: Record<string, ObjectField> = {
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
// THESE BASE TYPES HAVE OBJECT TYPES FOR THE PARAMETERIZED COLLECTIONS
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

// export const BASE_TYPES: { [k: string]: ObjectType } = {};

export const RESTRICTED_NAMES: string[] = ["id", "score", "vector", "version"];
export const RESTRICTED_OBJECTS: string[] = [
  "_search",
  "_recommend",
  "_params",
  "_quantization",
];
export const MAX_32_INT: number = 2147483647;
export const RAW_CONFIGURATION_SCHEMA: JSONSchemaObject = {
  $schema: "http://json-schema.org/draft-07/schema#",
  definitions: {
    ArgumentInfo: {
      properties: {
        description: {
          description: "Argument description",
          type: "string",
        },
        type: {
          $ref: "#/definitions/Type",
          description: "The name of the type of this argument",
        },
      },
      type: "object",
    },
    ConfigurationSchema: {
      properties: {
        collection_names: {
          items: {
            type: "string",
          },
          type: "array",
        },
        functions: {
          items: {
            $ref: "#/definitions/FunctionInfo",
          },
          type: "array",
        },
        object_fields: {
          additionalProperties: {
            items: {
              type: "string",
            },
            type: "array",
          },
          type: "object",
        },
        object_types: {
          additionalProperties: {
            $ref: "#/definitions/ObjectType",
          },
          type: "object",
        },
        procedures: {
          items: {
            $ref: "#/definitions/ProcedureInfo",
          },
          type: "array",
        },
      },
      type: "object",
    },
    FunctionInfo: {
      properties: {
        arguments: {
          additionalProperties: {
            $ref: "#/definitions/ArgumentInfo",
          },
          description: "Any arguments that this collection requires",
          type: "object",
        },
        description: {
          description: "Description of the function",
          type: "string",
        },
        name: {
          description: "The name of the function",
          type: "string",
        },
        result_type: {
          $ref: "#/definitions/Type",
          description: "The name of the function's result type",
        },
      },
      type: "object",
    },
    ObjectField: {
      description: "The definition of an object field",
      properties: {
        description: {
          description: "Description of this field",
          type: "string",
        },
        type: {
          $ref: "#/definitions/Type",
          description: "The type of this field",
        },
      },
      type: "object",
    },
    ObjectType: {
      description: "The definition of an object type",
      properties: {
        description: {
          description: "Description of this type",
          type: "string",
        },
        fields: {
          additionalProperties: {
            $ref: "#/definitions/ObjectField",
          },
          description: "Fields defined on this object type",
          type: "object",
        },
      },
      type: "object",
    },
    ProcedureInfo: {
      properties: {
        arguments: {
          additionalProperties: {
            $ref: "#/definitions/ArgumentInfo",
          },
          description: "Any arguments that this collection requires",
          type: "object",
        },
        description: {
          description: "Column description",
          type: "string",
        },
        name: {
          description: "The name of the procedure",
          type: "string",
        },
        result_type: {
          $ref: "#/definitions/Type",
          description: "The name of the result type",
        },
      },
      type: "object",
    },
    Type: {
      anyOf: [
        {
          properties: {
            name: {
              description:
                "The name can refer to a primitive type or a scalar type",
              type: "string",
            },
            type: {
              const: "named",
              type: "string",
            },
          },
          type: "object",
        },
        {
          properties: {
            type: {
              const: "nullable",
              type: "string",
            },
            underlying_type: {
              $ref: "#/definitions/Type",
              description: "The type of the non-null inhabitants of this type",
            },
          },
          type: "object",
        },
        {
          properties: {
            element_type: {
              $ref: "#/definitions/Type",
              description: "The type of the elements of the array",
            },
            type: {
              const: "array",
              type: "string",
            },
          },
          type: "object",
        },
      ],
      description: "Types track the valid representations of values as JSON",
    },
  },
  properties: {
    config: {
      $ref: "#/definitions/ConfigurationSchema",
    },
    qdrant_api_key: {
      type: "string",
    },
    qdrant_url: {
      type: "string",
    },
  },
  type: "object",
};
