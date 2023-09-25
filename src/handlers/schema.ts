import { ObjectType, SchemaResponse, CollectionInfo, FunctionInfo, ProcedureInfo } from "ts-connector-sdk/schemas/SchemaResponse";
import { SCALAR_TYPES } from "../constants";

export async function doGetSchema(objectTypes: { [k: string]: ObjectType }, functions: FunctionInfo[], procedures: ProcedureInfo[]): Promise<SchemaResponse> {
    let collectionInfos: CollectionInfo[] = [];
    for (const cn of Object.keys(objectTypes)){
        collectionInfos.push({
            name: `${cn}s`,
            description: null,
            arguments: {
                vector: {
                    type: {
                        type: "nullable",
                        underlying_type: {
                            type: "array",
                            element_type: {
                                type: "named",
                                name: "Float"
                            }
                        }
                    }
                },
                positive: {
                    type: {
                        type: "nullable",
                        underlying_type: {
                            type: "array",
                            element_type: {
                                type: "named",
                                name: "Int"
                            }
                        }
                    }
                },
                negative: {
                    type: {
                        type: "nullable",
                        underlying_type: {
                            type: "array",
                            element_type: {
                                type: "named",
                                name: "Int"
                            }
                        }
                    }
                }
            },
            type: cn,
            deletable: false,
            uniqueness_constraints: {
                [`${cn.charAt(0).toUpperCase() + cn.slice(1)}ByID`]: {
                    unique_columns: ["id"]
                }
            },
            foreign_keys: {}
        });
    }
    const schemaResponse: SchemaResponse = {
        scalar_types: SCALAR_TYPES,
        functions: functions,
        procedures: procedures,
        object_types: objectTypes,
        collections: collectionInfos
    };
    return schemaResponse;
}