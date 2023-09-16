import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantConfig } from "./config";



export function getQdrantClient(config: QdrantConfig): QdrantClient {
    if (config.apiKey === null){
        return new QdrantClient(
            {
                url: config.url
            }
        );
    }
    return new QdrantClient({
        url: config.url,
        apiKey: config.apiKey
    });
}