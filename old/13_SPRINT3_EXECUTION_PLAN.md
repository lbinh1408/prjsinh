Dưới đây là phiên bản kế hoạch Sprint 3 được chỉnh lại theo đúng kiểu “chặt hơn”, với từng commit chỉ làm một khả năng hoặc một component, phạm vi sửa file hiện có giới hạn ở 3–4 file, và có đầy đủ pre/post condition, test checklist, rollback plan và definition of done.

Nguyên tắc chung cho toàn bộ Sprint 3
Mỗi commit chỉ giải quyết một capability hoặc một component duy nhất.
Mỗi commit sửa tối đa 3–4 file hiện có.
Không đổi cấu trúc thư mục và không đổi kiến trúc tổng thể.
Giữ backward compatibility với lesson cũ của Sprint 2.
Mọi commit phải có thể rollback độc lập.
Bắt buộc tuân thủ:
- ComponentFactory SHALL remain backward compatible.
- ComponentFactory chỉ được dùng để register component mới.
- Không redesign factory.
- Không thay đổi rendering pipeline trong factory.
- Existing validators must never be modified unless fixing a bug.
- Mỗi new component phải có validator riêng.
- Existing validators như choiceValidator không được chỉnh sửa cho các component mới.
Commit 00 — Storage Migration
Mục tiêu:
Upgrade schema của localStorage từ Sprint 2 sang Sprint 3 mà không làm hỏng dữ liệu cũ.
File mới:
js/storageMigration.js
File sửa:
storage.js
app.js
File không được sửa:
engine.js
answerEngine.js
scoreEngine.js
Pre-condition:
Ứng dụng đang đọc dữ liệu storage cũ của Sprint 2.
Post-condition:
Storage mới có thể chứa các key mới như history, analytics, timer mà vẫn giữ dữ liệu cũ.
Test checklist:
Storage cũ vẫn load được.
Dữ liệu answers cũ vẫn còn.
Các key mới được tạo đúng.
Rollback plan:
Gỡ migration và revert storage về schema cũ.
Definition of Done:
Ứng dụng có thể mở và đọc storage cũ mà không crash.
Commit 01 — History Service
Mục tiêu:
Thêm service lưu lịch sử đáp án riêng cho từng bước.
File mới:
js/history.js
File sửa:
storage.js
File không được sửa:
answerEngine.js
lessonEngine.js
engine.js
Pre-condition:
Storage đã hỗ trợ schema mới.
Post-condition:
History có thể lưu và đọc được từ storage.
Test checklist:
Lưu được 1 history item.
Đọc lại đúng dữ liệu.
Không phá dữ liệu cũ.
Rollback plan:
Xoá history module và bỏ các key liên quan.
Definition of Done:
History service hoạt động độc lập với UI.
Commit 02 — History Integration
Mục tiêu:
Tích hợp history vào flow trả lời của người học.
File mới:
Không có
File sửa:
answerEngine.js
lessonEngine.js
File không được sửa:
engine.js
scoreEngine.js
summary.js
Pre-condition:
History service đã sẵn sàng.
Post-condition:
Mỗi lần người dùng trả lời sẽ được ghi vào history.
Test checklist:
Thay đổi câu trả lời tạo history mới.
Reload page vẫn giữ history.
Không làm sai flow cũ.
Rollback plan:
Revert về logic cũ, tắt ghi history.
Definition of Done:
Câu trả lời của người học được ghi nhận qua history.
Commit 03 — Timer Core
Mục tiêu:
Thêm timer chạy nền cho học tập.
File mới:
js/timer.js
File sửa:
engine.js
File không được sửa:
storage.js
summary.js
answerEngine.js
Pre-condition:
Bài học có thể khởi động và render bình thường.
Post-condition:
Timer bắt đầu chạy khi bài học bắt đầu.
Test checklist:
Timer bắt đầu khi mở lesson.
Timer dừng khi kết thúc bài.
Không crash khi re-render.
Rollback plan:
Gỡ timer khỏi engine.
Definition of Done:
Timer hoạt động đúng cho một lesson mở.
Commit 04 — Timer Persistence
Mục tiêu:
Lưu thời gian học vào storage.
File mới:
Không có
File sửa:
storage.js
summary.js
File không được sửa:
engine.js
answerEngine.js
scoreEngine.js
Pre-condition:
Timer core đã chạy.
Post-condition:
Thời gian học được lưu và hiển thị ở summary.
Test checklist:
Thời gian lưu đúng.
Summary đọc đúng dữ liệu timer.
Không ảnh hưởng đến lesson khác.
Rollback plan:
Tắt lưu timer và giữ UI summary cũ.
Definition of Done:
Thời gian học được lưu và sử dụng được ở summary.
Commit 05 — Step Score
Mục tiêu:
Chấm điểm riêng cho từng bước theo từng loại step.
File mới:
Không có
File sửa:
scoreEngine.js
lessonEngine.js
File không được sửa:
summary.js
storage.js
answerEngine.js
Pre-condition:
Câu trả lời đã có thể thu thập đúng.
Post-condition:
Mỗi step có điểm riêng được tính ra.
Test checklist:
Step đúng cho observe/identify/explain/fillBlank/reflection.
Trường hợp sai trả về 0 hoặc điểm phần trăm phù hợp.
Không làm lỗi flow cũ.
Rollback plan:
Quay lại logic điểm cũ của Sprint 2.
Definition of Done:
Step score có thể tính được và trả về đúng.
Commit 06 — Lesson Score
Mục tiêu:
Tính tổng điểm cho cả bài học.
File mới:
Không có
File sửa:
scoreEngine.js
storage.js
File không được sửa:
summary.js
lessonEngine.js
engine.js
Pre-condition:
Step score đã hoạt động.
Post-condition:
Tổng điểm bài học được lưu và đọc được.
Test checklist:
Tổng điểm đúng khi nhiều step.
Giá trị lưu vào storage đúng.
Không làm sai step score.
Rollback plan:
Revert sang logic tính điểm cũ.
Definition of Done:
Lesson score có thể tính và lưu hoàn chỉnh.
Commit 07 — Grade
Mục tiêu:
Tạo hệ thống xếp loại hoặc grade từ điểm số.
File mới:
Không có
File sửa:
scoreEngine.js
summary.js
File không được sửa:
storage.js
lessonEngine.js
engine.js
Pre-condition:
Lesson score đã có.
Post-condition:
Người học nhận được grade dựa trên điểm số.
Test checklist:
Điểm thấp cho grade thấp.
Điểm cao cho grade cao.
Không làm sai summary cũ.
Rollback plan:
Tắt grade và giữ lại điểm số thô.
Definition of Done:
Grade có thể tính được cho một bài học.
Commit 08 — Summary UI
Mục tiêu:
Tạo giao diện summary cơ bản sau khi hoàn thành bài học.
File mới:
Không có
File sửa:
summary.js
renderer.js
File không được sửa:
scoreEngine.js
storage.js
engine.js
Pre-condition:
Lesson score và grade đã có.
Post-condition:
Summary có thể render đúng trong UI.
Test checklist:
Summary xuất hiện sau khi hoàn thành bài.
Không lỗi DOM khi container rỗng.
Giao diện hiển thị đúng.
Rollback plan:
Quay lại flow cũ, không render summary.
Definition of Done:
Màn hình summary chạy được.
Commit 09 — Summary Statistics
Mục tiêu:
Hiển thị các thống kê cơ bản như đúng/sai/tổng bước.
File mới:
Không có
File sửa:
summary.js
storage.js
File không được sửa:
renderer.js
scoreEngine.js
engine.js
Pre-condition:
Summary UI đã tồn tại.
Post-condition:
Summary có dữ liệu thống kê rõ ràng.
Test checklist:
Số bước đúng.
Số đúng/sai đúng.
Không hiển thị dữ liệu sai.
Rollback plan:
Ẩn thống kê khỏi summary.
Definition of Done:
Summary UI có ít nhất 3–4 thống kê cơ bản.
Commit 10 — Recommendation
Mục tiêu:
Thêm gợi ý khuyến nghị cuối bài dựa trên kết quả học.
File mới:
Không có
File sửa:
summary.js
File không được sửa:
scoreEngine.js
storage.js
renderer.js
Pre-condition:
Summary statistics đã có.
Post-condition:
Summary có một khuyến nghị cá nhân hóa đơn giản.
Test checklist:
Recommendation xuất hiện khi cần thiết.
Không hiển thị khi không có dữ liệu.
Rollback plan:
Bỏ phần recommendation khỏi summary.
Definition of Done:
Summary có ít nhất một dòng đề xuất phù hợp.
Commit 11 — Analytics Attempts
Mục tiêu:
Ghi số lần thử làm bài.
File mới:
js/analytics.js
File sửa:
storage.js
answerEngine.js
File không được sửa:
scoreEngine.js
summary.js
engine.js
Pre-condition:
Storage đã hỗ trợ schema mới.
Post-condition:
Mỗi lần thực hiện hành động trả lời được ghi là 1 attempt.
Test checklist:
Attempt tăng khi người dùng submit.
Không tăng khi chỉ mở lesson.
Rollback plan:
Vô hiệu hóa tracking attempts.
Definition of Done:
Số lần thử được ghi đúng.
Commit 12 — Analytics Accuracy
Mục tiêu:
Tính độ chính xác của quá trình học.
File mới:
Không có
File sửa:
js/analytics.js
scoreEngine.js
File không được sửa:
storage.js
summary.js
answerEngine.js
Pre-condition:
Attempts đã được ghi.
Post-condition:
Accuracy có thể tính được từ kết quả.
Test checklist:
Accuracy đúng với điểm đúng/sai.
Không lỗi khi chưa có dữ liệu.
Rollback plan:
Tắt tính accuracy.
Definition of Done:
Accuracy có thể xuất ra một con số hợp lý.
Commit 13 — Analytics Weak Topics
Mục tiêu:
Ghi nhận các topic hoặc step thường làm sai.
File mới:
Không có
File sửa:
js/analytics.js
storage.js
File không được sửa:
scoreEngine.js
summary.js
answerEngine.js
Pre-condition:
Accuracy đã có.
Post-condition:
Weak topics có thể được nhóm lại từ dữ liệu sai.
Test checklist:
Step sai được ghi.
Weak topics không trùng lặp sai.
Rollback plan:
Tắt ghi weak topics.
Definition of Done:
Có ít nhất một danh sách weak topics từ dữ liệu thực tế.
Commit 14 — Analytics Learning Time
Mục tiêu:
Ghi nhận tổng thời gian học từ timer.
File mới:
Không có
File sửa:
js/analytics.js
js/timer.js
File không được sửa:
storage.js
summary.js
engine.js
Pre-condition:
Timer đã chạy.
Post-condition:
Learning time được đếm và lưu.
Test checklist:
Time tăng khi lesson đang mở.
Không tăng khi lesson dừng.
Rollback plan:
Tắt tracking thời gian học.
Definition of Done:
Learning time có thể lưu và đọc lại đúng.
Commit 15 — Unlock Logic
Mục tiêu:
Thêm logic unlock cho bài tiếp theo mà không chạm đến UI.
File mới:
js/unlock.js
File sửa:
storage.js
progress.js
File không được sửa:
sidebar.js
renderer.js
answerEngine.js
summary.js
Pre-condition:
Progress cơ bản đã chạy.
Post-condition:
Logic unlock có thể đánh dấu một lesson là unlockable hoặc locked dựa trên trạng thái hoàn thành.
Test checklist:
Hoàn thành lesson cũ làm unlock logic thay đổi.
Không làm sai progress cũ.
Không crash khi storage rỗng.
Rollback plan:
Tắt logic unlock và giữ lại trạng thái cũ của progress.
Definition of Done:
Unlock logic hoạt động đúng ở layer data/state mà không cần UI.

Commit 16 — Unlock UI
Mục tiêu:
Render trạng thái unlock trên sidebar hoặc UI lesson list.
File mới:
Không có
File sửa:
sidebar.js
File không được sửa:
storage.js
progress.js
renderer.js
answerEngine.js
summary.js
Pre-condition:
Unlock logic đã hoạt động.
Post-condition:
UI hiển thị đúng trạng thái locked/unlocked cho bài tiếp theo.
Test checklist:
Bài chưa unlock hiển thị trạng thái locked.
Bài đã unlock hiển thị trạng thái unlocked.
Không làm lỗi layout cũ.
Rollback plan:
Tắt render unlock trên UI, giữ lại logic cũ.
Definition of Done:
UI cho unlock có thể render đúng mà không ảnh hưởng tới flow cũ.
Commit 17 — Component Choice
Mục tiêu:
Thêm component kiểu chọn đáp án đơn.
File mới:
js/components/choice.js
File sửa:
componentFactory.js
index.js
answerEngine.js
File không được sửa:
explain.js
fillBlank.js
textValidator.js
Pre-condition:
ComponentFactory đã hỗ trợ register/dispatch cơ bản.
Post-condition:
Lesson JSON với type “choice” có thể render được.
Test checklist:
Render đúng UI.
Chọn đáp án được lưu.
Reload page vẫn giữ lựa chọn.
Rollback plan:
Bỏ component khỏi factory.
Definition of Done:
Choice component chạy được cho một lesson mẫu.
Commit 18 — Component True/False
Mục tiêu:
Thêm component kiểu đúng/sai.
File mới:
js/components/trueFalse.js
File sửa:
componentFactory.js
answerEngine.js
scoreEngine.js
File không được sửa:
js/components/choice.js
js/components/matching.js
choiceValidator.js
Pre-condition:
Choice component đã chạy.
Post-condition:
Lesson JSON với type “trueFalse” có thể render và chấm điểm.
Test checklist:
Render đúng 2 lựa chọn.
Đáp án đúng/sai được lưu.
Scoring đúng.
Rollback plan:
Gỡ component khỏi factory.
Definition of Done:
True/False component hoạt động độc lập.
Commit 19 — Component Matching
Mục tiêu:
Thêm component nối cặp.
File mới:
js/components/matching.js
js/validators/matchValidator.js
File sửa:
componentFactory.js
answerEngine.js
File không được sửa:
js/components/trueFalse.js
scoreEngine.js
choiceValidator.js
Pre-condition:
True/False component đã hoạt động.
Post-condition:
Matching có thể render và validate.
Test checklist:
Render đúng các cặp.
Thực hiện nối cặp thành công.
Empty answer / wrong answer / correct answer đều test được.
Rollback plan:
Gỡ component và validator.
Definition of Done:
Matching component có thể dùng trong lesson JSON.
Commit 20 — Component Ordering
Mục tiêu:
Thêm component sắp xếp thứ tự.
File mới:
js/components/ordering.js
js/validators/orderValidator.js
File sửa:
componentFactory.js
answerEngine.js
File không được sửa:
js/components/matching.js
scoreEngine.js
js/validators/matchValidator.js
Pre-condition:
Matching component đã chạy.
Post-condition:
Ordering có thể render và validate đúng thứ tự.
Test checklist:
Empty answer test.
Wrong order test.
Correct order test.
Retry/reset test.
Rollback plan:
Gỡ component và validator.
Definition of Done:
Ordering component hoạt động đầy đủ.
Commit 21 — Component Highlight
Mục tiêu:
Thêm component bôi đậm/chọn đoạn văn.
File mới:
js/components/highlight.js
File sửa:
componentFactory.js
answerEngine.js
scoreEngine.js
File không được sửa:
js/components/ordering.js
js/validators/orderValidator.js
animation.js
Pre-condition:
Ordering component đã hoạt động.
Post-condition:
Highlight có thể render và chấm điểm.
Test checklist:
Chọn highlight được lưu.
Wrong answer / correct answer đều test.
Reload page giữ dữ liệu.
Rollback plan:
Gỡ component khỏi factory.
Definition of Done:
Highlight component chạy được.
Commit 22 — Component Drag & Drop
Mục tiêu:
Thêm component kéo thả.
File mới:
js/components/dragDrop.js
js/validators/dragValidator.js
File sửa:
componentFactory.js
answerEngine.js
File không được sửa:
js/components/highlight.js
scoreEngine.js
animation.js
Pre-condition:
Highlight component đã chạy.
Post-condition:
Drag & Drop có thể render và validate.
Test checklist:
Drag thành công.
Reset lại được.
Wrong answer / correct answer test.
Rollback plan:
Gỡ component và validator.
Definition of Done:
Drag & Drop component hoạt động ổn định.
Commit 23 — Component Timeline
Mục tiêu:
Thêm component timeline.
File mới:
js/components/timeline.js
File sửa:
componentFactory.js
answerEngine.js
renderer.js
File không được sửa:
js/components/dragDrop.js
js/validators/dragValidator.js
animation.js
Pre-condition:
Drag & Drop component đã hoạt động.
Post-condition:
Timeline render được trong lesson.
Test checklist:
Render đúng layout.
Lựa chọn được lưu.
Reload page giữ trạng thái.
Rollback plan:
Gỡ component khỏi factory.
Definition of Done:
Timeline component có thể dùng trong lesson mẫu.
Commit 24 — Component Flashcard
Mục tiêu:
Thêm component flashcard.
File mới:
js/components/flashcard.js
File sửa:
componentFactory.js
answerEngine.js
animation.js
File không được sửa:
js/components/timeline.js
renderer.js
scoreEngine.js
Pre-condition:
Timeline component đã hoạt động.
Post-condition:
Flashcard render được và có thể chuyển giữa trước/sau.
Test checklist:
Render đúng.
Chuyển mặt được.
Lưu trạng thái.
Rollback plan:
Gỡ component khỏi factory.
Definition of Done:
Flashcard component có thể dùng trong lesson JSON.
Gợi ý triển khai ưu tiên
Trước tiên làm các commit nền tảng:
00 → 07
Sau đó làm summary và analytics:
08 → 14
Sau đó làm progress/unlock:
15 → 16
Cuối cùng làm các component mới:
17 → 24
Điểm khác biệt so với bản trước
Đã tách riêng:
History Service
History Integration
Timer Core
Timer Persistence
Step Score
Lesson Score
Grade
Summary UI
Summary Statistics
Recommendation
Analytics Attempts
Analytics Accuracy
Analytics Weak Topics
Analytics Learning Time
Storage Migration
Thêm:
Pre-condition
Post-condition
Test checklist chi tiết hơn
Rollback plan rõ ràng hơn
Definition of Done cho từng commit