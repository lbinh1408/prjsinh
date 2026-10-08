Phase 3.2 — Persistence Contract Draft
Trạng thái: DRAFT — NOT LOCKED.
Dựa trên source đã cung cấp: StudySession, LearningFlow, MasteryEngine, Student State và evidence schema.
1. Hành vi đã xác nhận từ source
- createStudySession() luôn khởi tạo session mới; chưa export API resume/hydration.
- getSessionSnapshot() clone toàn bộ session, bao gồm dependencies. Đây không phải checkpoint serializer.
- Runtime evidence được lưu tại session.masteryRuntime.evidenceHistoryByNode[nodeId][dimension].
- mastery-evidence-history.schema.json yêu cầu cấu trúc {schemaVersion:'1.0.0',byDimension:{know,explain,apply,transfer}}. Mỗi observation bắt buộc có attemptId (cho phép null), nhưng runtime observation không bảo đảm có trường này. Không được tự tạo attemptId để hợp thức hóa.
2. Các quyết định về ranh giới contract
Thành phần	Quyết định
Canonical Student State	Lưu nguyên trạng và validate bằng schema hiện tại. Không thêm raw runtime evidence.
Canonical Attempt	Lưu append-only với attemptId duy nhất. Ghi lại cùng ID và cùng payload phải idempotent; khác payload phải bị từ chối.
Runtime evidence	Giữ nguyên giá trị và thứ tự observation trong envelope riêng của checkpoint.
Session checkpoint	Lưu IDs, config, content hashes, decision, lesson progress, selector history, active item khi có thể khôi phục, evidence và revision references.
Content versioning	So sánh SHA-256 của các nguồn nội dung liên quan; từ chối resume khi hash khác nếu chưa có migration.
Atomicity	Attempt, Student State và checkpoint phải được commit bằng transaction hoặc durable atomic bundle.
Event store	Hoãn đến khi xác minh event producer và replay contract.
Resume	Là thao tác hydration riêng; không sử dụng createStudySession() như một API resume.
Checkpoint không chứa toàn bộ question banks, policies, lesson body, generated lesson plan hoặc lastFlowResult.
3. Session Checkpoint V1 — Đề xuất sơ bộ
Đây là cấu trúc minh họa, chưa phải production schema hợp lệ.

{
  "schemaVersion": "1.0.0-draft",
  "checkpointId": "checkpoint-example",
  "revision": 1,
  "savedAt": "2026-10-08T00:00:00.000Z",
  "sessionId": "session-example",
  "studentId": "student-example",
  "runtimeVersion": "0.2.0",
  "studentStateRef": {
    "revision": 1
  },
  "contentHashes": {},
  "config": {},
  "currentDecision": {},
  "lessonProgress": {
    "completedSectionIds": [],
    "skippedSectionIds": []
  },
  "selectionHistory": [],
  "masteryEvidenceHistoryByNode": {},
  "activeItem": null,
  "attemptCursor": null
}



Các placeholder trong ví dụ trên chưa phải object production hợp lệ. Cấu trúc chính xác phải được xác định từ session hiện tại và các bài test.
Đặc biệt, activeItem phải chứa đủ thông tin nhận dạng để khôi phục đúng câu hỏi đang chờ trả lời. Nếu không chứng minh được khả năng đó, phải từ chối save/resume khi câu hỏi đang active.
4. Những kiểm chứng bắt buộc trước khi triển khai
Verification checklist
0/7 hoàn thành



[ ] Chụp snapshot tại bốn trạng thái K283: trước khi chọn câu, hoàn thành nội dung, đang có câu hỏi và sau khi nộp Q010.
[ ] Xác định evidence observation có attemptId hay không và có đầy đủ các trường bắt buộc của từng dimension hay không.
[ ] So sánh trước/sau serialization bằng deepStrictEqual, bao gồm thứ tự evidence và contextId/questionType.
[ ] Chứng minh selector exclusion/history không thay đổi sau round-trip.
[ ] Chứng minh resume câu hỏi đang chờ không chọn câu khác hoặc tạo Attempt trùng.
[ ] Kiểm thử content-hash mismatch, stale revision, duplicate/conflicting attempt ID, crash consistency và input immutability.
[ ] Xác nhận Student State V1.2.0 được validate tại mỗi lần commit và restore.
Checklist theo dõi thủ công. Đánh dấu không đồng nghĩa test đã được chạy trên repository.
5. Bước lập trình an toàn tiếp theo
Tạo bộ characterization tests trong:
tests/integration/persistence/


Trước mắt chỉ viết test, không sửa production code.
Sau khi xác minh cấu trúc runtime, triển khai pure checkpoint codec tại:
src/persistence/


Codec phải không làm thay đổi các engine đã LOCK.
Chưa triển khai storage hoặc hydration cho đến khi các bài kiểm thử codec round-trip PASS.

Kết luận: Phase 3.2 hiện là bản thiết kế chưa LOCK. Công việc kế tiếp là kiểm chứng khả năng serialize/deserialize một phiên học K283 mà vẫn giữ nguyên Student State, evidence history, selection history và câu hỏi đang active.