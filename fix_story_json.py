import json

with open('data/lessons/viet-doan-van/04-lien-ket-cau-trong-doan.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for step in data.get('steps', []):
    if step.get('type') == 'story':
        step['data']['connectionData']['links'] = [
            {
                "id": "l1", "from": "s1", "to": "s2", "type": "unknown", "status": "interactive", "label": "?",
                "interactiveConfig": {
                    "question": "Hai câu này có thật sự nối với nhau không?",
                    "options": ["Có", "Không"],
                    "correctAnswer": "Không",
                    "actionOnCorrect": "break"
                }
            },
            {
                "id": "l2", "from": "s2", "to": "s3", "type": "unknown", "status": "interactive", "label": "?",
                "interactiveConfig": {
                    "question": "Hai câu này có thật sự nối với nhau không?",
                    "options": ["Có", "Không"],
                    "correctAnswer": "Không",
                    "actionOnCorrect": "break"
                }
            },
            {
                "id": "l3", "from": "s3", "to": "s4", "type": "unknown", "status": "interactive", "label": "?",
                "interactiveConfig": {
                    "question": "Hai câu này có thật sự nối với nhau không?",
                    "options": ["Có", "Không"],
                    "correctAnswer": "Không",
                    "actionOnCorrect": "break"
                }
            }
        ]

with open('data/lessons/viet-doan-van/04-lien-ket-cau-trong-doan.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

