# Sprint 3 Master Checklist

## Sprint Statistics

- Total commits: 25
- Completed commits: 5
- Remaining commits: 20
- Overall progress: 20%
- Latest completed commit: Commit 04 — Timer Persistence
- Next commit: Commit 05 — Step Score

---

## Commit Tracking

### Commit 00 — Storage Migration

- Commit Number: Commit 00
- Commit Name: Storage Migration
- Goal: Upgrade schema của localStorage từ Sprint 2 sang Sprint 3 mà không làm hỏng dữ liệu cũ.
- Status: Completed
- Dependency: None
- Files Modified: storage.js, app.js
- New Files: js/storageMigration.js
- Rollback Available: Yes
- Review Completed: Yes
- Tests Passed: Yes

### Commit 01 — History Service

- Commit Number: Commit 01
- Commit Name: History Service
- Goal: Thêm service lưu lịch sử đáp án riêng cho từng bước.
- Status: Completed
- Dependency: Commit 00
- Files Modified: storage.js
- New Files: js/history.js
- Rollback Available: Yes
- Review Completed: Yes
- Tests Passed: Yes

### Commit 02 — History Integration

- Commit Number: Commit 02
- Commit Name: History Integration
- Goal: Tích hợp history vào flow trả lời của người học.
- Status: Completed
- Dependency: Commit 01
- Files Modified: answerEngine.js, lessonEngine.js
- New Files: None
- Rollback Available: Yes
- Review Completed: Yes
- Tests Passed: Yes

### Commit 03 — Timer Core

- Commit Number: Commit 03
- Commit Name: Timer Core
- Goal: Thêm timer chạy nền cho học tập.
- Status: Completed
- Dependency: None
- Files Modified: engine.js
- New Files: js/timer.js
- Rollback Available: Yes
- Review Completed: Yes
- Tests Passed: Yes

### Commit 04 — Timer Persistence

- Commit Number: Commit 04
- Commit Name: Timer Persistence
- Goal: Lưu thời gian học vào storage.
- Status: Completed
- Dependency: Commit 03
- Files Modified: storage.js, summary.js
- New Files: None
- Rollback Available: Yes
- Review Completed: Yes
- Tests Passed: Yes

### Commit 05 — Step Score

- Commit Number: Commit 05
- Commit Name: Step Score
- Goal: Chấm điểm riêng cho từng bước theo từng loại step.
- Status: Not Started
- Dependency: None
- Files Modified: scoreEngine.js, lessonEngine.js
- New Files: None
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 06 — Lesson Score

- Commit Number: Commit 06
- Commit Name: Lesson Score
- Goal: Tính tổng điểm cho cả bài học.
- Status: Not Started
- Dependency: Commit 05
- Files Modified: scoreEngine.js, storage.js
- New Files: None
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 07 — Grade

- Commit Number: Commit 07
- Commit Name: Grade
- Goal: Tạo hệ thống xếp loại hoặc grade từ điểm số.
- Status: Not Started
- Dependency: Commit 06
- Files Modified: scoreEngine.js, summary.js
- New Files: None
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 08 — Summary UI

- Commit Number: Commit 08
- Commit Name: Summary UI
- Goal: Tạo giao diện summary cơ bản sau khi hoàn thành bài học.
- Status: Not Started
- Dependency: Commit 07
- Files Modified: summary.js, renderer.js
- New Files: None
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 09 — Summary Statistics

- Commit Number: Commit 09
- Commit Name: Summary Statistics
- Goal: Hiển thị các thống kê cơ bản như đúng/sai/tổng bước.
- Status: Not Started
- Dependency: Commit 08
- Files Modified: summary.js, storage.js
- New Files: None
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 10 — Recommendation

- Commit Number: Commit 10
- Commit Name: Recommendation
- Goal: Thêm gợi ý khuyến nghị cuối bài dựa trên kết quả học.
- Status: Not Started
- Dependency: Commit 09
- Files Modified: summary.js
- New Files: None
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 11 — Analytics Attempts

- Commit Number: Commit 11
- Commit Name: Analytics Attempts
- Goal: Ghi số lần thử làm bài.
- Status: Not Started
- Dependency: Commit 00
- Files Modified: storage.js, answerEngine.js
- New Files: js/analytics.js
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 12 — Analytics Accuracy

- Commit Number: Commit 12
- Commit Name: Analytics Accuracy
- Goal: Tính độ chính xác của quá trình học.
- Status: Not Started
- Dependency: Commit 11
- Files Modified: js/analytics.js, scoreEngine.js
- New Files: None
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 13 — Analytics Weak Topics

- Commit Number: Commit 13
- Commit Name: Analytics Weak Topics
- Goal: Ghi nhận các topic hoặc step thường làm sai.
- Status: Not Started
- Dependency: Commit 12
- Files Modified: js/analytics.js, storage.js
- New Files: None
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 14 — Analytics Learning Time

- Commit Number: Commit 14
- Commit Name: Analytics Learning Time
- Goal: Ghi nhận tổng thời gian học từ timer.
- Status: Not Started
- Dependency: Commit 04
- Files Modified: js/analytics.js, js/timer.js
- New Files: None
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 15 — Unlock Logic

- Commit Number: Commit 15
- Commit Name: Unlock Logic
- Goal: Thêm logic unlock cho bài tiếp theo mà không chạm đến UI.
- Status: Not Started
- Dependency: Commit 06
- Files Modified: storage.js, progress.js
- New Files: js/unlock.js
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 16 — Unlock UI

- Commit Number: Commit 16
- Commit Name: Unlock UI
- Goal: Render trạng thái unlock trên sidebar hoặc UI lesson list.
- Status: Not Started
- Dependency: Commit 15
- Files Modified: sidebar.js
- New Files: None
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 17 — Component Choice

- Commit Number: Commit 17
- Commit Name: Component Choice
- Goal: Thêm component kiểu chọn đáp án đơn.
- Status: Not Started
- Dependency: Commit 16
- Files Modified: componentFactory.js, index.js, answerEngine.js
- New Files: js/components/choice.js
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 18 — Component True/False

- Commit Number: Commit 18
- Commit Name: Component True/False
- Goal: Thêm component kiểu đúng/sai.
- Status: Not Started
- Dependency: Commit 17
- Files Modified: componentFactory.js, answerEngine.js, scoreEngine.js
- New Files: js/components/trueFalse.js
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 19 — Component Matching

- Commit Number: Commit 19
- Commit Name: Component Matching
- Goal: Thêm component nối cặp.
- Status: Not Started
- Dependency: Commit 18
- Files Modified: componentFactory.js, answerEngine.js
- New Files: js/components/matching.js, js/validators/matchValidator.js
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 20 — Component Ordering

- Commit Number: Commit 20
- Commit Name: Component Ordering
- Goal: Thêm component sắp xếp thứ tự.
- Status: Not Started
- Dependency: Commit 19
- Files Modified: componentFactory.js, answerEngine.js
- New Files: js/components/ordering.js, js/validators/orderValidator.js
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 21 — Component Highlight

- Commit Number: Commit 21
- Commit Name: Component Highlight
- Goal: Thêm component bôi đậm/chọn đoạn văn.
- Status: Not Started
- Dependency: Commit 20
- Files Modified: componentFactory.js, answerEngine.js, scoreEngine.js
- New Files: js/components/highlight.js
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 22 — Component Drag & Drop

- Commit Number: Commit 22
- Commit Name: Component Drag & Drop
- Goal: Thêm component kéo thả.
- Status: Not Started
- Dependency: Commit 21
- Files Modified: componentFactory.js, answerEngine.js
- New Files: js/components/dragDrop.js, js/validators/dragValidator.js
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 23 — Component Timeline

- Commit Number: Commit 23
- Commit Name: Component Timeline
- Goal: Thêm component timeline.
- Status: Not Started
- Dependency: Commit 22
- Files Modified: componentFactory.js, answerEngine.js, renderer.js
- New Files: js/components/timeline.js
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

### Commit 24 — Component Flashcard

- Commit Number: Commit 24
- Commit Name: Component Flashcard
- Goal: Thêm component flashcard.
- Status: Not Started
- Dependency: Commit 23
- Files Modified: componentFactory.js, answerEngine.js, animation.js
- New Files: js/components/flashcard.js
- Rollback Available: Yes
- Review Completed: No
- Tests Passed: No

