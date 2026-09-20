import json

raw_json = """
{
    "id": "lesson07",
    "title": "Diễn đạt hay và tránh lỗi",
    "subtitle": "Đánh bóng câu chữ để bài viết rõ, đúng và mượt hơn.",
    "skill": "diễn đạt",
    "steps": [
        {
            "id": "story",
            "type": "story",
            "title": "Câu đúng... nhưng nghe chưa hay?",
            "objective": "Giúp học sinh nhận ra một câu có thể đúng nhưng vẫn chưa tự nhiên, còn lặp hoặc cứng.",
            "ui": {
                "layout": "hero",
                "theme": "sentence_editor",
                "elements": [
                    {
                        "type": "badge",
                        "icon": "🎵",
                        "text": "TAI VĂN"
                    },
                    {
                        "type": "heading",
                        "text": "Câu đúng... nhưng nghe chưa hay?"
                    },
                    {
                        "type": "text",
                        "text": "Đừng sửa vội. Hãy đọc và cảm nhận nhịp."
                    },
                    {
                        "type": "paragraph",
                        "lines": [
                            "Mẹ em là người rất yêu thương em.",
                            "Mẹ em thường hay dậy sớm mỗi buổi sáng.",
                            "Mẹ em nấu những món ăn rất ngon.",
                            "Mẹ em đưa em đến trường mỗi ngày.",
                            "Em rất yêu quý mẹ của em."
                        ]
                    },
                    {
                        "type": "audio_button",
                        "label": "Nghe thử",
                        "action": "play_text"
                    }
                ]
            },
            "question": {
                "text": "Em thấy đoạn này thế nào?",
                "type": "single_choice",
                "options": [
                    {
                        "id": "natural",
                        "text": "Rất tự nhiên"
                    },
                    {
                        "id": "stiff",
                        "text": "Hơi cứng"
                    },
                    {
                        "id": "repetitive",
                        "text": "Có gì đó lặp lại",
                        "correct": true
                    },
                    {
                        "id": "unclear",
                        "text": "Khó giải thích"
                    }
                ]
            },
            "feedback": {
                "text": "Đoạn văn không hẳn sai. Nhưng nó có thể mượt hơn.",
                "reveal_after_answer": true
            }
        },
        {
            "id": "observe",
            "type": "observe",
            "title": "Nghe sự khác biệt",
            "objective": "Cho học sinh cảm nhận sự khác nhau giữa câu văn cứng và câu văn tự nhiên hơn.",
            "ui": {
                "layout": "compare",
                "instruction": "Chạm vào A hoặc B. Hãy chọn đoạn em muốn đọc tiếp.",
                "items": [
                    {
                        "id": "A",
                        "label": "Cộc — cộc — cộc",
                        "text": "Mẹ dậy rất sớm. Mẹ chuẩn bị bữa sáng. Mẹ gọi em dậy. Mẹ đưa em đến trường.",
                        "audio": true
                    },
                    {
                        "id": "B",
                        "label": "Nhịp tự nhiên hơn",
                        "text": "Trời còn chưa sáng, mẹ đã thức dậy chuẩn bị bữa sáng. Khi em vừa tỉnh giấc, mọi thứ đã được mẹ sắp xếp đâu vào đó. Rồi mẹ lại tất bật đưa em đến trường.",
                        "audio": true
                    }
                ]
            },
            "observation_prompt": {
                "text": "Điều gì khiến đoạn B có cảm giác tự nhiên hơn?",
                "type": "reflection",
                "show_answer": false
            },
            "hint": {
                "text": "Hãy chú ý cách mở câu, độ dài câu và những từ được lặp lại.",
                "show_after": "attempt"
            }
        },
        {
            "id": "discover",
            "type": "discover",
            "title": "Bắt lỗi câu văn",
            "objective": "Cho học sinh tự phát hiện phần từ ngữ thừa hoặc gây vướng.",
            "ui": {
                "layout": "sentence_lab",
                "theme": "dark_editor",
                "elements": [
                    {
                        "type": "label",
                        "text": "SENTENCE LAB"
                    },
                    {
                        "type": "interactive_sentence",
                        "tokens": [
                            {
                                "id": "mother",
                                "text": "Mẹ em"
                            },
                            {
                                "id": "thuong",
                                "text": "thường",
                                "target": true
                            },
                            {
                                "id": "hay",
                                "text": "hay",
                                "target": true
                            },
                            {
                                "id": "day",
                                "text": "dậy sớm"
                            },
                            {
                                "id": "morning",
                                "text": "mỗi buổi sáng",
                                "target": true
                            }
                        ],
                        "punctuation": "."
                    }
                ]
            },
            "question": {
                "text": "Từ hoặc cụm từ nào khiến câu bị vướng?",
                "type": "multi_select",
                "correct": [
                    "thuong",
                    "hay",
                    "morning"
                ]
            },
            "reveal": {
                "text": "Em đã bắt được một điểm. “Thường” và “hay” cùng mang ý chỉ tần suất. Không nhất thiết phải dùng cả hai.",
                "after_correct": true
            },
            "discovery": {
                "message": "Một câu hay không chỉ cần đúng. Nó còn cần gọn và tự nhiên."
            }
        },
        {
            "id": "teach",
            "type": "teach",
            "title": "Sentence Polisher",
            "objective": "Cung cấp bộ công cụ cơ bản để học sinh tự chỉnh câu.",
            "ui": {
                "layout": "connection_map",
                "title": "✨ Sentence Polisher",
                "tools": [
                    {
                        "id": "concise",
                        "icon": "✂️",
                        "title": "GỌN",
                        "description": "Bỏ phần thừa, phần lặp."
                    },
                    {
                        "id": "clear",
                        "icon": "🔎",
                        "title": "RÕ",
                        "description": "Làm ý nghĩa sáng và dễ hiểu."
                    },
                    {
                        "id": "accurate",
                        "icon": "🎯",
                        "title": "ĐÚNG",
                        "description": "Chọn từ chính xác, phù hợp."
                    },
                    {
                        "id": "smooth",
                        "icon": "🎵",
                        "title": "MƯỢT",
                        "description": "Điều chỉnh nhịp và cách diễn đạt."
                    }
                ]
            },
            "example": {
                "before": "Mẹ em thường hay dậy sớm mỗi buổi sáng.",
                "after": "Mẹ em thường dậy sớm."
            },
            "diagnostic_question": {
                "text": "Nếu đọc lại câu này, em có bị khựng ở đâu không?",
                "type": "multi_select",
                "options": [
                    {
                        "id": "redundant",
                        "text": "✂️ Từ thừa"
                    },
                    {
                        "id": "unclear",
                        "text": "🔎 Chưa rõ"
                    },
                    {
                        "id": "word_choice",
                        "text": "🎯 Dùng từ"
                    },
                    {
                        "id": "rhythm",
                        "text": "🎵 Nhịp"
                    }
                ]
            }
        },
        {
            "id": "guidedPractice",
            "type": "guided_practice",
            "title": "Sentence Repair Lab",
            "objective": "Học sinh thực hành chỉnh câu theo từng thao tác.",
            "ui": {
                "layout": "editor_lab",
                "steps": [
                    {
                        "id": "polish",
                        "label": "STEP 01 · POLISH",
                        "sentence": "Mẹ em thường hay dậy sớm mỗi buổi sáng.",
                        "actions": [
                            {
                                "id": "remove_hay",
                                "label": "✂️ Bỏ “hay”",
                                "result": "Mẹ em thường dậy sớm mỗi buổi sáng."
                            },
                            {
                                "id": "remove_morning",
                                "label": "✂️ Bỏ “mỗi buổi sáng”",
                                "result": "Mẹ em thường hay dậy sớm."
                            },
                            {
                                "id": "rewrite",
                                "label": "🔄 Viết lại",
                                "type": "free_text"
                            }
                        ],
                        "feedback": {
                            "criteria": [
                                "gọn hơn",
                                "ý vẫn đủ"
                            ]
                        }
                    },
                    {
                        "id": "rhythm",
                        "label": "STEP 02 · 🎵 NHỊP",
                        "sentence": "Mẹ dậy rất sớm. Mẹ chuẩn bị bữa sáng. Mẹ gọi em dậy.",
                        "type": "free_text",
                        "placeholder": "Viết phiên bản mượt hơn..."
                    }
                ]
            }
        },
        {
            "id": "miniChallenge",
            "type": "mini_challenge",
            "title": "Làm câu văn có nhịp",
            "objective": "Học sinh tự chỉnh một đoạn mà không còn được hướng dẫn từng bước.",
            "ui": {
                "layout": "challenge",
                "badge": "NO HINTS",
                "title": "Mix lại đoạn văn",
                "source": "Mẹ dậy sớm. Mẹ chuẩn bị bữa sáng. Mẹ gọi em dậy. Mẹ đưa em đến trường.",
                "editor": {
                    "type": "free_text",
                    "placeholder": "Phiên bản của em..."
                },
                "submit": {
                    "label": "🎧 Nghe & phân tích"
                }
            },
            "ai_feedback": {
                "enabled": true,
                "metrics": [
                    {
                        "id": "clarity",
                        "label": "Ý rõ"
                    },
                    {
                        "id": "repetition",
                        "label": "Giảm lặp"
                    },
                    {
                        "id": "rhythm",
                        "label": "Nhịp"
                    }
                ],
                "example": {
                    "score": 8,
                    "max": 10,
                    "title": "Độ mượt",
                    "strengths": [
                        "Đoạn văn đã tự nhiên hơn"
                    ],
                    "improvements": [
                        "Câu cuối có thể ngắn lại để tạo điểm nhấn"
                    ]
                }
            }
        },
        {
            "id": "reflection",
            "type": "reflection",
            "title": "Tai văn của em",
            "objective": "Hình thành thói quen tự đọc lại và tự phát hiện vấn đề.",
            "questions": [
                {
                    "id": "notice",
                    "text": "Khi đọc lại câu mình viết, em chú ý điều gì?",
                    "type": "multi_select",
                    "options": [
                        "Câu có rõ không?",
                        "Có từ nào thừa?",
                        "Có bị lặp?",
                        "Đọc lên có mượt?"
                    ]
                },
                {
                    "id": "repair",
                    "text": "Nếu câu nghe chưa ổn, em sẽ làm gì?",
                    "type": "free_text",
                    "placeholder": "Em sẽ..."
                }
            ],
            "metacognition": {
                "skill": "self_editing",
                "message": "Người viết tốt không chỉ biết viết. Người viết tốt còn biết đọc lại và sửa."
            }
        },
        {
            "id": "cheatSheet",
            "type": "cheat_sheet",
            "title": "Polish Card",
            "objective": "Tóm tắt quy trình chỉnh câu thành một công cụ có thể dùng lại.",
            "ui": {
                "layout": "card",
                "theme": "dark_editor",
                "title": "✨ ĐÁNH BÓNG CÂU",
                "items": [
                    {
                        "step": 1,
                        "label": "GỌN",
                        "description": "Bỏ từ thừa, bỏ phần lặp."
                    },
                    {
                        "step": 2,
                        "label": "RÕ",
                        "description": "Người đọc hiểu ngay ý."
                    },
                    {
                        "step": 3,
                        "label": "ĐÚNG",
                        "description": "Chọn từ chính xác."
                    },
                    {
                        "step": 4,
                        "label": "MƯỢT",
                        "description": "Đọc lại và chỉnh nhịp."
                    }
                ],
                "formula": "VIẾT → ĐỌC → SỬA → ĐỌC"
            },
            "actions": [
                {
                    "id": "save",
                    "label": "🔖 Lưu"
                },
                {
                    "id": "download",
                    "label": "⬇️ Tải"
                },
                {
                    "id": "try",
                    "label": "🛠️ Thử kiểm tra",
                    "action": "open_micro_challenge"
                }
            ]
        },
        {
            "id": "finalChallenge",
            "type": "final_challenge",
            "title": "🏆 Editor Boss",
            "objective": "Kiểm tra khả năng tự phát hiện và chỉnh sửa lỗi diễn đạt trong một đoạn hoàn chỉnh.",
            "ui": {
                "layout": "boss",
                "stages": [
                    {
                        "id": "detect",
                        "title": "🔍 Detect",
                        "instruction": "Hãy tìm những chỗ đoạn văn chưa diễn đạt tốt.",
                        "interaction": {
                            "type": "sentence_select",
                            "sentences": [
                                "Mẹ em là người rất yêu thương em.",
                                "Mẹ em thường hay dậy sớm mỗi buổi sáng.",
                                "Mẹ em nấu những món ăn rất ngon.",
                                "Mẹ em đưa em đến trường mỗi ngày.",
                                "Em rất yêu quý mẹ của em."
                            ]
                        }
                    },
                    {
                        "id": "repair",
                        "title": "🛠️ Repair",
                        "instruction": "Hãy sửa đoạn văn để cách diễn đạt gọn, rõ và tự nhiên hơn.",
                        "interaction": {
                            "type": "free_text",
                            "placeholder": "Phiên bản đã đánh bóng..."
                        }
                    },
                    {
                        "id": "polish",
                        "title": "🎵 Polish",
                        "instruction": "Đọc lại đoạn văn và tự kiểm tra nhịp câu.",
                        "interaction": {
                            "type": "self_check",
                            "options": [
                                "Có từ thừa",
                                "Có từ bị lặp",
                                "Câu chưa rõ",
                                "Nhịp câu chưa tự nhiên"
                            ]
                        }
                    },
                    {
                        "id": "report",
                        "title": "🤖 Report",
                        "instruction": "Xem AI phân tích phiên bản của em."
                    }
                ]
            },
            "ai_analysis": {
                "enabled": true,
                "report": {
                    "metrics": [
                        {
                            "id": "concise",
                            "label": "Gọn"
                        },
                        {
                            "id": "clear",
                            "label": "Rõ"
                        },
                        {
                            "id": "accurate",
                            "label": "Đúng"
                        },
                        {
                            "id": "repetition",
                            "label": "Tránh lặp"
                        },
                        {
                            "id": "rhythm",
                            "label": "Nhịp"
                        }
                    ],
                    "example": {
                        "smoothness": 78,
                        "strengths": [
                            "Đã giảm được từ thừa",
                            "Đã giảm được hiện tượng lặp",
                            "Ý chính vẫn rõ"
                        ],
                        "improvements": [
                            "Hai câu giữa vẫn có nhịp khá giống nhau",
                            "Có thể thay đổi cách mở câu để đoạn văn tự nhiên hơn"
                        ]
                    }
                }
            }
        }
    ]
}
"""

data = json.loads(raw_json)

normalized = {
    "id": "viet-doan-van-06",
    "title": data.get("title", "Diễn đạt hay và tránh lỗi"),
    "type": "skill",
    "version": "1.0.0",
    "meta": {
        "module": "viet-doan-van",
        "lessonNumber": 6,
        "durationMinutes": 20,
        "difficulty": "intermediate",
        "skill": "dien-dat",
        "description": data.get("subtitle", "Học cách viết câu gọn, rõ, đúng và mượt.")
    },
    "learningGoals": [
        "Nhận ra một câu đúng có thể chưa hay.",
        "Biết cách bắt lỗi câu văn.",
        "Biết cách làm gọn, làm rõ, làm đúng và mượt câu văn."
    ],
    "completion": {
        "requiredSections": [
            "story",
            "observe",
            "discover",
            "teach",
            "guidedPractice",
            "miniChallenge",
            "reflection",
            "cheatSheet",
            "finalChallenge"
        ],
        "action": "completeLesson",
        "message": "🎉 Em đã hoàn thành bài Diễn đạt hay!"
    },
    "steps": []
}

for step in data.get("steps", []):
    new_type = step.get("type")
    # if new_type == 'guidedPractice': new_type = 'guided_practice'
    # if new_type == 'miniChallenge': new_type = 'mini_challenge'
    # if new_type == 'finalChallenge': new_type = 'final_challenge'
    # if new_type == 'cheatSheet': new_type = 'cheat_sheet'
    
    new_step = {
        "id": step.get("id"),
        "type": new_type,
        "data": {}
    }
    
    for key, val in step.items():
        if key not in ['id', 'type']:
            new_step["data"][key] = val
            
    normalized["steps"].append(new_step)

with open('/Users/doducqunynhtram/Documents/projects/prjvan/data/lessons/viet-doan-van/05-dien-dat-hay.json', 'w', encoding='utf-8') as f:
    json.dump(normalized, f, ensure_ascii=False, indent=4)
