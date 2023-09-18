from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct, OptimizersConfig
import json
import argparse

def main(file: str = "data.json",
         qdrant_url: str = "localhost",
         qdrant_port: int = 6333,
         qdrant_api_key: str | None = None):
    with open(file, "r") as f:
        data_sets = json.load(f)

    client = QdrantClient(url=qdrant_url, port=qdrant_port, api_key=qdrant_api_key)

    for k, v in data_sets.items():
        client.recreate_collection(
            collection_name=k,
            vectors_config=VectorParams(size=len(v[0]["vector"]), distance=Distance.COSINE)
        )
        point_structs = []
        for p in v:
            point_structs.append(PointStruct(**p))
        client.upsert(
            collection_name=k,
            wait=True,
            points=point_structs
        )

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='A script to interact with Qdrant.')
    parser.add_argument('--file', type=str, default="data.json", help='Path to the data file.')
    parser.add_argument('--qdrant_url', type=str, default="localhost", help='Qdrant server URL.')
    parser.add_argument('--qdrant_port', type=int, default=6333, help='Qdrant server port.')
    parser.add_argument('--qdrant_api_key', type=str, default=None, help='Qdrant API key.')
    args = parser.parse_args()
    main(file=args.file,
         qdrant_url=args.qdrant_url,
         qdrant_port=args.qdrant_port,
         qdrant_api_key=args.qdrant_api_key)