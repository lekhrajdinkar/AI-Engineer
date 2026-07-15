terraform {
  cloud {
    organization = "lekhrajdinkar-org"
    workspaces {
      name = "genai-poc-2-rag"
    }
  }
}

provider "aws" {
  region = "us-east-1"
  shared_credentials_files = ["./credentials"]
  profile                  = "genai"
}

resource "aws_s3_bucket" "rag_bucket" {
  bucket = "genai-rag-demo-lekhrajdinkar-bucket"
  force_destroy = true
}

resource "aws_dynamodb_table" "rag_table" {
  name         = "rag_chunks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  tags = {
    Project = "GenAI-RAG"
  }
}

resource "aws_iam_role" "rag_role" {
  name = "bedrock_rag_execution_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        Service = "bedrock.amazonaws.com"
      },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_policy" "rag_policy" {
  name        = "rag_access_policy"
  description = "Allow access to S3, DynamoDB, Bedrock"
  policy      = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:*"
        ],
        Resource = [
          "arn:aws:s3:::genai-rag-demo-bucket",
          "arn:aws:s3:::genai-rag-demo-bucket/*"
        ]
      },
      {
        Effect = "Allow",
        Action = [
          "dynamodb:*"
        ],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_policy" {
  role       = aws_iam_role.rag_role.name
  policy_arn = aws_iam_policy.rag_policy.arn
}
