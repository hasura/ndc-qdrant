import { getQdrantClient } from "./src/qdrant";
import fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);

const DEFAULT_URL = "http://localhost:6333";
const DEFAULT_OUTPUT_FILENAME = "configuration.json";

const args = process.argv.slice(2);
let clientUrl = DEFAULT_URL;
let outputFileName = DEFAULT_OUTPUT_FILENAME;
let apiKey: string | undefined = undefined;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--url':
            clientUrl = args[i + 1];
            i++;
            break;
        case '--key':
            apiKey = args[i + 1];
            i++;
            break;
        case '--output':
            outputFileName = args[i + 1];
            i++;
            break;
        default:
            console.error(`Unknown argument: ${args[i]}`);
            process.exit(1);
    }
}

let client = getQdrantClient(clientUrl);

interface FieldDefinition {
    description: string | null;
    arguments: Record<string, any>;
    type: FieldType;
}

interface FieldType {
    type: "named" | "nullable" | "array";
    name?: string;
    underlying_type?: FieldType;
    element_type?: FieldType;
}

const baseFields: Record<string, FieldDefinition> = {
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

const recursiveType = (val: any, namePrefix: string, objTypes: any): FieldType => {
    const wrapNull = (x: FieldType): FieldType => ({
        type: "nullable",
        underlying_type: x
    });

    if (Array.isArray(val)) {
        const new_val = val.length === 0 ? "str" : val[0];
        return wrapNull({
            type: "array",
            element_type: recursiveType(new_val, namePrefix, objTypes)
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
    } else if (typeof val === "object") {
        const fDict: any = {};
        for (const [k, v] of Object.entries(val)) {
            const nestedName = namePrefix + "_" + k;
            const fieldType = recursiveType(v, nestedName, objTypes);
            fDict[k] = {
                description: null,
                arguments: {},
                type: fieldType
            };
        }
        objTypes[namePrefix] = {
            description: null,
            fields: fDict,
            is_object: true
        };
        return {
            type: "named",
            name: namePrefix
        };
    } else {
        throw new Error(`Not Implemented: ${typeof val}`);
    }
}

const insertion = (collectionName: string, payloadDict: Record<string, any>, objTypes: any): Record<string, FieldDefinition> => {
    let responseDict: Record<string, FieldDefinition> = {};
    for (const [k, v] of Object.entries(payloadDict)) {
        responseDict[k] = {
            description: null,
            arguments: {},
            type: recursiveType(v, collectionName + "_" + k, objTypes)
        }
    }
    return responseDict;
}

async function main() {
    const collections = await client.getCollections();
    const collectionNames = collections.collections.map(c => c.name);
    const pluralCollectionNames = collectionNames.map((i) => i + "s");

    let objectTypes: Record<string, any> = {};
    for (const cn of collectionNames) {
        const { points: records } = await client.scroll(cn, {
            limit: 1,
            with_payload: true
        });
        let fieldDict = {};
        if (records.length > 0) {
            const recordPayload = records[0].payload;
            fieldDict = insertion(cn, recordPayload!, objectTypes);
        }
        objectTypes[cn] = {
            description: null,
            fields: {
                ...fieldDict,
                ...baseFields
            }
        }
    }

    const objectFields: Record<string, string[]> = {};
    for (const [cn, objectType] of Object.entries(objectTypes)) {
        objectFields[cn] = Object.keys(objectType.fields);
    }

    console.log(`Writing object_types and collections to ${outputFileName}`);
    let res: any = {
        qdrant_url: clientUrl,
        config: {
            collection_names: pluralCollectionNames,
            object_fields: objectFields,
            object_types: objectTypes,
            functions: [],
            procedures: []
        }
    };
    if (apiKey){
        res["qdrant_api_key"] = apiKey;
    }
    await writeFile(outputFileName, JSON.stringify(res));
}

main();
