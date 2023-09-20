# TODO: For some reason the vector search isn't providing good matches. Even when searching for an embed of an exact match, the results are off, needs to be figured out.

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel
from typing import List

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True
)
# Models are heavy to load, so we will create a cache dict holding the loaded models.
models = {}

class TextTransformRequest(BaseModel):
    model: str
    search: str

@app.get("/health/")
async def health():
    return 200, "OK"

@app.post("/text_transform/")
async def text_transform(request_body: TextTransformRequest) -> List[float]:
    transformer = None
    if models.get(request_body.model, None) is None:
        try:
            transformer = SentenceTransformer(request_body.model)
            models[request_body.model] = transformer
        except Exception as _:
            raise HTTPException(400, "Model not found")
    else:
        transformer = models[request_body.model]
    try:
        res = transformer.encode(request_body.search)
        return res
    except Exception as _:
        raise HTTPException(400, "Encoding failed")
