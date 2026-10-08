PHASE 2 — COMPLETE
PASS ALL

- Cấu trúc src/ và tests/ đã được chuẩn hóa.
- Integration tests nằm đúng tầng.
- Các artifact tạm đã được dọn.
- Các engine và validator đã LOCK được giữ nguyên.
- Full regression PASS sau cleanup.

Tiếp theo: Phase 3 — Minimum Usable Learning System
Hiện tại hệ thống đã có các engine cốt lõi và một pipeline học K283 được kiểm chứng. Nhưng pipeline chạy đúng chưa đồng nghĩa học sinh đã có thể sử dụng hệ thống để học thật.
Anh đề xuất Phase 3 tập trung vào việc biến pipeline thành một vòng học hoàn chỉnh:
Học sinh bắt đầu phiên học
Chọn cụm kiến thức, chế độ học


Adaptive + Lesson
Xác định nội dung cần học


Question + Evaluation
Luyện tập và chấm đáp án


Mastery + Remediation
Đánh giá và sửa lỗ hổng


StudySession
Điều phối vòng học




Tiến độ được lưu và khôi phục
Học sinh quay lại học tiếp mà không mất lịch sử


Thứ tự triển khai đề xuất
Bước	Công việc	Mục tiêu
3.1	Runtime Session Contract Audit	Xác định dữ liệu cần lưu/khôi phục
3.2	Persistence Layer	Lưu Student State, attempts, events và runtime evidence
3.3	Session Resume	Khôi phục phiên học chính xác
3.4	Learning API	Giao tiếp giữa frontend và StudySession
3.5	Minimal Learning UI	Học bài, trả lời câu hỏi, xem phản hồi
3.6	End-to-end Acceptance Tests	Kiểm chứng học → lưu → thoát → học tiếp
Bắt đầu từ 3.1, không viết Persistence ngay. Ta cần audit studySession.js, student-state.schema.json, attempt.schema.json và cơ chế runtime evidence hiện tại để tránh lưu trùng dữ liệu hoặc làm sai Mastery Contract V2.
Mục tiêu của Phase 3 là có một bản K283 Learning MVP mà em có thể thực sự sử dụng hằng ngày. Sau đó mới mở rộng sang K281, K282, K284 và những cụm kiến thức khác.