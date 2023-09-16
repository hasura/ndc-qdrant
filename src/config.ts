import { SchemaResponse } from "./schemas/SchemaResponse";

export type QdrantConfig = {
    url: string;
    apiKey: string | null;
    schema: SchemaResponse,
    collections: string[];
    collectionFields: { [collectionName: string]: string[]};
}


// TODO: Pass config
export const getConfig = (schema: SchemaResponse): QdrantConfig => {
    let cols: string[] = [];
    let collectionFields: { [collectionName: string]: string[]} = {};

    for (let c of schema.collections){
        cols.push(c.name);
    }

    for (let [collectionName, collectionObj] of Object.entries(schema.object_types)) {
        collectionFields[collectionName] = Object.keys(collectionObj.fields);
    }
    return {
        url: "http://localhost:6333",
        apiKey: null,
        schema: schema,
        collections: cols,
        collectionFields: collectionFields
    }
}