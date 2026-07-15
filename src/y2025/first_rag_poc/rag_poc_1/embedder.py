import boto3
import json

#MODEL_ID = "co.embed.multilingual-v1"
MODEL_ID = "amazon.titan-embed-text-v1"
REGION = "us-east-1"

bedrock = boto3.client("bedrock-runtime", region_name=REGION)

def embed_text(texts: list[str]) -> list[list[float]]:
    embeddings = []
    for text in texts:
        body = json.dumps({
            "inputText": text
        })

        response = bedrock.invoke_model(
            modelId=MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json"
        )
        result = json.loads(response["body"].read())
        embeddings.append(result["embedding"])

    return embeddings

