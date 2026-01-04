from fastapi import FastAPI, Request
from pydantic import BaseModel
from src.AIModule.poc_1.bedrock_client import call_claude

app = FastAPI()

class QuestionRequest(BaseModel):
    question: str

@app.post("/ask")
async def ask_question(request: QuestionRequest):
    answer = call_claude(request.question)
    return {"answer": answer}
