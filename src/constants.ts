import { CapabilitiesResponse } from "ts-connector-sdk/schemas/CapabilitiesResponse";
import { ScalarType } from "ts-connector-sdk/schemas/SchemaResponse";
import { FunctionInfo } from "ts-connector-sdk/schemas/SchemaResponse";
import { ProcedureInfo } from "ts-connector-sdk/schemas/SchemaResponse";

export const CAPABILITIES_RESPONSE: CapabilitiesResponse = {
    "versions": "^0.1.0",
    "capabilities": {
        "query": {
            "foreach": {}
        }
    },
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
export const MAX_32_INT: number = 2147483647;