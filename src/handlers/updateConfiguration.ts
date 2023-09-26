import { Configuration } from "..";
import { getQdrantClient } from "../qdrant";
import { ObjectField, Type } from "ts-connector-sdk/schemas/SchemaResponse";

const baseFields: Record<string, ObjectField> = {
    id: {
        description: null,
        arguments: {},
        type: {
            type: "named",
            name: "Int"
        }
    },
    score: {
        description: null,
        arguments: {},
        type: {
            type: "nullable",
            underlying_type: {
                type: "named",
                name: "Float"
            }
        }
    },
    vector: {
        description: null,
        arguments: {},
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
};

const recursiveType = (val: any): Type => {
    const wrapNull = (x: Type): Type => ({
        type: "nullable",
        underlying_type: x
    });

    if (Array.isArray(val)) {
        const new_val = val.length === 0 ? "str" : val[0];
        return wrapNull({
            type: "array",
            element_type: recursiveType(new_val)
        });
    } else if (typeof val === 'boolean') {
        return wrapNull({
            type: "named",
            name: "Bool"
        });
    } else if (typeof val === 'string') {
        return wrapNull({
            type: "named",
            name: "String"
        });
    } else if (typeof val === 'number') {
        if (Number.isInteger(val)) {
            return wrapNull({
                type: "named",
                name: "Int"
            });
        } else {
            return wrapNull({
                type: "named",
                name: "Float"
            });
        }
    } else {
        throw new Error(`Not Implemented: ${typeof val}`);
    }
}

const insertion = (payloadDict: Record<string, any>): Record<string, ObjectField> => {
    let responseDict: Record<string, ObjectField> = {};
    for (const [k, v] of Object.entries(payloadDict)) {
        responseDict[k] = {
            description: null,
            arguments: {},
            type: recursiveType(v)
        }
    }
    return responseDict;
}


export async function doUpdateConfiguration(configuration: Configuration): Promise<Configuration> {
    const client = getQdrantClient(configuration.qdrant_url, configuration.qdrant_api_key);
    
    if (!configuration.object_types){
        configuration.object_types = {};
        const collections = await client.getCollections();
        for (const c of collections.collections){
            const { points: records } = await client.scroll(c.name, {
                limit: 1,
                with_payload: true
            });
            if (records.length > 0) {
                const recordPayload = records[0].payload;
                const fieldDict = insertion(recordPayload!);
                configuration.object_types[c.name] = {
                    description: null,
                    fields: {
                        ...fieldDict,
                        ...baseFields
                    }
                }
            }
        }
    
        if (!configuration.functions){
            configuration.functions = [];
        }
    
        if (!configuration.procedures){
            configuration.procedures = [];
        }
    }
    return configuration;
}