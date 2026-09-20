import json

with open('data/lessons/viet-doan-van/04-lien-ket-cau-trong-doan.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for step in data.get('steps', []):
    step_id = step.get('id', '')
    step_type = step.get('type', '')
    step_data = step.get('data', {})

    if step_type == 'story':
        step_data['ui'] = {
            'layout': 'connection_lab'
        }
        step_data['connectionData'] = {
            'layoutDirection': 'vertical',
            'sentences': [
                {"id": "s1", "text": "Em rất thích đọc sách."},
                {"id": "s2", "text": "Lan thường đọc sách mỗi tối."},
                {"id": "s3", "text": "Vì vậy, Minh có rất nhiều kiến thức."},
                {"id": "s4", "text": "Quyển sách giúp em hiểu thêm về cuộc sống."}
            ],
            'links': [
                {"id": "l1", "from": "s1", "to": "s2", "type": "unknown", "status": "broken", "label": "?"},
                {"id": "l2", "from": "s2", "to": "s3", "type": "unknown", "status": "broken", "label": "?"},
                {"id": "l3", "from": "s3", "to": "s4", "type": "unknown", "status": "broken", "label": "?"}
            ]
        }
        # Cleanup old content
        if 'content' in step_data and 'paragraph' in step_data['content']:
            del step_data['content']['paragraph']

    elif step_type == 'observe':
        step_data['ui'] = {
            'layout': 'connection_lab'
        }
        step_data['connectionData'] = {
            'A': {
                'layoutDirection': 'vertical',
                'sentences': [
                    {"id": "a1", "text": "Minh rất thích đọc sách."},
                    {"id": "a2", "text": "Lan thường đọc sách mỗi tối."},
                    {"id": "a3", "text": "Vì vậy, Minh hiểu thêm nhiều điều."},
                    {"id": "a4", "text": "Những cuốn sách rất bổ ích."}
                ],
                'links': [
                    {"id": "la1", "from": "a1", "to": "a2", "type": "unknown", "status": "broken", "label": "?"},
                    {"id": "la2", "from": "a2", "to": "a3", "type": "unknown", "status": "broken", "label": "?"},
                    {"id": "la3", "from": "a3", "to": "a4", "type": "unknown", "status": "broken", "label": "?"}
                ]
            },
            'B': {
                'layoutDirection': 'vertical',
                'sentences': [
                    {"id": "b1", "text": "Minh rất thích đọc sách."},
                    {"id": "b2", "text": "Bạn thường đọc sách mỗi tối."},
                    {"id": "b3", "text": "Nhờ vậy, Minh hiểu thêm nhiều điều."},
                    {"id": "b4", "text": "Những cuốn sách ấy còn giúp Minh mở rộng vốn từ."}
                ],
                'links': [
                    {
                        "id": "lb1", "from": "b1", "to": "b2", "type": "substitution", "status": "interactive", "label": "Bạn",
                        "interactiveConfig": {
                            "question": "“Bạn” đang thay thế cho từ nào?",
                            "options": ["Minh", "Lan", "Sách"],
                            "correctAnswer": "Minh"
                        }
                    },
                    {
                        "id": "lb2", "from": "b2", "to": "b3", "type": "connective", "status": "interactive", "label": "Nhờ vậy",
                        "interactiveConfig": {
                            "question": "Từ ngữ này đang thể hiện quan hệ gì?",
                            "options": ["Kết quả", "Nguyên nhân", "Tương phản"],
                            "correctAnswer": "Kết quả"
                        }
                    },
                    {
                        "id": "lb3", "from": "b3", "to": "b4", "type": "association", "status": "interactive", "label": "Những cuốn sách ấy",
                        "interactiveConfig": {
                            "question": "Cụm từ sau có quan hệ thế nào với cụm từ trước?",
                            "options": ["Nhắc lại và thay thế bằng cách mở rộng", "Lặp lại hoàn toàn", "Không liên quan"],
                            "correctAnswer": "Nhắc lại và thay thế bằng cách mở rộng"
                        }
                    }
                ]
            }
        }
        if 'interactiveConnections' in step_data:
            del step_data['interactiveConnections']

    elif step_type == 'discover':
        step_data['ui'] = {
            'layout': 'connection_lab'
        }
        # Discover has multiple activities. We convert them to connectionData items
        for act in step_data.get('activities', []):
            if act['id'] == 'discover-01':
                act['connectionData'] = {
                    'layoutDirection': 'vertical',
                    'sentences': [
                        {"id": "d1", "text": "Lan rất yêu cây xanh."},
                        {"id": "d2", "text": "Những loài cây ấy làm sân trường trở nên mát mẻ."}
                    ],
                    'links': [
                        {
                            "id": "l1", "from": "d1", "to": "d2", "status": "interactive", "label": "?",
                            "interactiveConfig": {
                                "question": "“Những loài cây ấy” đang liên kết với câu trước bằng cách nào?",
                                "options": ["repeat", "replace", "connect", "none"],
                                "correctAnswer": "replace"
                            }
                        }
                    ]
                }
            elif act['id'] == 'discover-02':
                act['connectionData'] = {
                    'layoutDirection': 'vertical',
                    'sentences': [
                        {"id": "d1", "text": "Nam chăm chỉ đọc sách."},
                        {"id": "d2", "text": "Vì vậy, vốn hiểu biết của bạn ngày càng rộng."}
                    ],
                    'links': [
                        {
                            "id": "l1", "from": "d1", "to": "d2", "status": "interactive", "label": "?",
                            "interactiveConfig": {
                                "question": "“Vì vậy” đang làm nhiệm vụ gì?",
                                "options": ["repeat", "replace", "connect", "association"],
                                "correctAnswer": "connect"
                            }
                        }
                    ]
                }
            elif act['id'] == 'discover-03':
                act['connectionData'] = {
                    'layoutDirection': 'vertical',
                    'sentences': [
                        {"id": "d1", "text": "Mẹ rất yêu hoa."},
                        {"id": "d2", "text": "Những bông hồng trước sân luôn được mẹ chăm sóc cẩn thận."}
                    ],
                    'links': [
                        {
                            "id": "l1", "from": "d1", "to": "d2", "status": "interactive", "label": "?",
                            "interactiveConfig": {
                                "question": "“Hoa” và “những bông hồng” có quan hệ như thế nào?",
                                "options": ["repeat", "replace", "connect", "association"],
                                "correctAnswer": "association"
                            }
                        }
                    ]
                }
            elif act['id'] == 'discover-04':
                act['connectionData'] = {
                    'layoutDirection': 'vertical',
                    'sentences': [
                        {"id": "d1", "text": "Mai rất thích sách."},
                        {"id": "d2", "text": "Những cuốn sách giúp Mai mở rộng hiểu biết."}
                    ],
                    'links': [
                        {
                            "id": "l1", "from": "d1", "to": "d2", "status": "interactive", "label": "?",
                            "interactiveConfig": {
                                "question": "Từ “sách” được sử dụng lại trong câu sau. Đây là cách liên kết nào?",
                                "options": ["repeat", "replace", "connect", "association"],
                                "correctAnswer": "repeat"
                            }
                        }
                    ]
                }
            
            if 'paragraph' in act:
                del act['paragraph']
            if 'question' in act:
                del act['question']
            if 'options' in act:
                del act['options']
            if 'correct' in act:
                del act['correct']

    elif step_type == 'teach':
        step_data['ui'] = {
            'layout': 'connection_lab'
        }
        step_data['connectionData'] = {
            'layoutDirection': 'vertical',
            'sentences': [
                {"id": "t1", "text": "LIÊN KẾT CÂU"},
                {"id": "t2", "text": ""}
            ],
            'links': [
                {"id": "l1", "from": "t1", "to": "t2", "type": "repetition", "status": "default", "label": "LẶP"},
                {"id": "l2", "from": "t1", "to": "t2", "type": "substitution", "status": "default", "label": "THẾ"},
                {"id": "l3", "from": "t1", "to": "t2", "type": "connective", "status": "default", "label": "NỐI"},
                {"id": "l4", "from": "t1", "to": "t2", "type": "association", "status": "default", "label": "LIÊN TƯỞNG"}
            ]
        }
        if 'content' in step_data and 'map' in step_data['content']:
            del step_data['content']['map']

    elif step_type == 'guided_practice':
        step_data['ui'] = {
            'layout': 'connection_lab'
        }
        step_data['connectionData'] = {
            'layoutDirection': 'vertical',
            'sentences': [
                {"id": "s1", "text": "Minh rất thích đọc sách."},
                {"id": "s2", "text": "Lan thường đọc sách mỗi tối."},
                {"id": "s3", "text": "Vì vậy, Minh hiểu thêm nhiều điều."},
                {"id": "s4", "text": "Quyển sách giúp Minh mở rộng vốn từ."}
            ],
            'links': [
                {
                    "id": "l1", "from": "s1", "to": "s2", "status": "weak", "label": "Lan",
                    "interactiveConfig": {
                        "type": "edit_word",
                        "currentText": "Lan",
                        "correctText": "Bạn"
                    }
                },
                {
                    "id": "l2", "from": "s2", "to": "s3", "status": "weak", "label": "Vì vậy",
                    "interactiveConfig": {
                        "type": "edit_word",
                        "currentText": "Vì vậy",
                        "correctText": "Vì vậy"
                    }
                }
            ]
        }

    elif step_type == 'mini_challenge':
        step_data['ui'] = {
            'layout': 'connection_lab'
        }
        step_data['connectionData'] = {
            'layoutDirection': 'vertical',
            'sentences': [
                {"id": "s1", "text": "Mùa hè là mùa em yêu thích nhất."},
                {"id": "s2", "text": "Trời rất nóng."},
                {"id": "s3", "text": "Em thường đi bơi."},
                {"id": "s4", "text": "Bể bơi có nhiều người."},
                {"id": "s5", "text": "Em cảm thấy rất vui."}
            ],
            'links': [
                {"id": "l1", "from": "s1", "to": "s2", "status": "weak", "interactiveConfig": {"type": "add_link"}},
                {"id": "l2", "from": "s2", "to": "s3", "status": "weak", "interactiveConfig": {"type": "add_link"}},
                {"id": "l3", "from": "s3", "to": "s4", "status": "weak", "interactiveConfig": {"type": "add_link"}},
                {"id": "l4", "from": "s4", "to": "s5", "status": "weak", "interactiveConfig": {"type": "add_link"}}
            ]
        }
        if 'paragraph' in step_data:
            del step_data['paragraph']

with open('data/lessons/viet-doan-van/04-lien-ket-cau-trong-doan.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print("Migration completed")
