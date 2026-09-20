import json

with open('data/lessons/viet-doan-van/04-lien-ket-cau-trong-doan.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Transform top level
new_data = {
    "id": "viet-doan-van-06", # standardizing ID based on lessonNumber
    "title": data.get("title", ""),
    "type": "skill",
    "version": "1.0.0",
    "meta": {
        "module": "viet-doan-van",
        "lessonNumber": data.get("lessonNumber", 6),
        "durationMinutes": 30, # default
        "difficulty": "beginner",
        "skill": "lien-ket",
        "description": data.get("description", "")
    },
    "learningGoals": data.get("learningGoal", {}).get("skills", []),
    "completion": {
        "requiredSections": data.get("lessonCompletion", {}).get("requiredSteps", []),
        "action": "completeLesson",
        "message": f"🎉 Em đã hoàn thành bài {data.get('title', '')}!"
    },
    "steps": []
}

# Transform steps
# In format 00, each step has "id", "type", and "data" containing everything else.
for old_step in data.get("steps", []):
    new_step = {
        "id": old_step.get("id", "") + "_01",
        "type": old_step.get("type", "")
    }
    
    # We move everything else into 'data'
    step_data = {}
    for k, v in old_step.items():
        if k not in ["id", "type", "step"]:
            step_data[k] = v
            
    new_step["data"] = step_data
    new_data["steps"].append(new_step)

with open('data/lessons/viet-doan-van/04-lien-ket-cau-trong-doan.json', 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, indent=4)

print("Transformed successfully")
