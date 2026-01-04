import json
import logging
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def generate_embedding(model_id, body):
    """
    Generate an embedding with the vector representation of a text input using Amazon Titan Embeddings G1 - Text on demand.
    Args:
        model_id (str): The model ID to use.
        body (str) : The request body to use.
    Returns:
        response (JSON): The embedding created by the model and the number of input tokens.
    """

    logger.info("Generating an embedding with Amazon Titan Embeddings G1 - Text model %s", model_id)
    session = boto3.Session(profile_name='genai', region_name='us-east-2')
    bedrock = session.client(service_name='bedrock-runtime')

    accept = "application/json"
    content_type = "application/json"

    response = bedrock.invoke_model(
        body=body, modelId=model_id, accept=accept, contentType=content_type
    )
    response_body = json.loads(response.get('body').read())
    return response_body


def main():
    logging.basicConfig(level=logging.INFO,format="%(levelname)s: %(message)s")
    model_id = "amazon.titan-embed-text-v1"
    model_id = "amazon.titan-embed-text-v2:0"
    input_text = "What are the different services that you offer?"

    body = json.dumps({
        "inputText": input_text,
    })

    try:
        response = generate_embedding(model_id, body)
        print(f"Generated an embedding: {response['embedding']}")
        print(f"Input Token count:  {response['inputTextTokenCount']}")
    except ClientError as err:
        message = err.response["Error"]["Message"]
        logger.error("A client error occurred: %s", message)
        print("A client error occured: " +
              format(message))
    else:
        print(f"Finished generating an embedding with Amazon Titan Embeddings G1 - Text model {model_id}.")


if __name__ == "__main__":
    main()
