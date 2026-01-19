from dotenv import load_dotenv

from src.y2026.lab_01_ai_agent.rag_05 import (
    task_1_setup_vectorstore,
    task_2_document_processing, task_3_llm_integration, task_4_rag_prompt)
from src.y2026.lab_01_ai_agent.rag_05.task_5_complete_rag import test_rag_pipeline

if __name__ == "__main__":
    load_dotenv()

    #task_1_setup_vectorstore.main()
    #task_2_document_processing.main()
    #task_3_llm_integration.initialize_llm_and_test()
    #task_4_rag_prompt.test_prompt_engineering()
    test_rag_pipeline()