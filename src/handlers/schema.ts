import { ObjectType, SchemaResponse, CollectionInfo, FunctionInfo, ProcedureInfo, ArgumentInfo } from "@hasura/ndc-sdk-typescript";
import { SCALAR_TYPES } from "../constants";

export function doGetSchema(objectTypes: { [k: string]: ObjectType }, collectionNames: string[], functions: FunctionInfo[], procedures: ProcedureInfo[]): SchemaResponse {
    let collectionInfos: CollectionInfo[] = [];
    let functionsInfo: FunctionInfo[] = [];
    let proceduresInfo: ProcedureInfo[] = [];
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
            const proc_insert_one: ProcedureInfo = {
                name: `insert_${cn}_one`,
                description: `Insert a single record into the ${cn} collection`,
                arguments: {
                    "object": {
                        type: {
                            type: "named",
                            name: `${cn}_InsertType`
                        }
                    }
                },
                result_type: {
                    type: "named",
                    name: "JSON"
                }
            };
            proceduresInfo.push(proc_insert_one);

            const proc_upsert_one: ProcedureInfo = {
                name: `upsert_${cn}_one`,
                description: `Upsert a single record into the ${cn} collection`,
                arguments: {
                    "object": {
                        type: {
                            type: "named",
                            name: `${cn}_InsertType`
                        }
                    }
                },
                result_type: {
                    type: "named",
                    name: "JSON"
                }
            };
            proceduresInfo.push(proc_upsert_one);

            const proc_delete_one: ProcedureInfo = {
                name: `delete_${cn}_one`,
                description: `Delete a single record from the ${cn} collection`,
                arguments: {
                    "id": {
                        type: {
                            type: "named",
                            name: "Int"
                        }
                    }
                },
                result_type: {
                    type: "named",
                    name: "JSON"
                }
            }
            proceduresInfo.push(proc_delete_one);

            const proc_update_one: ProcedureInfo = {
                name: `update_${cn}_one`,
                description: `Update a single record from the ${cn} collection`,
                arguments: {
                    "object": {
                        type: {
                            type: "named",
                            name: `${cn}_InsertType`
                        }
                    }
                },
                result_type: {
                    type: "named",
                    name: "JSON"
                }
            }
            proceduresInfo.push(proc_update_one);

            const proc_insert_many: ProcedureInfo = {
                name: `insert_${cn}_many`,
                description: `Insert multiple records into the ${cn} collection`,
                arguments: {
                    "objects": {
                        type: {
                            type: "array",
                            element_type: {
                                type: "named",
                                name: `${cn}_InsertType`
                            }
                        }
                    }
                },
                result_type: {
                    type: "named",
                    name: "JSON"
                }
            };
            proceduresInfo.push(proc_insert_many);

            const proc_upsert_many: ProcedureInfo = {
                name: `upsert_${cn}_many`,
                description: `Upsert multiple records into the ${cn} collection`,
                arguments: {
                    "objects": {
                        type: {
                            type: "array",
                            element_type: {
                                type: "named",
                                name: `${cn}_InsertType` // Assuming this type describes the schema for a single insert.
                            }
                        }
                    }
                },
                result_type: {
                    type: "named",
                    name: "JSON" // Assuming the upsert operation returns a JSON object with details of the operation result.
                }
            };
            proceduresInfo.push(proc_upsert_many);

            const proc_update_many: ProcedureInfo = {
                name: `update_${cn}_many`,
                description: `Update multiple records in the ${cn} collection`,
                arguments: {
                    "objects": { // Note the plural here, indicating multiple objects can be updated
                        type: {
                            type: "array",
                            element_type: {
                                type: "named",
                                name: `${cn}_InsertType` // Assuming this type describes the schema for updating a record in the collection
                            }
                        }
                    }
                },
                result_type: {
                    type: "named",
                    name: "JSON" // Assuming the update operation returns a JSON object with details of the operation result
                }
            };
            proceduresInfo.push(proc_update_many);

            const proc_delete_many: ProcedureInfo = {
                name: `delete_${cn}_many`,
                description: `Delete multiple records from the ${cn} collection using their IDs`,
                arguments: {
                    "ids": { // Accepting an array of IDs for deletion
                        type: {
                            type: "array",
                            element_type: {
                                type: "named",
                                name: "Int"
                            }
                        }
                    }
                },
                result_type: {
                    type: "named",
                    name: "JSON" // The delete operation might return a JSON object with details like number of records deleted
                }
            };
            proceduresInfo.push(proc_delete_many);
        }
    }
    const schemaResponse: SchemaResponse = {
        scalar_types: SCALAR_TYPES,
        functions: functionsInfo,
        procedures: proceduresInfo,
        object_types: objectTypes,
        collections: collectionInfos
    };
    return schemaResponse;
}