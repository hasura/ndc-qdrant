import { SchemaResponse } from "../schemas/SchemaResponse";

export function getSchema(): SchemaResponse {
  return {
    "scalar_types": {
      "Int": {
        "aggregate_functions": {},
        "comparison_operators": {},
        "update_operators": {}
      },
      "Float": {
        "aggregate_functions": {},
        "comparison_operators": {},
        "update_operators": {}
      },
      "Bool": {
        "aggregate_functions": {},
        "comparison_operators": {},
        "update_operators": {}
      },
      "String": {
        "aggregate_functions": {},
        "comparison_operators": {},
        "update_operators": {}
      }
      // Geo Type? https://qdrant.tech/documentation/concepts/payload/
    },
    "object_types": {
      "article": {
        "description": null,
        "fields": {
          "arr": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "array",
                "element_type": {
                  "type": "nullable",
                  "underlying_type": {
                    "type": "named",
                    "name": "Int"
                  }
                }
              }
            }
          },
          "bool": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "named",
                "name": "Bool"
              }
            }
          },
          "float": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "named",
                "name": "Float"
              }
            }
          },
          "int": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "named",
                "name": "Int"
              }
            }
          },
          "string": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "named",
                "name": "String"
              }
            }
          },
          "id": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "named",
              "name": "Int"
            }
          },
          "score": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "named",
                "name": "Float"
              }
            }
          },
          "vector": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "array",
                "element_type": {
                  "type": "named",
                  "name": "Float"
                }
              }
            }
          }
        }
      },
      "boolean": {
        "description": null,
        "fields": {
          "A": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "named",
                "name": "Bool"
              }
            }
          },
          "B": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "named",
                "name": "Bool"
              }
            }
          },
          "C": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "named",
                "name": "Bool"
              }
            }
          },
          "D": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "named",
                "name": "Bool"
              }
            }
          },
          "id": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "named",
              "name": "Int"
            }
          },
          "score": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "named",
                "name": "Float"
              }
            }
          },
          "vector": {
            "description": null,
            "arguments": {},
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "array",
                "element_type": {
                  "type": "named",
                  "name": "Float"
                }
              }
            }
          }
        }
      }
    },
    "collections": [
      {
        "name": "articles",
        "description": null,
        "arguments": {
          "vector": {
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "array",
                "element_type": {
                  "type": "named",
                  "name": "Float"
                }
              }
            }
          }
        },
        "type": "article",
        "deletable": false,
        "uniqueness_constraints": {
          "ArticleByID": {
            "unique_columns": [
              "id"
            ]
          }
        },
        "foreign_keys": {}
      },
      {
        "name": "booleans",
        "description": null,
        "arguments": {
          "vector": {
            "type": {
              "type": "nullable",
              "underlying_type": {
                "type": "array",
                "element_type": {
                  "type": "named",
                  "name": "Float"
                }
              }
            }
          }
        },
        "type": "boolean",
        "deletable": false,
        "uniqueness_constraints": {
          "BooleanByID": {
            "unique_columns": [
              "id"
            ]
          }
        },
        "foreign_keys": {}
      }
    ],
    "functions": [], // Does not have any functions yet, might be useful to add some later
    "procedures": [] // Does not have any procedures yet, might be useful to add some later
  };
}