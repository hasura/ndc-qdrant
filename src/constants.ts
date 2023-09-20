import { QdrantClientConfig } from "./config";
import { CapabilitiesResponse } from "./schemas/CapabilitiesResponse";
import { CollectionInfo, FunctionInfo, ObjectType, ProcedureInfo, ScalarType, SchemaResponse } from "./schemas/SchemaResponse";

export const HOST: string = "0.0.0.0";
export const PORT: number = 8101;
export const ORIGIN: string = "*"; // This might not be safe in a production environment and may need changed!
export const DEFAULT_QDRANT_URL: string = "http://localhost:6333";
export const CAPABILITIES: CapabilitiesResponse = {
    "versions": "^0.1.0",
    "capabilities": {
        "query": {
            "foreach": {}
        } // TODO: determine query capabilities
    },
    // explain: {} // TODO
    // mutations: {} // TODO
    // relationships: {} // TODO
};
export const SCALAR_TYPES: { [key: string]: ScalarType } = {
    "Int": {
        "aggregate_functions": {},
        "comparison_operators": {
            "gt": {
                "argument_type": {
                    "type": "named",
                    "name": "Int"
                }
            },
            "lt": {
                "argument_type": {
                    "type": "named",
                    "name": "Int"
                }
            },
            "gte": {
                "argument_type": {
                    "type": "named",
                    "name": "Int"
                }
            },
            "lte": {
                "argument_type": {
                    "type": "named",
                    "name": "Int"
                }
            }
        },
        "update_operators": {}
    },
    "Float": {
        "aggregate_functions": {},
        "comparison_operators": {
            "gt": {
                "argument_type": {
                    "type": "named",
                    "name": "Float"
                }
            },
            "lt": {
                "argument_type": {
                    "type": "named",
                    "name": "Float"
                }
            },
            "gte": {
                "argument_type": {
                    "type": "named",
                    "name": "Float"
                }
            },
            "lte": {
                "argument_type": {
                    "type": "named",
                    "name": "Float"
                }
            }
        },
        "update_operators": {}
    },
    "Bool": {
        "aggregate_functions": {},
        "comparison_operators": {},
        "update_operators": {}
    },
    "String": {
        "aggregate_functions": {},
        "comparison_operators": {
            "like": {
                "argument_type": {
                    "type": "named",
                    "name": "String"
                }
            }
        },
        "update_operators": {}
    }
    // Geo Type? https://qdrant.tech/documentation/concepts/payload/
};
export const FUNCTIONS: FunctionInfo[] = [];
export const PROCEDURES: ProcedureInfo[] = [];
export const TEST_CONFIG: QdrantClientConfig = {
    url: "http://localhost:6333",
    apiKey: null
};
export const TEST_OBJECT_TYPES: { [k: string]: ObjectType } = {
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
};
export const TEST_COLLECTIONS: CollectionInfo[] = [
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
];