from src.y2026.lab_01_ai_agent.prompt_eng_03 import task_1_zero_shot, task_2_one_shot, task_3_few_shot, task_4_cot, \
    task_5_comparision

from pathlib import Path
from dotenv import load_dotenv
BASE_DIR = Path(__file__).resolve().parents[1]
print(f"BASE_DIR : {BASE_DIR}")
load_dotenv(BASE_DIR / ".env")

task_1_zero_shot.main()
task_2_one_shot.main()
task_3_few_shot.main()
task_4_cot.main()
task_5_comparision.main()