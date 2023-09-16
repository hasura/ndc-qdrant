from qdrant_client import QdrantClient
import json

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

def main():
    client = QdrantClient("localhost", port=6333)
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
                    }
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
    with open("type_stubs.json", "w") as f:
        f.write(json.dumps(
            {
                "object_types": object_types,
                "collections": collections
            }))


if __name__ == "__main__":
    main()