import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantClientConfig } from "./config";



export function getQdrantClient(config: QdrantClientConfig): QdrantClient {
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