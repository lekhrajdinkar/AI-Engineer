import boto3

session = boto3.Session(profile_name="genai", region_name="us-east-1")  # or try us-east-1
client = session.client("bedrock")

def list_fm():
    response = client.list_foundation_models()
    for model in response['modelSummaries']:
        print(f"{model['modelId']}  =>  {model['modelName']} ({model['providerName']})")

if '__name__' == '__main__':
    list_fm()