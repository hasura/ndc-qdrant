from qdrant_client import QdrantClient
import json
import argparse

def recursive_type(val):
    def wrap_null(x):
        return {
            "type": "nullable",
            "underlying_type": x
        }

    if isinstance(val, list):
        new_val = "str" if len(val) == 0 else val[0]
        return wrap_null({
            "type": "array",
            "element_type": {
                **recursive_type(new_val)
            }
        })
    elif isinstance(val, bool):
        return wrap_null({
            "type": "named",
            "name": "Bool"
        })
    elif isinstance(val, str):
        return wrap_null({
            "type": "named",
            "name": "String"
        })
    elif isinstance(val, int):
        return wrap_null({
            "type": "named",
            "name": "Int"
        })
    elif isinstance(val, float):
        return wrap_null({
            "type": "named",
            "name": "Float"
        })
    else:
        raise NotImplementedError(f"{type(val)} Not Implemented")

def insertion(payload_dict):
    response_dict = {}
    for k, v in payload_dict.items():
        response_dict[k] = {
            "description": None,
            "arguments": {},
            "type": {
                **recursive_type(v)
            }
        }
    return response_dict

def main(qdrant_url="localhost", qdrant_port=6333, qdrant_api_key=None, out_file="type_stubs.json"):
    client = QdrantClient(qdrant_url, 
                          port=qdrant_port,
                          api_key=qdrant_api_key
                          )
    base_fields = {
        "id": {
            "description": None,
            "arguments": {},
            "type": {
                "type": "named",
                "name": "Int"
            }
        },
        "score": {
            "description": None,
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
            "description": None,
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
        },
    }
    object_types = {}
    collection_names = [c.name for c in client.get_collections().collections]
    for cn in collection_names:
        records, _ = client.scroll(collection_name=cn,
                                limit=1,
                                with_payload=True)
        field_dict = {}
        if len(records) > 0:
            record_payload = records[0].payload
            field_dict = insertion(record_payload)
        object_types[cn] = {
            "description": None,
            "fields": {
                **field_dict,
                **base_fields
            }
        }
    collections = []
    for cn in collection_names:
        collections.extend([
            {
                "name": cn + "s",
                "description": None,
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
                    },
                    "search": {
                        "type": {
                            "type": "nullable",
                            "underlying_type": {
                                "type": "named",
                                "name": "String"
                            }
                        }
                    },
                    "searchModel": {
                        "type": {
                            "type": "nullable",
                            "underlying_type": {
                                "type": "named",
                                "name": "String"
                            }
                        }
                    },
                    "searchUrl": {
                        "type": {
                            "type": "nullable",
                            "underlying_type": {
                                "type": "named",
                                "name": "String"
                            }
                        }
                    },
                },
                "type": cn,
                "deletable": False,
                "uniqueness_constraints": {
                    cn.capitalize() + "ByID": {
                        "unique_columns": [
                            "id"
                        ]
                    }
                },
                "foreign_keys": {}
            }
        ])
    with open(out_file, "w") as f:
        f.write(json.dumps(
            {
                "object_types": object_types,
                "collections": collections
            }))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Qdrant schema downloader')
    parser.add_argument('--qdrant_url', type=str, default="localhost", help='Qdrant server URL.')
    parser.add_argument('--qdrant_port', type=int, default=6333, help='Qdrant server port.')
    parser.add_argument('--qdrant_api_key', type=str, default=None, help='Qdrant API key.')
    parser.add_argument('--out_file', type=str, default="type_stubs.json", help='Path to output the file to.')
    args = parser.parse_args()
    main(qdrant_url=args.qdrant_url,
         qdrant_port=args.qdrant_port,
         qdrant_api_key=args.qdrant_api_key,
         out_file=args.out_file)