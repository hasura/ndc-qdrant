import { SchemaResponse } from "./schemas/SchemaResponse";

export type QdrantConfig = {
    url: string;
    apiKey: string | null;
    schema: SchemaResponse,
    collections: string[];
    collectionFields: { [collectionName: string]: string[]};
}

export const getConfig = (schema: SchemaResponse): QdrantConfig => {
    // schema.object_types
    let cols: string[] = [];
    let collectionFields: { [collectionName: string]: string[]} = {};

    for (let c of schema.collections){
        cols.push(c.name);
    }

    for (let [collectionName, collectionObj] of Object.entries(schema.object_types)) {
        collectionFields[collectionName] = Object.keys(collectionObj.fields);
    }

    console.log(schema);
    console.log(cols);
    console.log(collectionFields);

    return {
        url: "http://localhost:6333",
        apiKey: null,
        schema: schema,
        collections: cols,
        collectionFields: collectionFields
    }
}