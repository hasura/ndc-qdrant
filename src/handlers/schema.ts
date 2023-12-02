import { ObjectType, SchemaResponse, CollectionInfo, FunctionInfo, ProcedureInfo } from "@hasura/ndc-sdk-typescript";
import { SCALAR_TYPES } from "../constants";

export function doGetSchema(objectTypes: { [k: string]: ObjectType }, collectionNames: string[], functions: FunctionInfo[], procedures: ProcedureInfo[]): SchemaResponse {
    let collectionInfos: CollectionInfo[] = [];
    for (const cn of Object.keys(objectTypes)){
        if (collectionNames.includes(cn)){
            collectionInfos.push({
                name: `${cn}`,
                description: null,
                arguments: {
                    search: {
                        type: {
                            type: "nullable",
                            underlying_type: {
                                type: "named",
                                name: "_search"
                            }
                        }
                    },
                    recommend: {
                        type: {
                            type: "nullable",
                            underlying_type: {
                                type: "named",
                                name: "_recommend"
                            }
                        }
                    }
                },
                type: cn,
                uniqueness_constraints: {
                    [`${cn.charAt(0).toUpperCase() + cn.slice(1)}ByID`]: {
                        unique_columns: ["id"]
                    }
                },
                foreign_keys: {}
            });

            // collectionInfos.push({
            //     name: cn,
            //     description: null,
            //     arguments: {
            //         vector: {
            //             type: {
            //                 type: "nullable",
            //                 underlying_type: {
            //                     type: "array",
            //                     element_type: {
            //                         type: "named",
            //                         name: "Float"
            //                     }
            //                 }
            //             }
            //         },
            //         positive: {
            //             type: {
            //                 type: "nullable",
            //                 underlying_type: {
            //                     type: "array",
            //                     element_type: {
            //                         type: "named",
            //                         name: "Int"
            //                     }
            //                 }
            //             }
            //         },
            //         negative: {
            //             type: {
            //                 type: "nullable",
            //                 underlying_type: {
            //                     type: "array",
            //                     element_type: {
            //                         type: "named",
            //                         name: "Int"
            //                     }
            //                 }
            //             }
            //         }
            //     },
            //     type: cn,
            //     uniqueness_constraints: {
            //         [`${cn.charAt(0).toUpperCase() + cn.slice(1)}ByID`]: {
            //             unique_columns: ["id"]
            //         }
            //     },
            //     foreign_keys: {}
            // });
        }
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