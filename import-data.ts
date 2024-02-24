import { getQdrantClient } from "./src/qdrant";
import fs from 'fs';

const DEFAULT_DATA_FILE = "./__tests__/data/users.json";
const DEFAULT_QDRANT_URL = "http://localhost:6333";
const DEFAULT_DISTANCE_METRIC = "Cosine";
const args = process.argv.slice(2);
let dataFilePath = DEFAULT_DATA_FILE;
let qdrantUrl = DEFAULT_QDRANT_URL;
let apiKey: string | undefined = undefined;
let distanceMetric: "Cosine" | "Euclid" | "Dot" = DEFAULT_DISTANCE_METRIC;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--file':
            dataFilePath = args[i + 1];
            i++;
            break;
        case '--url':
            qdrantUrl = args[i + 1];
            i++;
            break;
        case '--key':
            apiKey = args[i + 1];
            i++;
            break;
        case '--distance':
            if (["Cosine", "Euclid", "Dot"].includes(args[i + 1])) {
                distanceMetric = args[i + 1] as "Cosine" | "Euclid" | "Dot";
            } else {
                console.error(`Invalid distance metric: ${args[i + 1]}. Supported metrics are "Cosine", "Euclid", and "Dot".`);
                process.exit(1);
            }
            i++;
            break;
        default:
            console.error(`Unknown argument: ${args[i]}`);
            process.exit(1);
    }
}


type Point = {
    id: string | number;
    vector: number[] | { [key: string]: number[]; };
    payload?: Record<string, any> | { [key: string]: any; };
};

type PossiblePoint = {
    id?: string | number;
    vector?: number[] | { [key: string]: number[]; };
    payload?: Record<string, any> | { [key: string]: any; };
};

async function loadDataFromFile(filePath: string) {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data);
}

async function setupDatabase() {
    let client = getQdrantClient(qdrantUrl, apiKey);
    let data = await loadDataFromFile(dataFilePath);
    let points: Point[] = [];

    for (let [key, value] of Object.entries(data)) {
        let ps: PossiblePoint[] = value as PossiblePoint[];
        let p: PossiblePoint | null = ps.length === 0 ? null : ps[0];

        if (p === null || !Array.isArray(p["vector"])) {
            throw new Error("Points must have a vector");
        }

        let collectionLen = p["vector"].length;
        
        // Check if the collection exists before trying to create it
        const existingCollections = (await client.getCollections()).collections;
        if (!existingCollections.some(coll => coll.name === key)) {
            await client.createCollection(key, {
                vectors: {
                    size: collectionLen,
                    distance: distanceMetric
                }
            });
        }
        
        points = [];
        for (let point of ps) {
            if ('id' in point && 'vector' in point) {
                points.push(point as Point);
            } else {
                throw new Error("Point object is missing required properties");
            }
        }

        await client.upsert(key, {
            wait: true,
            points: points
        });
    }
}

async function main() {
    console.log(`Loading data from ${dataFilePath}...`);
    await setupDatabase();
    console.log(`Data successfully loaded.`);
}

main().catch(err => {
    console.error(`An error occurred: ${err.message}`);
    process.exit(1);
});