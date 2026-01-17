import boto3
from src.AIModule.poc_1.prompt_template import education_prompt, education_prompt_1
import json
import os

MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0"
MODEL_VERSION = "bedrock-2023-05-31"
region= "us-east-1"

def call_claude(question: str, max_tokens: int = 400, temperature: float = 0.7) -> str:
    context = load_topic_context()
    messages = [
        {
            "role": "user",
            "content": education_prompt.format(question=question)
         }
    ]

    body = {
        "anthropic_version": MODEL_VERSION,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature
    }
    client = boto3.client("bedrock-runtime", region_name=region)
    response = client.invoke_model(
        modelId=MODEL_ID,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json"
    )

    response_body = response["body"].read()
    parsed = json.loads(response_body)

    try:
        content_parts = parsed["content"]
        if isinstance(content_parts, list):
            return "".join(part.get("text", "") for part in content_parts).strip()
        else:
            return str(content_parts).strip()
    except KeyError:
        return parsed.get("message", "No content returned by Claude.").strip()

def load_topic_context():
    filepath = os.path.join(os.path.dirname(__file__), "topics", "target_date_funds.md")
    with open(filepath, "r") as f:
        return f.read()