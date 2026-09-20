# EVIDENCE BANK GUIDE

## Quy chuẩn xây dựng kho dẫn chứng nghị luận xã hội

> Phiên bản: 1.0.0
> Phạm vi: Kho dẫn chứng NLXH dành cho học sinh ôn thi vào lớp 10 TP.HCM
> Mục tiêu: Xây dựng kho dẫn chứng có thể tìm kiếm, tái sử dụng, phân tích theo nhiều vấn đề và tích hợp với hệ thống học tập cá nhân hóa.

---

# 1. Mục đích của kho dẫn chứng

Kho dẫn chứng không phải là danh sách những câu chuyện để học sinh học thuộc.

Kho dẫn chứng là một **cơ sở dữ liệu học tập**, giúp hệ thống:

```text
Đề bài
   ↓
Xác định vấn đề
   ↓
Tìm dẫn chứng phù hợp
   ↓
Chọn dẫn chứng
   ↓
Xác định hành động / sự kiện cốt lõi
   ↓
Phân tích ý nghĩa
   ↓
Đưa dẫn chứng vào luận điểm
```

Mục tiêu cuối cùng:

> Học sinh không chỉ nhớ "ai đã làm gì", mà biết **dẫn chứng đó chứng minh điều gì**.

---

# 2. Nguyên tắc quan trọng nhất

## 2.1. Không xây kho theo kiểu "mỗi vấn đề một danh sách tên"

Không nên:

```text
Nghị lực:
- Nguyễn Ngọc Ký
- Nick Vujicic
- Helen Keller

Nhân ái:
- ...
```

vì một dẫn chứng có thể sử dụng cho nhiều vấn đề.

Nên xây theo mô hình:

```text
Dẫn chứng
   ↓
Sự kiện cốt lõi
   ↓
Từ khóa
   ↓
Các vấn đề có thể sử dụng
   ↓
Góc phân tích tương ứng
```

---

# 3. Một dẫn chứng phải trả lời được 5 câu hỏi

Mỗi dẫn chứng cần xác định:

### 1. Ai / sự việc gì?

Nhân vật hoặc sự kiện.

### 2. Đã xảy ra chuyện gì?

Chỉ ghi sự kiện quan trọng nhất.

### 3. Hành động hoặc biểu hiện nổi bật là gì?

Đây là phần quan trọng nhất để phục vụ nghị luận.

### 4. Có thể dùng cho vấn đề nào?

Ví dụ:

```text
nghị lực
kiên trì
vượt khó
tự học
trách nhiệm
nhân ái
```

### 5. Dẫn chứng chứng minh điều gì?

Đây là phần `analysis`.

---

# 4. Cấu trúc thư mục

Kho dẫn chứng nên tách khỏi dữ liệu bài học.

```text
data/
├── lessons/
│   └── dan-chung-nlxh/
│       ├── lesson01.json
│       └── lesson02.json
│
└── evidence/
    ├── index.json
    ├── nghi-luc.json
    ├── nhan-ai.json
    ├── kien-tri.json
    ├── hoc-tap.json
    ├── trach-nhiem.json
    ├── uoc-mo.json
    └── vuot-kho.json
```

### Phân biệt:

```text
lessons/
```

Dùng để **dạy học sinh**.

```text
evidence/
```

Dùng để **lưu dữ liệu dẫn chứng**.

---

# 5. Schema cơ bản của một dẫn chứng

Mỗi dẫn chứng tối thiểu có:

```json
{
  "id": "nguyen-ngoc-ky",

  "name": "Nguyễn Ngọc Ký",

  "keywords": [
    "nghị lực",
    "kiên trì",
    "tự học",
    "vượt khó"
  ],

  "coreFact": "Bị liệt hai tay nhưng kiên trì tập viết bằng chân và tiếp tục học tập.",

  "usableFor": [
    "nghi-luc",
    "kien-tri",
    "tu-hoc",
    "vuot-kho"
  ],

  "analysis": {
    "nghi-luc": "Cho thấy con người có thể vượt qua giới hạn của hoàn cảnh.",
    "kien-tri": "Cho thấy thành quả cần quá trình bền bỉ.",
    "tu-hoc": "Cho thấy khả năng chủ động tìm cách học phù hợp với hoàn cảnh.",
    "vuot-kho": "Cho thấy khó khăn không quyết định hoàn toàn khả năng vươn lên của con người."
  },

  "source": "Nguồn kiểm chứng",

  "verified": true
}
```

---

# 6. Quy tắc cho từng trường dữ liệu

## 6.1. `id`

ID phải:

* duy nhất
* viết thường
* không dấu
* dùng dấu `-`
* ổn định trong suốt vòng đời dữ liệu

Ví dụ:

```text
nguyen-ngoc-ky
nick-vujicic
helen-keller
```

Không nên:

```text
Nguyễn Ngọc Ký
nguyen_ngoc_ky_01
danchung1
```

---

# 7. Trường `name`

Tên hiển thị chính thức của nhân vật hoặc sự kiện.

Ví dụ:

```json
"name": "Nguyễn Ngọc Ký"
```

Không đưa thông tin phân tích vào `name`.

---

# 8. Trường `keywords`

`keywords` chứa các từ khóa giúp hệ thống:

* tìm kiếm
* phân loại
* gợi ý
* liên kết dẫn chứng với vấn đề

Ví dụ:

```json
"keywords": [
  "nghị lực",
  "kiên trì",
  "vượt khó",
  "tự học"
]
```

Không nên đưa quá nhiều từ khóa.

### Khuyến nghị:

Mỗi dẫn chứng:

```text
3–6 keywords
```

Từ khóa phải thực sự có thể khai thác trong bài viết.

---

# 9. Trường `coreFact`

`coreFact` là **sự kiện cốt lõi**.

Mục tiêu:

> Học sinh đọc trong 1–2 câu là nhớ được dẫn chứng.

Ví dụ:

```json
"coreFact": "Bị liệt hai tay nhưng kiên trì tập viết bằng chân và tiếp tục học tập."
```

Không viết thành tiểu sử dài.

Không đưa các thông tin không phục vụ vấn đề nghị luận.

### Không nên:

```text
Nguyễn Ngọc Ký sinh năm..., quê ở..., từng học tại..., sau đó...
```

Nếu thông tin đó không cần thiết để chứng minh luận điểm thì bỏ.

---

# 10. Trường `usableFor`

`usableFor` xác định các vấn đề mà dẫn chứng có thể sử dụng.

Ví dụ:

```json
"usableFor": [
  "nghi-luc",
  "kien-tri",
  "tu-hoc",
  "vuot-kho"
]
```

Một dẫn chứng có thể thuộc nhiều nhóm.

Đây là điểm quan trọng của hệ thống.

Không nên ép:

```text
1 dẫn chứng = 1 vấn đề
```

Mà phải cho phép:

```text
1 dẫn chứng
    ↓
nhiều vấn đề
```

---

# 11. Trường `analysis`

Đây là trường quan trọng nhất.

`analysis` không trả lời:

> "Nhân vật đã làm gì?"

Mà trả lời:

> **"Dẫn chứng này chứng minh điều gì đối với vấn đề đang nghị luận?"**

Ví dụ:

```json
"analysis": {
  "nghi-luc": "Cho thấy con người có thể vượt qua giới hạn của hoàn cảnh.",

  "kien-tri": "Cho thấy thành quả cần quá trình bền bỉ.",

  "tu-hoc": "Cho thấy khả năng chủ động tìm cách học phù hợp với hoàn cảnh."
}
```

---

# 12. Một dẫn chứng có thể có nhiều góc phân tích

Ví dụ:

```text
Nguyễn Ngọc Ký
```

### Nếu đề hỏi NGHỊ LỰC:

```text
Hoàn cảnh khó khăn
→ không đầu hàng
→ tìm cách vượt qua
→ thể hiện nghị lực.
```

### Nếu đề hỏi KIÊN TRÌ:

```text
Khó khăn
→ luyện tập trong thời gian dài
→ không bỏ cuộc
→ thể hiện sự kiên trì.
```

### Nếu đề hỏi TỰ HỌC:

```text
Không thuận lợi về thể chất
→ chủ động tìm phương pháp học phù hợp
→ tiếp tục học tập
→ thể hiện tinh thần tự học.
```

Vì vậy:

> Không chỉ lưu "dẫn chứng dùng cho vấn đề nào", mà phải lưu **cách phân tích dẫn chứng trong từng vấn đề**.

---

# 13. Trường `source`

Mọi dẫn chứng có tính thực tế cần có nguồn kiểm chứng.

Ví dụ:

```json
"source": "https://..."
```

Hoặc nếu hệ thống chưa lưu URL:

```json
"source": {
  "title": "Tên tài liệu",
  "publisher": "Tên cơ quan / tổ chức",
  "url": "https://..."
}
```

Ưu tiên:

1. Cơ quan nhà nước
2. Tổ chức chính thức
3. Trường đại học / tổ chức giáo dục
4. Tổ chức quốc tế
5. Báo chí uy tín
6. Các nguồn khác chỉ khi cần thiết

Không đưa một thông tin chưa kiểm chứng vào kho chính thức.

---

# 14. Trường `verified`

Dùng để xác định trạng thái kiểm chứng.

```json
"verified": true
```

Nếu chưa kiểm chứng:

```json
"verified": false
```

### Quy tắc

Chỉ những dẫn chứng:

```text
verified = true
```

mới được phép xuất hiện trong:

* bài học chính thức
* bài luyện tập chính thức
* đề thi
* gợi ý cho học sinh

Dẫn chứng chưa kiểm chứng có thể nằm trong kho nháp.

---

# 15. Có thể mở rộng schema

Sau khi hệ thống ổn định, có thể thêm:

```json
{
  "id": "nguyen-ngoc-ky",

  "name": "Nguyễn Ngọc Ký",

  "type": "person",

  "keywords": [],

  "coreFact": "",

  "usableFor": [],

  "analysis": {},

  "source": {},

  "verified": true,

  "difficulty": "easy",

  "ageRange": "grade6-9",

  "summaryForStudent": "",

  "commonMistake": "",

  "relatedEvidence": []
}
```

Không cần triển khai tất cả ngay từ đầu.

---

# 16. Phân loại `type`

Có thể dùng:

```text
person
event
organization
community
scientific_example
historical_event
literary_example
```

Ví dụ:

```json
"type": "person"
```

hoặc:

```json
"type": "event"
```

Mục tiêu là để hệ thống phân biệt:

```text
Nhân vật
Sự kiện
Tổ chức
Hiện tượng
```

---

# 17. Quy tắc độ dài

Kho dẫn chứng dành cho học sinh THCS nên ưu tiên ngắn gọn.

### `coreFact`

Khoảng:

```text
1–2 câu
```

### `analysis`

Khoảng:

```text
1 câu
```

### `keywords`

Khoảng:

```text
3–6 từ khóa
```

### Phần kể chuyện dài

Không đặt trong database chính.

Nếu cần thông tin mở rộng, có thể thêm:

```json
"extendedFact": ""
```

nhưng chỉ sử dụng khi học sinh cần tìm hiểu thêm.

---

# 18. Công thức xây dựng một dẫn chứng

Mỗi dẫn chứng nên được xây theo:

```text
HOÀN CẢNH
    ↓
HÀNH ĐỘNG
    ↓
PHẨM CHẤT
    ↓
Ý NGHĨA
```

Ví dụ:

```text
Hoàn cảnh:
Gặp khó khăn về thể chất.

        ↓

Hành động:
Kiên trì tìm cách học và tập viết bằng chân.

        ↓

Phẩm chất:
Nghị lực, kiên trì.

        ↓

Ý nghĩa:
Khó khăn không quyết định hoàn toàn giới hạn của con người.
```

Đây là cấu trúc cốt lõi để học sinh biến dẫn chứng thành lập luận.

---

# 19. Không biến dẫn chứng thành kể chuyện

Kho dẫn chứng phải phục vụ:

```text
LUẬN ĐIỂM
   ↓
DẪN CHỨNG
   ↓
PHÂN TÍCH
   ↓
KẾT LUẬN
```

Không khuyến khích:

```text
Kể rất dài về nhân vật
        ↓
Không liên hệ với luận điểm
```

Học sinh cần học:

> Dẫn chứng không tự chứng minh cho luận điểm. Người viết phải phân tích để chỉ ra mối liên hệ.

---

# 20. Golden Question

Mỗi dẫn chứng phải có khả năng trả lời câu hỏi:

> **"Dẫn chứng này cho em hiểu gì về vấn đề đang nghị luận?"**

Nếu không trả lời được câu hỏi này thì:

```text
Không nên đưa dẫn chứng vào kho chính thức.
```

---

# 21. Một dẫn chứng tốt phải đạt 6 tiêu chí

Trước khi đưa vào kho chính thức, kiểm tra:

```text
□ Thông tin chính xác
□ Có nguồn kiểm chứng
□ Sự kiện cốt lõi rõ ràng
□ Liên quan trực tiếp đến vấn đề
□ Có thể phân tích
□ Học sinh THCS có thể hiểu và sử dụng
```

Có thể mở rộng thành checklist:

```text
□ Không quá dài
□ Không phụ thuộc vào chi tiết khó nhớ
□ Không mang tính quảng cáo
□ Không gây tranh cãi không cần thiết
□ Có thể dùng trong nhiều dạng đề
```

---

# 22. Quy trình thêm một dẫn chứng mới

Không thêm trực tiếp vào file.

Thực hiện theo quy trình:

```text
Bước 1
Tìm dẫn chứng

        ↓

Bước 2
Kiểm chứng nguồn

        ↓

Bước 3
Xác định sự kiện cốt lõi

        ↓

Bước 4
Xác định keywords

        ↓

Bước 5
Xác định usableFor

        ↓

Bước 6
Viết analysis cho từng vấn đề

        ↓

Bước 7
Kiểm tra độ chính xác

        ↓

Bước 8
Đánh dấu verified

        ↓

Bước 9
Đưa vào evidence/*.json

        ↓

Bước 10
Kiểm tra JSON

        ↓

Bước 11
Test tìm kiếm / gợi ý
```

---

# 23. Quy tắc không trùng lặp

Không tạo hai record cho cùng một dẫn chứng chỉ vì khác vấn đề.

Không nên:

```text
nguyen-ngoc-ky-nghi-luc
nguyen-ngoc-ky-kien-tri
nguyen-ngoc-ky-tu-hoc
```

Nên:

```text
nguyen-ngoc-ky
```

và:

```json
"usableFor": [
  "nghi-luc",
  "kien-tri",
  "tu-hoc"
]
```

---

# 24. `index.json`

`index.json` dùng để hệ thống nhanh chóng biết kho có những nhóm dẫn chứng nào.

Ví dụ:

```json
{
  "version": "1.0.0",

  "categories": [
    {
      "id": "nghi-luc",
      "name": "Nghị lực",
      "file": "nghi-luc.json"
    },
    {
      "id": "nhan-ai",
      "name": "Nhân ái",
      "file": "nhan-ai.json"
    },
    {
      "id": "kien-tri",
      "name": "Kiên trì",
      "file": "kien-tri.json"
    },
    {
      "id": "hoc-tap",
      "name": "Học tập",
      "file": "hoc-tap.json"
    },
    {
      "id": "trach-nhiem",
      "name": "Trách nhiệm",
      "file": "trach-nhiem.json"
    },
    {
      "id": "uoc-mo",
      "name": "Ước mơ",
      "file": "uoc-mo.json"
    }
  ]
}
```

---

# 25. Một dẫn chứng không nhất thiết chỉ nằm trong một file

Nếu sử dụng cấu trúc:

```text
evidence/
├── nghi-luc.json
├── kien-tri.json
└── tu-hoc.json
```

có hai cách.

### Cách A — lưu bản sao

Không khuyến khích.

Vì:

```text
nguyen-ngoc-ky
```

sẽ bị lặp lại nhiều lần.

### Cách B — một nguồn dữ liệu duy nhất

Khuyến khích:

```text
evidence/
├── index.json
└── all.json
```

Trong đó mỗi dẫn chứng chỉ xuất hiện một lần.

Các category chỉ lưu ID:

```json
{
  "nghi-luc": [
    "nguyen-ngoc-ky",
    "nick-vujicic"
  ],

  "kien-tri": [
    "nguyen-ngoc-ky"
  ]
}
```

Cách này phù hợp hơn nếu kho sau này lớn.

---

# 26. Kiến trúc được khuyến nghị khi kho lớn

Khi kho có khoảng:

```text
100+
```

dẫn chứng, nên chuyển sang:

```text
data/
└── evidence/
    ├── index.json
    ├── persons.json
    ├── events.json
    └── organizations.json
```

hoặc:

```text
data/
└── evidence/
    ├── index.json
    └── records/
        ├── nguyen-ngoc-ky.json
        ├── nick-vujicic.json
        └── ...
```

Không cần làm ngay.

---

# 27. Quan hệ giữa bài học và kho dữ liệu

Không đưa toàn bộ dữ liệu dẫn chứng vào `lesson02.json`.

Bài học:

```text
lesson02-kho-dan-chung-ly-tuong.json
```

chỉ dạy:

```text
Dẫn chứng là gì?
→ chọn dẫn chứng
→ nhớ bằng từ khóa
→ phân tích
→ dùng một dẫn chứng cho nhiều vấn đề
```

Kho dữ liệu:

```text
data/evidence/
```

lưu:

```text
Nguyễn Ngọc Ký
Nick Vujicic
Helen Keller
...
```

Như vậy:

```text
LESSON
Dạy cách sử dụng
        ↓
EVIDENCE BANK
Cung cấp dữ liệu
```

Hai phần không nên trộn lẫn.

---

# 28. Tích hợp với hệ thống học tập cá nhân hóa

Sau này hệ thống có thể thực hiện:

```text
Đề bài
   ↓
skillId = nlxh-nghi-luan
   ↓
issue = nghi-luc
   ↓
evidenceBank.search("nghi-luc")
   ↓
Danh sách dẫn chứng
   ↓
Học sinh chọn
   ↓
Hệ thống hỏi:
"Dẫn chứng này cho em hiểu gì?"
   ↓
Học sinh phân tích
   ↓
Hệ thống đánh giá
```

Điều này cho phép kho dẫn chứng trở thành một phần của hệ thống cá nhân hóa chứ không chỉ là một thư viện nội dung.

---

# 29. Sau này có thể xây "Evidence Engine"

Khi hệ thống phát triển, có thể có:

```text
evidenceEngine.js
```

nhiệm vụ:

```text
searchEvidence(issue)
getEvidence(id)
getEvidenceByKeyword(keyword)
getAnalysis(evidenceId, issue)
getRelatedEvidence(evidenceId)
```

Ví dụ:

```text
searchEvidence("nghi-luc")
```

trả về:

```text
Nguyễn Ngọc Ký
Nick Vujicic
Helen Keller
...
```

Còn:

```text
getAnalysis("nguyen-ngoc-ky", "kien-tri")
```

trả về góc phân tích tương ứng.

---

# 30. Quy tắc cho AI khi tạo dữ liệu

Nếu sử dụng AI để xây kho, AI phải tuân thủ:

### Không được:

* tự bịa sự kiện
* tự bịa số liệu
* tự bịa thành tích
* dùng nguồn không rõ ràng như nguồn chính thức
* biến suy đoán thành sự thật
* viết câu chuyện dài không cần thiết
* sao chép một dẫn chứng thành nhiều record

### Phải:

```text
1. Xác định sự kiện
2. Kiểm chứng
3. Tóm tắt
4. Gắn vấn đề
5. Viết phân tích
6. Ghi nguồn
7. Đánh dấu trạng thái kiểm chứng
```

---

# 31. Phân biệt FACT và ANALYSIS

Đây là nguyên tắc bắt buộc.

## FACT

Là điều đã xảy ra.

Ví dụ:

```text
"Bị liệt hai tay nhưng tập viết bằng chân."
```

## ANALYSIS

Là cách người viết giải thích ý nghĩa của FACT.

Ví dụ:

```text
"Cho thấy con người có thể vượt qua giới hạn của hoàn cảnh."
```

Không được trộn hai phần thành một câu khiến hệ thống không biết đâu là sự kiện, đâu là nhận xét.

---

# 32. Mục tiêu cuối cùng

Kho dẫn chứng tốt không phải là:

```text
500 cái tên
```

mà là:

```text
500 dẫn chứng
×
nhiều vấn đề
×
nhiều góc phân tích
```

Hệ thống cần giúp học sinh chuyển từ:

```text
"Em nhớ Nguyễn Ngọc Ký."
```

sang:

```text
"Em biết Nguyễn Ngọc Ký có thể dùng cho vấn đề nghị lực,
kiên trì, vượt khó, tự học;
và em biết vì sao dẫn chứng ấy chứng minh được từng vấn đề."
```

Đó mới là mục tiêu của Evidence Bank.

---

# 33. Checklist trước khi commit

Trước khi commit một thay đổi kho dẫn chứng:

```text
□ JSON hợp lệ
□ ID duy nhất
□ Không trùng dẫn chứng
□ Name chính xác
□ CoreFact ngắn và đúng
□ Keywords phù hợp
□ usableFor hợp lý
□ Mỗi vấn đề có analysis tương ứng
□ FACT và ANALYSIS không bị trộn
□ Có source
□ Đã kiểm chứng
□ Không có thông tin chưa xác thực
□ Phù hợp học sinh lớp 6–9 / TS10
□ Không kể chuyện quá dài
```

---

# 34. Nguyên tắc vàng

> **Một dẫn chứng không có giá trị chỉ vì nó nổi tiếng.**

Một dẫn chứng tốt phải:

```text
ĐÚNG
+
LIÊN QUAN
+
NGẮN GỌN
+
PHÂN TÍCH ĐƯỢC
+
DỄ NHỚ
+
TÁI SỬ DỤNG ĐƯỢC
```

Và quan trọng nhất:

> **Học sinh phải biết dẫn chứng đó chứng minh điều gì.**

---

# 35. Phiên bản tối thiểu để bắt đầu

Ở giai đoạn đầu, chỉ cần:

```json
{
  "id": "",
  "name": "",
  "keywords": [],
  "coreFact": "",
  "usableFor": [],
  "analysis": {},
  "source": "",
  "verified": false
}
```

Không cần xây hệ thống phức tạp ngay.

Khi kho lớn dần, mới mở rộng schema và xây `evidenceEngine.js`.
