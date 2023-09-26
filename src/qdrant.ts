import {QdrantClient} from "@qdrant/js-client-rest";

export function getQdrantClient(url: string, apiKey?: string): QdrantClient {
    if (!apiKey){
        return new QdrantClient(
            {
                url: url
            }
        );
    }
    return new QdrantClient({
        url: url,
        apiKey: apiKey
    });
};