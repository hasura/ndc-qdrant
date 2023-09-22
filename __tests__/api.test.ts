import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { QdrantClient } from "@qdrant/js-client-rest";

function getQdrantClient(url: string, apiKey: string | null): QdrantClient {
    if (apiKey === null) {
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

describe('API Tests', () => {
    const baseDir = path.resolve(__dirname, './requests');
    const dataFile = path.resolve(__dirname, "./data/data.json");
    const testDirs: string[] = [
        path.resolve(baseDir, 'articles'),
        path.resolve(baseDir, 'booleans'),
    ];

    async function loadDataFromFile(filePath: string) {
        const data = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    }

    async function setupDatabase() {
        let client = getQdrantClient("http://localhost:6333", null);
        let data = await loadDataFromFile(dataFile);
        let points: Point[] = [];
        for (let [key, value] of Object.entries(data)) {
            let ps: PossiblePoint[] = value as PossiblePoint[];
            let p: PossiblePoint | null = ps.length === 0 ? null : ps[0];
            if (p === null || !Array.isArray(p["vector"])) {
                throw new Error("Points must have a vector");
            }
            let collectionLen = p["vector"].length;
            await client.recreateCollection(key, {
                vectors: {
                    size: collectionLen,
                    distance: "Cosine"
                }
            });
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

    beforeAll(async () => {
        await setupDatabase();
    });

    afterAll(async () => {
        let client = getQdrantClient("http://localhost:6333", null);
        let data = await loadDataFromFile(dataFile);
        for (let key of Object.keys(data)) {
            await client.deleteCollection(key);
        }
    });

    testDirs.forEach((testDir) => {
        describe(`Testing directory: ${testDir}`, () => {
            const files = fs.readdirSync(testDir);
            const testCases = files.map((file) => {
                const filePath = path.join(testDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const { method, url, request, response } = JSON.parse(content);
                return { filePath, method, url, request, response };
            });

            test.each(testCases)('Testing %s', async ({ filePath, method, url, request, response }) => {
                const apiResponse = await axios({
                    method,
                    url: `http://127.0.0.1:8100/${url}`,
                    data: request
                });
                expect(apiResponse.data).toEqual(response);
            });
        });
    });
});