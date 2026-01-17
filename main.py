from src.y2026.lab_01_ai_agent.prompt_eng_03 import task_1_zero_shot
from src.y2026.lab_01_ai_agent.prompt_eng_03 import task_2_one_shot
from src.y2026.lab_01_ai_agent.prompt_eng_03 import task_3_few_shot
from src.y2026.lab_01_ai_agent.prompt_eng_03 import task_4_cot
from src.y2026.lab_01_ai_agent.prompt_eng_03 import task_5_comparision

from dotenv import load_dotenv

def lab_01_ai_agent():
    task_1_zero_shot.main()
    task_2_one_shot.main()
    task_3_few_shot.main()
    task_4_cot.main()
    task_5_comparision.main()

if __name__ == "__main__":
    load_dotenv() # load API token
    lab_01_ai_agent()
