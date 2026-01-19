from src.y2026.lab_01_ai_agent.prompt_eng_03 import task_1_zero_shot, task_2_one_shot, task_3_few_shot, task_4_cot, \
    task_5_comparision


def test():
    task_1_zero_shot.main()
    task_2_one_shot.main()
    task_3_few_shot.main()
    task_4_cot.main()
    task_5_comparision.main()