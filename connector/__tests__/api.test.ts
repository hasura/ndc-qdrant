import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from '../config';
import { getQdrantClient } from '../qdrant';
import { getSchema } from '../handlers/schema';

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

  // Step 2: Stub out a function to setup the database
  async function setupDatabase() {
    let schema = getSchema();
    let config = getConfig(schema);
    let client = getQdrantClient(config);
    let data = await loadDataFromFile(dataFile);

    // Define a type that describes the expected structure of your points
    type Point = {
      id: string | number;
      vector: number[] | { [key: string]: number[]; };
      payload?: Record<string, any> | { [key: string]: any; };
    };

    // Then use this type for the points array
    let points: Point[] = [];

    for (let [key, value] of Object.entries(data)) {
      let ps: object[] = value as object[];
      let p: object = ps.length === 0 ? null : ps[0];
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
      // Reset the points array for each collection
      points = [];

      for (let point of ps) {
        // Make sure point has the necessary properties before pushing it to the points array
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
        const apiResponse = await axios({ method, url: `http://127.0.0.1:8101/${url}`, data: request });
        expect(apiResponse.data).toEqual(response);
    });
    });
  });
});