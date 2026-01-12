import boto3
from decimal import Decimal
import os

REGION = "us-east-1"
TABLE_NAME = "rag_chunks"
ddb = boto3.resource("dynamodb", region_name=REGION)
table = ddb.Table(TABLE_NAME)

def save_chunk(doc_id, chunk_id, text, embedding, source):
    try:
        item = {
            "PK": f"DOC#{doc_id}",
            "SK": f"CHUNK#{chunk_id}",
            "text": text,
            "embedding": [Decimal(str(x)) for x in embedding],
            "source": source
        }
        table.put_item(Item=item)
        print(f"✅ Saved chunk {chunk_id} to DynamoDB")
    except Exception as e:
        print(f"❌ Error saving to DynamoDB: {e}")

def get_all_chunks2():
    table = ddb.Table(TABLE_NAME)
    response = table.scan()
    items = response["Items"]
    for item in items:
        # Parse embedding from string if needed
        item["embedding"] = [float(x) for x in item["embedding"]]
    return items

import ast  # To safely evaluate strings like "[0.1, 0.2]"
def get_all_chunks():
    table = ddb.Table(TABLE_NAME)
    response = table.scan()
    items = response["Items"]

    for item in items:
        emb = item.get("embedding")
        if isinstance(emb, str):
            emb = ast.literal_eval(emb)  # safely parse string list
        item["embedding"] = [float(x) for x in emb]
    return items
