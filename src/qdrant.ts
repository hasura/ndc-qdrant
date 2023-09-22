import {QdrantClient} from "@qdrant/js-client-rest";

export function getQdrantClient(url: string, apiKey: string | null): QdrantClient {
    if (apiKey === null){
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