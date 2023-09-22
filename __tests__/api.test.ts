import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { ObjectType, CollectionInfo } from 'ts-connector-sdk/schemas/SchemaResponse';
import {QdrantClient} from "@qdrant/js-client-rest";

function getQdrantClient(url: string, apiKey: string | null): QdrantClient {
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

 const TEST_OBJECT_TYPES: { [k: string]: ObjectType } = {  "article": {
      "description": null,
      "fields": {
          "arr": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "array",
                      "element_type": {
                          "type": "nullable",
                          "underlying_type": {
                              "type": "named",
                              "name": "Int"
                          }
                      }
                  }
              }
          },
          "bool": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "named",
                      "name": "Bool"
                  }
              }
          },
          "float": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "named",
                      "name": "Float"
                  }
              }
          },
          "int": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "named",
                      "name": "Int"
                  }
              }
          },
          "string": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "named",
                      "name": "String"
                  }
              }
          },
          "id": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "named",
                  "name": "Int"
              }
          },
          "score": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "named",
                      "name": "Float"
                  }
              }
          },
          "vector": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "array",
                      "element_type": {
                          "type": "named",
                          "name": "Float"
                      }
                  }
              }
          }
      }
  },
  "boolean": {
      "description": null,
      "fields": {
          "A": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "named",
                      "name": "Bool"
                  }
              }
          },
          "B": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "named",
                      "name": "Bool"
                  }
              }
          },
          "C": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "named",
                      "name": "Bool"
                  }
              }
          },
          "D": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "named",
                      "name": "Bool"
                  }
              }
          },
          "id": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "named",
                  "name": "Int"
              }
          },
          "score": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "named",
                      "name": "Float"
                  }
              }
          },
          "vector": {
              "description": null,
              "arguments": {},
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "array",
                      "element_type": {
                          "type": "named",
                          "name": "Float"
                      }
                  }
              }
          }
      }
  }
};
const TEST_COLLECTIONS: CollectionInfo[] = [
  {
      "name": "articles",
      "description": null,
      "arguments": {
          "vector": {
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "array",
                      "element_type": {
                          "type": "named",
                          "name": "Float"
                      }
                  }
              }
          }
      },
      "type": "article",
      "deletable": false,
      "uniqueness_constraints": {
          "ArticleByID": {
              "unique_columns": [
                  "id"
              ]
          }
      },
      "foreign_keys": {}
  },
  {
      "name": "booleans",
      "description": null,
      "arguments": {
          "vector": {
              "type": {
                  "type": "nullable",
                  "underlying_type": {
                      "type": "array",
                      "element_type": {
                          "type": "named",
                          "name": "Float"
                      }
                  }
              }
          }
      },
      "type": "boolean",
      "deletable": false,
      "uniqueness_constraints": {
          "BooleanByID": {
              "unique_columns": [
                  "id"
              ]
          }
      },
      "foreign_keys": {}
  }
];

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