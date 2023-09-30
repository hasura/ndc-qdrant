import { ObjectType, SchemaResponse, CollectionInfo, FunctionInfo, ProcedureInfo } from "ts-connector-sdk/src/index";
import { SCALAR_TYPES } from "../constants";

export function doGetSchema(objectTypes: { [k: string]: ObjectType }, collectionNames: string[], functions: FunctionInfo[], procedures: ProcedureInfo[]): SchemaResponse {
    let collectionInfos: CollectionInfo[] = [];
    for (const cn of Object.keys(objectTypes)){
        if (collectionNames.includes(`${cn}s`)){
            collectionInfos.push({
                name: `${cn}s`,
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
                deletable: false,
                uniqueness_constraints: {
                    [`${cn.charAt(0).toUpperCase() + cn.slice(1)}ByID`]: {
                        unique_columns: ["id"]
                    }
                },
                foreign_keys: {}
            });
        }
    }
    const schemaResponse: SchemaResponse = {
        scalar_types: SCALAR_TYPES,
        functions: functions,
        procedures: procedures,
        object_types: objectTypes,
        collections: collectionInfos
    };
    console.log(JSON.stringify(schemaResponse));
    return schemaResponse;
}