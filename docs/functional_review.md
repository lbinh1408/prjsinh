Sprint 3 — Learning Runtime
1. Lesson Runtime

Mục tiêu:

Chạy được toàn bộ lesson.

Bao gồm

✅ Lesson Engine
✅ Step navigation
✅ Previous / Next
✅ Finish lesson
✅ Restart lesson
✅ Continue lesson
2. Learning Components

13 component

Observe

Identify

Explain

FillBlank

Reflection

Choice

TrueFalse

Matching

Ordering

Highlight

DragDrop

Timeline

Flashcard

Mỗi component có

render()

validate()

save()

restore()

review()
3. Validation System

Validator riêng

Text

Choice

Blank

Order

Match

Drag

Essay
4. Answer Engine

Có khả năng

Collect answer

Restore answer

Current answer

Clear answer

Review answer
5. Score Engine
Step score

Lesson score

Accuracy

Max score

Percentage

History

Reset
6. Feedback Engine
Correct

Wrong

Hint

Explanation

Animation

Sound

Continue
7. Progress Engine

Theo dõi

Current step

Current lesson

Completed

Stars

XP

Module progress
8. History Module

Lưu

Lesson history

Completed date

Attempts

Wrong answers

Correct answers

Review history
9. Timer Module

Theo dõi

Lesson timer

Pause

Resume

Elapsed time

Total study time

Average lesson time

Quan trọng:

Không mất khi reload
10. Analytics Module

Thống kê

Accuracy

Time

XP

Completed

Wrong rate

Average score

Average time

Theo

Lesson

Module

Overall
11. Unlock Module
Prerequisite

Unlock lesson

Unlock module

Stars requirement

XP requirement
12. Summary Module

Sau khi Finish

Hiện

Score

Accuracy

XP

Stars

Time

Correct

Wrong

Review

Continue
13. Storage Layer

Lưu toàn bộ runtime

Progress

History

Answers

Timer

Analytics

Unlock

Settings
14. Keyboard Support
Enter

Space

Arrow

ESC

Tab
15. Sidebar
Lesson list

Current lesson

Completed

Locked

Progress
16. Animation
Transition

Correct

Wrong

Unlock

Summary
17. State Management
App state

Lesson state

Step state

Runtime state
18. Component Factory
Register

Create

Destroy

Unknown component fallback
Functional Requirements
Lesson
✓ start

✓ pause

✓ resume

✓ finish

✓ restart

✓ continue
Step
✓ render

✓ answer

✓ validate

✓ feedback

✓ next

✓ previous
Review Mode
✓ review answers

✓ show correct answer

✓ show explanation

✓ show user answer
Restore

Reload browser

↓

lesson

step

answer

timer

progress

↓

được restore

Analytics

Theo dõi

accuracy

score

time

xp

history
Summary

Hiện

lesson score

lesson time

accuracy

xp

stars

continue
JSON Runtime

Lesson JSON hỗ trợ

lesson

↓

step

↓

component

↓

validator

↓

answer

↓

feedback

↓

hint

↓

score
Runtime Flow
Load lesson

↓

Render component

↓

User answer

↓

Validate

↓

Feedback

↓

Save

↓

Next

↓

...

↓

Finish

↓

Summary

↓

History

↓

Analytics

↓

Unlock

↓

Dashboard (Sprint 4)
Files dự kiến sau Sprint 3
JS
app.js
router.js

engine.js
lessonEngine.js
answerEngine.js
scoreEngine.js

renderer.js
componentFactory.js

storage.js
progress.js
state.js

feedback.js
hint.js
summary.js

keyboard.js
sidebar.js
animation.js

history.js
timer.js
analytics.js
unlock.js

utils.js
Components
observe
identify
explain
fillBlank
reflection

choice
trueFalse
matching
ordering
highlight

dragDrop
timeline
flashcard
Validators
text
choice
blank
drag
order
match
essay

toàn bộ checklist sau đều phải đạt:

Runtime
✅ Chạy được toàn bộ vòng đời lesson (start → finish → summary).
✅ Hỗ trợ đầy đủ 13 component.
✅ Mọi component đều có render, validate, save và restore.
Dữ liệu
✅ Lưu và khôi phục answer, progress, timer, history.
✅ Reload trình duyệt không làm mất trạng thái bài học.
Thống kê
✅ Tính đúng điểm, thời gian, XP và độ chính xác.
✅ Cập nhật history, analytics và unlock khi hoàn thành lesson.
Trải nghiệm
✅ Có feedback, keyboard, sidebar, animation và summary hoạt động ổn định.
✅ Không có runtime error, không circular dependency, không dead code và tuân thủ kiến trúc đã định.