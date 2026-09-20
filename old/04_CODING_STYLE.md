# TS10 Learning Platform

# Coding Style Guide

Version: Sprint 2

Status: Active

---

# 1. Purpose

Tài liệu này quy định cách viết mã nguồn cho toàn bộ dự án TS10 Learning.

Mục tiêu:

- Code dễ đọc.
- Dễ bảo trì.
- Dễ mở rộng.
- Dễ review.
- AI và lập trình viên đều tuân theo cùng một quy ước.

---

# 2. Technology Stack

Sử dụng:

- HTML5
- CSS3
- Vanilla JavaScript (ES Modules)

Không sử dụng:

- React
- Vue
- Angular
- jQuery
- Bootstrap

---

# 3. Project Structure

```
css/
js/
components/
validators/
data/
lessons/
assets/
docs/
```

Không tự ý thay đổi cấu trúc thư mục trong Sprint 3.

---

# 4. JavaScript Style

Sử dụng ES Modules.

Đúng

```javascript
import Renderer from "./renderer.js";

export default class Engine {

}
```

Sai

```javascript
var Engine = function(){

}
```

---

# 5. Naming Convention

## File

camelCase

Ví dụ

```
lessonEngine.js

answerEngine.js

scoreEngine.js
```

---

## Class

PascalCase

```javascript
class LessonEngine
```

```javascript
class ScoreEngine
```

---

## Function

camelCase

```javascript
loadLesson()

renderStep()

saveAnswer()

nextStep()
```

---

## Variable

camelCase

```javascript
currentLesson

currentStep

lessonData

totalScore
```

---

## Constant

UPPER_CASE

```javascript
MAX_SCORE

DEFAULT_TIME

STEP_TYPES
```

---

# 6. Indentation

Dùng

```
4 spaces
```

Không dùng tab.

---

# 7. Quotes

Sử dụng

```javascript
"string"
```

Không trộn lẫn

```
'
"
`
```

Trừ khi dùng Template Literal.

---

# 8. Semicolon

Luôn kết thúc câu lệnh bằng

```
;
```

Ví dụ

```javascript
const score = 10;
```

---

# 9. Curly Braces

Luôn mở ngoặc cùng dòng.

Đúng

```javascript
if (score > 0) {

}
```

Sai

```javascript
if(score>0)
{

}
```

---

# 10. Comment Style

Comment ngắn gọn.

```javascript
// Load lesson data

// Validate answer

// Update progress
```

Không viết comment mô tả điều hiển nhiên.

---

# 11. Function Rules

Một function chỉ làm một nhiệm vụ.

Ưu tiên

```
20 ~ 40 dòng
```

Không nên vượt

```
60 dòng
```

Nếu dài hơn nên tách function.

---

# 12. Class Rules

Một class chỉ chịu trách nhiệm một module.

Ví dụ

```
Renderer

↓

Render UI
```

Không xử lý

- Score
- Storage
- Validation

---

# 13. File Rules

Một file chỉ chứa một class chính.

Không tạo file quá lớn.

Khuyến nghị

```
100 ~ 250 dòng
```

Tối đa

```
400 dòng
```

---

# 14. HTML Rules

Không dùng inline event.

Sai

```html
<button onclick="save()">
```

Đúng

```javascript
button.addEventListener("click", save);
```

---

# 15. CSS Rules

Không dùng inline style.

Sai

```html
<div style="color:red">
```

Đúng

```css
.error {

    color:red;

}
```

---

# 16. CSS Naming

Sử dụng

kebab-case

Ví dụ

```
lesson-card

lesson-title

sidebar-item

step-header

progress-bar
```

---

# 17. Component Rules

Mỗi component đều phải có.

```javascript
render()

bind()

destroy()
```

Nếu có dữ liệu nhập.

```javascript
getAnswer()
```

---

# 18. Validator Rules

Validator chỉ làm nhiệm vụ kiểm tra.

Không render HTML.

Không thao tác DOM.

Đầu vào

```
answer
```

Đầu ra

```javascript
{

    correct:true,

    score:2

}
```

---

# 19. Renderer Rules

Renderer

Được phép

- render
- update UI

Không được

- validate
- lưu storage
- tính điểm

---

# 20. Engine Rules

Engine điều phối.

Không render HTML.

Không viết CSS.

Không thao tác trực tiếp Component.

---

# 21. Storage Rules

Chỉ lưu dữ liệu.

Không tính điểm.

Không validate.

Không render.

---

# 22. JSON Rules

JSON phải hợp lệ.

Không comment.

Không trailing comma.

Không xuống dòng trong string.

Đúng

```json
{

    "title":"Lesson 01"

}
```

Sai

```json
{

title:'Lesson'

}
```

---

# 23. Lesson Rules

Một lesson gồm nhiều step.

Thứ tự cố định.

```
Observe

↓

Identify

↓

Explain

↓

FillBlank

↓

Reflection
```

Không thay đổi thứ tự.

---

# 24. Component Registration

Component mới phải đăng ký trong

```
components/index.js
```

và

```
componentFactory.js
```

---

# 25. Error Handling

Không để lỗi làm dừng ứng dụng.

Luôn kiểm tra

```javascript
if (!lesson) {

    return;

}
```

---

# 26. Import Rules

Import theo thứ tự.

1.

Library

2.

Project

3.

CSS (nếu có)

Ví dụ

```javascript
import Renderer from "./renderer.js";

import Storage from "./storage.js";
```

---

# 27. Commit Rules

Một commit chỉ làm một việc.

Đúng

```
Add Matching Component

Fix Renderer

Update Progress
```

Sai

```
Fix everything
```

---

# 28. AI Coding Rules

AI phải:

- Đọc PROJECT_GUIDE.md trước.
- Đọc ARCHITECTURE.md nếu sửa nhiều file.
- Không đổi cấu trúc thư mục.
- Không đổi Lesson Flow.
- Không đổi JSON format.
- Không thêm framework.
- Không đổi tên file nếu không được yêu cầu.

---

# 29. Code Review Checklist

Trước khi commit.

- Code chạy.
- Không lỗi console.
- Không có import thừa.
- Không có biến không dùng.
- Không có function trùng.
- JSON hợp lệ.
- Lesson vẫn render.
- Progress vẫn hoạt động.

---

# 30. Sprint 2 Baseline

Đây là Coding Style chính thức của dự án sau Sprint 2.

Mọi code mới từ Sprint 3 trở đi phải tuân thủ tài liệu này.

---

End of Document