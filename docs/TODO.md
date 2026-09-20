Context Panel (Bảng Bối Cảnh Lịch Sử)
Do các màn hình tiếp theo làm mất đi bối cảnh của bước trước đó, học sinh khó theo dõi được những gì mình đã sửa. Giải pháp là thiết kế một Context Panel nằm bên phải để luôn giữ bối cảnh nội dung gốc và nội dung đã sửa.

User Review Required
IMPORTANT

Kế hoạch này sẽ thay đổi lớn về mặt bố cục màn hình cho các layout thực hành (challenge, editor_lab, boss). Màn hình sẽ chuyển từ dạng trung tâm (centered) sang dạng chia hai cột (split-screen) nếu kích thước màn hình đủ lớn, hoặc xếp chồng (stacked) trên mobile.

Proposed Changes
js/components/layouts/EditorLab.js
[MODIFY] Cập nhật cấu trúc HTML để bọc phần thực hành hiện hành vào khung bên trái (.workspace-col).
[MODIFY] Bổ sung .context-col (cột bên phải) cố định.
[MODIFY] Khi một step trong guided_practice được hoàn thành, text kết quả (câu đã sửa) sẽ được đẩy (append) vào .context-col với một chút hiệu ứng highlight để học sinh thấy sự thay đổi.
js/components/challenge.js (Layout Challenge)
[MODIFY] Bố cục lại thành hai cột. Cột bên phải hiển thị "Đoạn văn gốc" (Original Source).
[MODIFY] Học sinh chỉnh sửa ở cột trái và luôn có thể đối chiếu nội dung gốc ở cột phải.
js/components/layouts/EditorBoss.js
[MODIFY] Cập nhật layout Final Boss.
[MODIFY] Ở stage detect và repair, đoạn văn gốc hoặc các thay đổi từ bước trước sẽ được ghim ở cột bên cạnh để giúp học sinh giữ bối cảnh khi chuyển từ "Tìm lỗi" sang "Sửa đoạn văn".
Verification Plan
Khởi chạy thử lesson 06-dien-dat-hay và click qua các bước guidedPractice.
Kiểm tra phần Side Panel có hiển thị đúng câu gốc và được cập nhật câu trả lời khi click qua các Step không.
Kiểm tra tính tương thích trên màn hình nhỏ (CSS @media fallback).
