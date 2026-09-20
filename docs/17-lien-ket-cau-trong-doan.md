I. SUPPORT FOR CREATING MORE COMPONENTS
Lesson này đúng là lesson đầu tiên cần một UI primitive mới: “Sentence Relationship / Connection”.

Ta sẽ nhìn Lesson  như thế này

Không phải mỗi step một UI riêng:

Story
   ↓
Observe
   ↓
Discover
   ↓
Teach
   ↓
Guided
   ↓
Mini
   ↓
Reflection
   ↓
Cheat Sheet
   ↓hay
Final

Mà có một trục UI chung xuyên suốt lesson:

        CÂU 1
          │
       🔗 LẶP
          │
        CÂU 2
          │
       ➡️ NỐI
          │
        CÂU 3
          │
       🔄 THẾ
          │
        CÂU 4

Chỉ cần xây tốt cái này thì rất nhiều step dùng lại được.

1. Component quan trọng nhất: sentenceLink

Tôi nghĩ đây là component cần tạo thật tốt.

Nó biểu diễn:

Câu A
  │
  │ 🔗 phép thế
  ↓
Câu B

Hoặc horizontal:

[Câu A] ───── 🔁 LẶP ─────> [Câu B]

Nó có thể có các trạng thái:

default
active
correct
weak
broken

Và các loại:

repetition
substitution
connective
association
2. Từ component đó, rất nhiều UI tự nhiên xuất hiện
Observe
Minh thích đọc sách.
        │
        ?
        │
Bạn đọc mỗi tối.

Học sinh click vào đường ?.

Discover
Minh thích cây xanh
        │
        │ ?
        ↓
Những loài cây ấy...

Học sinh chọn:

🔁 Lặp
🔄 Thế
➡️ Nối
🌱 Liên tưởng
Teach

Connection Map:

CÂU 1
 │
 ├── 🔁 LẶP
 │
 ├── 🔄 THẾ
 │
 ├── ➡️ NỐI
 │
 └── 🌱 LIÊN TƯỞNG
 │
CÂU 2

Vẫn là sentenceLink, chỉ khác cách render.

Guided Practice
Câu 1
 │
 🔗 ?
 │
Câu 2

Học sinh sửa → đường nối thay đổi:

Câu 1
 │
 🔄 THẾ ✓
 │
Câu 2
Mini Challenge

Cho cả đoạn:

Câu 1 ──?── Câu 2 ──?── Câu 3 ──?── Câu 4

Học sinh sửa.

Sau khi sửa:

Câu 1 ──🔁── Câu 2 ──➡️── Câu 3 ──🔄── Câu 4
          ✓              ✓              △
Final Challenge

Thì nâng cấp thành:

Câu 1
 │
 🔁 ✓
 │
Câu 2
 │
 ➡️ ✓
 │
Câu 3
 │
 ⚠️ ?
 │
Câu 4

Đây chính là Link Map mà mình nói lúc nãy.

3. Vì vậy architecture ta sẽ không làm 10 component

Ta sẽ làm khoảng:

components/
│
├── sentence.js
├── sentenceLink.js        ← ⭐ quan trọng nhất
├── connectionMap.js       ← container dùng sentenceLink
│
├── observe.js (đã có/ nên tận dụng mở rộng nếu cần)
├── identify.js (đã có/ nên tận dụng mở rộng nếu cần)
├── explain.js (đã có/ nên tận dụng mở rộng nếu cần)
├── fillBlank.js (đã có/ nên tận dụng mở rộng nếu cần)
├── reflection.js (đã có/ nên tận dụng mở rộng nếu cần)
├── feedback.js 
│
└── index.js (đã có, cần chỉnh sửa/ mở rộng nếu cần)

Trong đó:

sentence.js

Chịu trách nhiệm:

① Minh rất thích đọc sách.
sentenceLink.js

Chịu trách nhiệm:

      🔄 PHÉP THẾ
          ↓
connectionMap.js

Chịu trách nhiệm ghép:

Sentence
   +
SentenceLink
   +
Sentence
   +
SentenceLink
   +
Sentence
4. Quan trọng: sentenceLink phải là component generic

Đừng đặt tên:

lienKetCau.js

vì sau này ta sẽ muốn dùng nó cho nhiều lesson.

Nên là:

sentenceLink.js

Ví dụ API conceptual:

{
  "from": "s1",
  "to": "s2",
  "type": "substitution",
  "status": "correct"
}

UI tự biết:

substitution → 🔄
repetition   → 🔁
connective   → ➡️
association  → 🌱
5. Và JSON Lesson 06 cũng sẽ rất đẹp

Thay vì mỗi step tự định nghĩa UI, JSON chỉ mô tả relationship.

Ví dụ:

{
  "sentences": [
    {
      "id": "s1",
      "text": "Mai rất thích đọc sách."
    },
    {
      "id": "s2",
      "text": "Những cuốn sách ấy giúp Mai mở rộng hiểu biết."
    }
  ],
  "links": [
    {
      "from": "s1",
      "to": "s2",
      "type": "substitution"
    }
  ]
}

Renderer sẽ tự tạo:

Mai rất thích đọc sách.
          │
       🔄 THẾ
          │
Những cuốn sách ấy...
⭐ Đây mới là điểm tôi thấy rất hay của Lesson này

Các lesson trước chủ yếu là:

Card → Question → Answer

Lesson này bắt đầu xuất hiện một UI concept mới:

Sentence → Relationship → Sentence

Nên đúng là Lesson này sẽ cần thêm một ít UI infrastructure.

Nhưng một khi ta xây xong:

sentence
sentenceLink
connectionMap

thì 3 component này có thể phục vụ gần như toàn bộ Lesson này ( và cả những lesson sau), từ Story → Observe → Discover → Teach → Guided → Mini → Final.

Và đặc biệt, đừng vẽ line bằng tay trong từng step. Hãy làm sentenceLink thành một component có thể render dọc / ngang / active / broken / correct / interactive. Như vậy sau này ta chỉ cần đổi JSON, UI tự sinh ra.

Nếu làm theo hướng này thì Lesson này không phải một lesson làm UI rất tốn công, mà là một lesson giúp mình xây thêm một reusable UI system rất đáng giá cho cả platform.



II. UI GUIDE FOR AI

STEP 01: story

🎨 UI đề xuất
┌──────────────────────────────────────────┐
│                                          │
│        🔗 MỘT ĐOẠN VĂN CÓ GÌ ĐÓ...       │
│                                          │
│   “Em rất thích đọc sách.”               │
│                                          │
│   “Lan thường đọc sách mỗi tối.”         │
│                                          │
│   “Vì vậy, Minh có rất nhiều kiến thức.” │
│                                          │
│   “Quyển sách giúp em hiểu thêm          │
│    về cuộc sống.”                        │
│                                          │
└──────────────────────────────────────────┘

              🤔
       Em thấy thế nào?

   ○ Bình thường
   ○ Hơi rời rạc
   ○ Có câu chưa nối với nhau
   ○ Không biết vì sao

1. Đừng highlight ngay

Ban đầu 4 câu giống nhau hoàn toàn.

Khi học sinh rê chuột/chạm vào một câu:

        CÂU 1
          │
          │  ?
          │
        CÂU 2

Hoặc đẹp hơn là một đường connector mờ:

Câu 1  ─────────────  Câu 2
             ?

Click vào ? thì hiện:

“Câu 1 và câu 2 có thật sự nối với nhau không?”

Nhưng chưa nói phép lặp / thế / nối.

2. Sau khi học sinh trả lời → “Broken Effect”

Nếu chọn:

“Một số câu chưa nối được với nhau”

thì UI chuyển nhẹ:

Em rất thích đọc sách.
        │
        ╳
        │
Lan thường đọc sách mỗi tối.

        │
        ╳
        │
Vì vậy, Minh có rất nhiều kiến thức.

Không cần animation quá mạnh. Chỉ cần cảm giác đường truyền bị đứt.

Sau đó hiện:

Các câu đều đúng. Nhưng đoạn văn vẫn chưa ổn.

Rồi:

Vì một đoạn văn không chỉ cần những câu đúng.

🔗 Các câu còn phải liên kết với nhau.

3. Reveal cuối Story

Đây là chỗ tôi nghĩ nên làm thật đẹp:

       CÂU 1
         │
         ╳
         │
       CÂU 2

         ↓

   “Có một sợi chỉ đỏ
      nối các câu lại.”
         
         🔗
         
   Hôm nay em sẽ tìm
   xem sợi chỉ đó là gì.

Nút cuối:

🔎 TÌM HIỂU


STEP 02: observe

UI theo kiểu “Connection Lab — Phòng thí nghiệm liên kết”. Học sinh không chỉ đọc A/B mà có thể bật từng “đường nối” giữa các câu.

🎨 UI đề xuất
┌─────────────────────────────────────────────┐
│          🔗 CONNECTION LAB                  │
│                                             │
│  Hãy tìm xem điều gì đang nối các câu lại. │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 🅰 ĐOẠN A                             │  │
│  │                                       │  │
│  │ Minh rất thích đọc sách.              │  │
│  │                                       │  │
│  │ Lan thường đọc sách mỗi tối.          │  │
│  │                                       │  │
│  │ Vì vậy, Minh hiểu thêm nhiều điều.    │  │
│  │                                       │  │
│  │ Những cuốn sách rất bổ ích.           │  │
│  └───────────────────────────────────────┘  │
│                                             │
│              ⇅  SO SÁNH                     │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 🅱 ĐOẠN B                             │  │
│  │                                       │  │
│  │ Minh rất thích đọc sách.              │  │
│  │                                       │  │
│  │ Bạn thường đọc sách mỗi tối.          │  │
│  │                                       │  │
│  │ Nhờ vậy, Minh hiểu thêm nhiều điều.   │  │
│  │                                       │  │
│  │ Những cuốn sách ấy còn giúp Minh      │  │
│  │ mở rộng vốn từ.                       │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

Nhưng đừng cho hai đoạn cùng lúc quá nhiều hiệu ứng. Ban đầu chỉ cho học sinh đọc.

① Cho học sinh “soi” đoạn B

Bên dưới có một thanh nhỏ:

🔍 SOI CÁC ĐƯỜNG NỐI

[ Tìm từ nối
]   [ Tìm từ thay thế
]   [ Tìm quan hệ ý
]

Hoặc nếu muốn đúng tinh thần Discover, thậm chí không ghi tên như vậy.

Chỉ để:

🔎 KHÁM PHÁ

Chạm vào một từ/cụm từ em thấy
đang “nối” với câu khác.

Học sinh click:

Bạn

UI phản ứng:

Minh
  │
  │  “Bạn”
  ↓
Bạn

Highlight:

Minh → Bạn

Và hiện một tooltip rất ngắn:

“Bạn” đang nhắc đến ai?

Học sinh:

Minh.

🔥 Lúc này em tự phát hiện quan hệ thay thế mà chưa cần nghe thuật ngữ “phép thế”.

② Click Nhờ vậy

Đây mới là interaction rất hay.

Đọc sách mỗi tối
        ↓
    Nhờ vậy
        ↓
Hiểu thêm nhiều điều

UI có thể vẽ một causal connector: [Đọc sách mỗi tối
]
          │
          ↓
      [Nhờ vậy
]
          │
          ↓
[Hiểu thêm nhiều điều
]

Tooltip:

“Nhờ vậy” cho người đọc biết quan hệ gì?

Cho 3 lựa chọn:

○ Nguyên nhân – kết quả
○ So sánh
○ Liệt kê

→ Học sinh chọn Nguyên nhân – kết quả.

Nhưng chưa cần nói “phép nối”.

③ Cho học sinh phát hiện ấy

Click:

“Những cuốn sách ấy”

UI:

Những cuốn sách
       ↓
      ấy
       ↓
Những cuốn sách đã nói ở câu trước

Câu hỏi nhỏ:

“Ấy” đang giúp câu này nối với thông tin nào trước đó?

→ Học sinh bắt đầu nhận ra một câu có thể dựa vào câu trước để tiếp tục ý.

④ Sau đó mới cho A ↔ B

Đây là phần quan trọng nhất.

Cho nút:

        🅰 A          🅱 B
      RỜI RẠC      LIỀN MẠCH

Học sinh chuyển qua lại.

Khi chọn B:

Minh ───────→ Bạn
 │
 │
 └──────────→ Nhờ vậy ─────→ Hiểu thêm
                         │
                         ↓
                  Những cuốn sách ấy

Còn A thì các connector hiện:

Minh      ─── ? ───> Lan

Lan       ─── ? ───> Vì vậy

Vì vậy    ─── ? ───> Những cuốn sách

Không cần dùng dấu X đỏ.

Chỉ cần:

?

để tạo cảm giác:

“Ủa, chỗ này thiếu cái gì?”

⑤ Câu hỏi cuối Observe

Đừng hỏi:

“Phép liên kết nào được sử dụng?”

Quá sớm.

Hỏi:

“Điều gì khiến đoạn B có cảm giác liền mạch hơn?”

Cho học sinh chọn nhiều:

☐ Có từ/cụm từ nối các câu
☐ Có từ thay thế cho thông tin trước
☐ Các câu cùng hướng về một ý
☐ Các ý có quan hệ với nhau
☐ Vì đoạn B dài hơn

Sau khi trả lời, mới chuyển sang Discover.

STEP 03: discover

🔎 UI tổng thể: “GIẢI MÃ ĐƯỜNG NỐI”

Màn hình không nên hiện 4 thuật ngữ ngay từ đầu.

┌──────────────────────────────────────────────┐
│             🔎 GIẢI MÃ ĐƯỜNG NỐI             │
│                                              │
│  Hai câu đang được nối với nhau bằng cách nào?│
│                                              │
│  Lan rất yêu cây xanh.                       │
│            │                                 │
│            ↓                                 │
│           [ ?
]                              │
│            ↓                                 │
│  Những loài cây ấy làm sân trường            │
│  trở nên mát mẻ.                             │
│                                              │
│  ○ Lặp lại từ                                │
│  ○ Thay thế                                  │
│  ○ Dùng từ nối                               │
│  ○ Không có liên kết                         │
└──────────────────────────────────────────────┘
Điểm quan trọng

Chỉ hiển thị 1 interaction tại một thời điểm.

Không nên ném cả 3–4 ví dụ lên màn hình cùng lúc. Học sinh làm xong một “ca” → đường nối được mở khóa → sang ca tiếp theo.

🧩 Interaction 1 — “Ai đang được nhắc lại?”

Ví dụ:

Lan rất yêu cây xanh.
Những loài cây ấy làm sân trường trở nên mát mẻ.

UI:

Lan rất yêu cây xanh.
        │
        │
       [?
]
        │
        ↓
Những loài cây ấy

Học sinh kéo hoặc click đáp án:

┌──────────────┐
│ 🔁 Lặp lại   │
└──────────────┘

┌──────────────┐
│ 🔄 Thay thế  │
└──────────────┘

┌──────────────┐
│ ➡️ Dùng nối  │
└──────────────┘

Chọn Thay thế.

Sau đó animation:

Lan rất yêu cây xanh.
          ↘
           ↘
       Những loài cây ấy

Highlight:

cây xanh → ấy

Và chỉ hiện:

🔄 Câu sau dùng một cách khác để nhắc lại thông tin ở câu trước.

Chưa reveal “phép thế” ngay.

🧩 Interaction 2 — “Từ nào đang chỉ quan hệ?”
Nam chăm chỉ đọc sách.

        ↓

      VÌ VẬY

        ↓

Vốn hiểu biết của bạn
ngày càng rộng.

Học sinh click Vì vậy.

UI hỏi:

“Cụm từ này đang làm nhiệm vụ gì?”

○ Nối hai ý
○ Thay thế một từ
○ Lặp lại một từ
○ Không có tác dụng liên kết

→ Nối hai ý

Sau đó animation:

Nam chăm chỉ đọc sách
          │
          ↓
        VÌ VẬY
          │
          ↓
Vốn hiểu biết ngày càng rộng

Reveal nhỏ:

➡️ Một từ/cụm từ có thể giúp người đọc nhận ra quan hệ giữa các câu.

🧩 Interaction 3 — “Không giống nhau nhưng vẫn liên quan”

Đây là interaction hay nhất vì nó giúp học sinh phát hiện liên tưởng.

Mẹ rất yêu hoa.

        │
        ↓
      [ ? ]
        │
        ↓

Những bông hồng trước sân
luôn được mẹ chăm sóc cẩn thận.

Học sinh phải tìm:

Mẹ → hoa → bông hồng

Không có từ nào được lặp lại nguyên xi, cũng không có từ nối như “vì vậy”.

UI có thể vẽ:

Mẹ
 │
 │ yêu
 ↓
hoa
 │
 │ thuộc nhóm
 ↓
bông hồng

Câu hỏi:

“Hai câu liên quan với nhau nhờ điều gì?”

○ Một từ được lặp lại
○ Một từ thay thế
○ Một từ nối
○ Những từ ngữ có liên quan về nghĩa

→ Những từ ngữ có liên quan về nghĩa

Đây chính là khoảnh khắc học sinh tự phát hiện phép liên tưởng.

🔥 Sau 3 interaction → Reveal

Lúc này mới cho cả 4 “cơ chế” xuất hiện.

              🔗 CÁC ĐƯỜNG NỐI

        🔁 LẶP
          │
          ├── lặp lại từ ngữ
          │
        🔄 THẾ
          │
          ├── dùng từ ngữ khác để thay thế
          │
        ➡️ NỐI
          │
          ├── dùng từ/cụm từ thể hiện quan hệ
          │
        🌱 LIÊN TƯỞNG
              │
              └── dùng các từ ngữ có liên quan

Nhưng ta không biến phần này thành bảng định nghĩa.

Chỉ cần một câu:

“Em vừa phát hiện ra: các câu có thể được nối với nhau bằng nhiều cách khác nhau.”

⭐ Câu chốt của Discover

“Điều quan trọng không phải là nhớ tên. Hãy nhìn xem câu sau đang dựa vào câu trước bằng cách nào.”

Và UI có thể biến nó thành một rule card:

┌───────────────────────────────────────┐
│ 🧠 QUY TẮC CỦA THÁM TỬ LIÊN KẾT       │
│                                       │
│ Đừng hỏi trước:                       │
│ “Đây là phép gì?”                     │
│                                       │
│ Hãy hỏi:                              │
│                                       │
│ “Câu sau đang dựa vào câu trước       │
│  bằng cách nào?”                      │
└───────────────────────────────────────┘

STEP 04: teach

Ta sẽ biến nó thành Connection Lab / Connection Map có cảm giác như một bộ công cụ.

🔗 1. Màn hình chính: CONNECTION MAP

Ban đầu chỉ hiện:

┌────────────────────────────────────────────────┐
│                                                │
│              🔗 LIÊN KẾT CÂU                   │
│                                                │
│       “Làm thế nào để câu này                  │
│        nối được với câu kia?”                  │
│                                                │
│                    🔗                          │
│                    │                           │
│       ┌────────────┼────────────┐              │
│       ↓            ↓            ↓              │
│     🔁 LẶP       🔄 THẾ       ➡️ NỐI           │
│                                  │             │
│                                  ↓             │
│                            🌱 LIÊN TƯỞNG       │
│                                                │
└────────────────────────────────────────────────┘

Nhưng 4 node không phải button kiểu menu bình thường.

Mỗi node là một tool card.

Khi hover:

🔁
LẶP
“Giữ lại từ ngữ quan trọng”
🔄
THẾ
“Dùng cách gọi khác”
➡️
NỐI
“Cho người đọc biết quan hệ”
🌱
LIÊN TƯỞNG
“Nối bằng những từ có liên quan”
② Click vào LẶP

Node mở rộng ngay tại chỗ.

┌──────────────────────────────────────────────┐
│ 🔁 PHÉP LẶP                                  │
│                                              │
│ Mai rất thích đọc sách.                      │
│ Những cuốn sách ấy giúp Mai mở rộng          │
│ hiểu biết.                                   │
│                                              │
│     sách  ─────────→  sách                   │
│                                              │
│ 💡 Cơ chế                                    │
│ Lặp lại từ ngữ đã xuất hiện để tạo sự        │
│ liên kết giữa các câu.                       │
│                                              │
│             [ Thử ngay →
]                  │
└──────────────────────────────────────────────┘
Nhưng tôi muốn thêm một animation nhỏ

Click “Thử ngay”:

Mai rất thích đọc sách.

        ↓

Những cuốn _____ ấy giúp Mai
mở rộng hiểu biết.

Học sinh chọn:

○ cuốn sách
○ điều đó
○ vì vậy

→ cuốn sách

🔥 Như vậy Teach không chỉ nói cơ chế, mà ngay lập tức cho học sinh thử cơ chế.

③ Click THẾ
┌──────────────────────────────────────────────┐
│ 🔄 PHÉP THẾ                                  │
│                                              │
│ Mai có một chú mèo.                          │
│ Nó thường nằm bên cửa sổ.                    │
│                                              │
│       một chú mèo                             │
│            ↓                                 │
│           Nó                                  │
│                                              │
│ 💡 Cơ chế                                    │
│ Dùng từ ngữ khác để thay thế cho từ ngữ      │
│ đã xuất hiện.                                │
│                                              │
│             [ Thử ngay →
]                  │
└──────────────────────────────────────────────┘

Challenge nhỏ:

Mai có một chú mèo. ___ thường nằm bên cửa sổ.

○ Nó
○ Vì vậy
○ Mèo

→ Nó

④ Click NỐI

Phần này hãy làm đẹp hơn, vì nó liên quan trực tiếp đến quan hệ logic.

Mai chăm chỉ đọc sách.

          ↓

       VÌ VẬY

          ↓

Vốn hiểu biết của bạn
ngày càng rộng.

Sau đó cho học sinh thay đổi từ nối:

Mai chăm chỉ đọc sách.

[ Vì vậy ▼
]

Vốn hiểu biết của bạn
ngày càng rộng.

Dropdown:

Vì vậy
Tuy nhiên
Hơn nữa
Bởi vì

Khi chọn:

Tuy nhiên

UI cảnh báo nhẹ:

⚠️ Quan hệ giữa hai ý chưa phù hợp.

Đây là một interaction cực đáng giá vì học sinh hiểu:

Không phải cứ có từ nối là liên kết tốt. Phải dùng từ nối phù hợp với quan hệ ý.

⑤ Click LIÊN TƯỞNG

Phần này nên có visual khác biệt.

🌱 PHÉP LIÊN TƯỞNG

Sân trường buổi sáng rất nhộn nhịp.

          ↓

Tiếng trống
Tiếng nói
Tiếng cười

          ↓

“Các từ này liên quan với nhau
về cùng một không gian / trường nghĩa.”

Có thể cho học sinh kéo:

Sân trường

vào giữa.

Rồi các từ:

🌳 cây
🏫 lớp học
🔔 tiếng trống
👧 học sinh
⚽ sân bóng

→ tạo thành một semantic web.

Đây sẽ là UI rất đẹp nếu ta làm animation:

             🔔
              \
🌳 ─────── 🏫 SÂN TRƯỜNG ───── 👧
              /
             ⚽

Học sinh trực tiếp nhìn thấy “trường từ vựng liên tưởng”.

⑥ Diagnostic Question — phần quan trọng nhất

Sau khi học sinh đã mở cả 4 tool, Connection Map thu lại.

Màn hình chuyển sang:

┌─────────────────────────────────────────────┐
│ 🧠 DIAGNOSTIC                               │
│                                             │
│ Câu sau đang nối với câu trước              │
│ bằng cách nào?                              │
│                                             │
│ Mai rất thích đọc sách.                     │
│ Những cuốn sách ấy giúp Mai mở rộng         │
│ hiểu biết.                                  │
│                                             │
│        🔍 HÃY TÌM ĐƯỜNG NỐI                 │
│                                             │
│ 🔁 Lặp     🔄 Thế     ➡️ Nối     🌱 Liên tưởng │
└─────────────────────────────────────────────┘

Học sinh chọn:

🔄 Thế

Sau đó:

       ✓ CHÍNH XÁC

“Những cuốn sách ấy”

       ↓

“ấy” thay thế / quy chiếu
về thông tin đã xuất hiện.

⭐ 7. Thêm một tầng nữa

Đừng kết thúc Diagnostic bằng:

“Đúng!”

Mà hỏi tiếp:

“Nếu bỏ đường nối này, điều gì xảy ra?”

Ví dụ:

Mai có một chú mèo.
Nó thường nằm bên cửa sổ.

→ click 🔄 THẾ

Sau đó toggle:

          🔗 Có liên kết

Mai có một chú mèo.
Nó thường nằm bên cửa sổ.


          VS


          ⛓️ Đứt liên kết

Mai có một chú mèo.
Nó thường nằm bên cửa sổ.

Nếu bỏ Nó và thay bằng một thông tin không liên quan, học sinh thấy ngay đoạn mất mạch.

Đây chính là chỗ Teach trở nên trải nghiệm, chứ không còn là “đọc định nghĩa”.

🧠 Skill Model của Lesson 06

Ta sẽ đặt một thanh nhỏ cố định ở góc UI:

┌──────────────────────────────┐
│ 🔗 CONNECTION SKILL          │
│                              │
│ Câu sau đang dựa vào câu    │
│ trước bằng cách nào?         │
└──────────────────────────────┘

Mỗi interaction đều quay về câu hỏi này.

Lặp → dựa vào từ ngữ đã xuất hiện.
Thế → dựa vào đối tượng đã được nhắc đến.
Nối → dựa vào quan hệ giữa các ý.
Liên tưởng → dựa vào các từ ngữ có quan hệ về nghĩa.

STEP 05: guided_practice

thiết kế nó như một Repair Lab chứ không phải 4 câu hỏi nối tiếp nhau.

🛠️ ❺ GUIDED PRACTICE — REPAIR THE PARAGRAPH
1. Màn hình mở đầu
┌──────────────────────────────────────────────┐
│ 🔧 REPAIR THE PARAGRAPH                     │
│                                              │
│ Đoạn văn này đang có vài “đường nối” bị đứt.│
│ Em hãy tìm và sửa chúng.                    │
│                                              │
│              📝 ĐOẠN VĂN                    │
│                                              │
│ ① Minh rất thích đọc sách.                  │
│                                              │
│ ② Lan thường đọc sách mỗi tối.        ⚠️   │
│                                              │
│ ③ Vì vậy, Minh hiểu thêm nhiều điều.  ⚠️   │
│                                              │
│ ④ Quyển sách giúp Minh mở rộng vốn từ. ⚠️  │
│                                              │
│         🔗 0 / 3 ĐƯỜNG NỐI ĐÃ SỬA          │
└──────────────────────────────────────────────┘

Thanh tiến độ này rất quan trọng: 0/3 → 1/3 → 2/3 → 3/3

Học sinh có cảm giác đang sửa một hệ thống, chứ không phải làm bài trắc nghiệm.

🔎 STEP 1 — TÌM CHỖ BỊ ĐỨT

Học sinh click câu ②.

UI zoom nhẹ:

① Minh rất thích đọc sách.

        ↓
        
② Lan thường đọc sách mỗi tối.
        ⚠️
        
        ↓

③ Vì vậy, Minh hiểu thêm nhiều điều.

Hỏi:

“Có điều gì chưa ổn ở đường nối này?”

Cho học sinh chọn:

○ Câu 2 không liên quan đến câu 1
○ Cách gọi đối tượng chưa nhất quán
○ Thiếu từ nối
○ Câu 2 quá dài

→ Cách gọi đối tượng chưa nhất quán

Đây là lúc học sinh bắt đầu chẩn đoán, không chỉ sửa theo đáp án.

🔧 STEP 2 — SỬA ĐƯỜNG NỐI

Sau khi xác định vấn đề:

Minh rất thích đọc sách.

_____ thường đọc sách mỗi tối.

Choices:

A. Lan
B. Bạn
C. Vì vậy
D. Quyển sách

→ Bạn

Animation:

Minh
  │
  ↓
Bạn

Sau đó hiện:

🔄 Đường nối đã được sửa!

Thanh tiến độ:

🔗 1 / 3
➡️ STEP 3 — SỬA QUAN HỆ Ý

Tiếp tục:

Minh đọc sách mỗi tối.

[ __________
]

Vốn hiểu biết của bạn
ngày càng rộng.

Choices:

Tuy nhiên
Vì vậy
Nhưng
Mặc dù

→ Vì vậy

Animation cực rõ:

Đọc sách
   │
   │ nguyên nhân
   ↓
Vì vậy
   │
   ↓
Hiểu biết ngày càng rộng

Và tooltip:

Quan hệ giữa hai ý: nguyên nhân → kết quả

Thanh:

🔗 2 / 3
🧩 STEP 4 — SỬA “QUYỂN SÁCH”

Câu cuối:

Quyển sách giúp Minh mở rộng vốn từ.

Hệ thống hỏi:

“Thông tin nào đang được nhắc lại?”

Học sinh kéo: [ đọc sách
]     [ Minh
]     [ một quyển sách
]

vào:

Quyển sách
     ↓
    [ ?]

Sau đó đề xuất:

A. Những cuốn sách ấy
B. Vì vậy
C. Bạn ấy

→ Những cuốn sách ấy

Animation:

Minh đọc sách
     │
     ↓
Những cuốn sách ấy
     │
     ↓
Mở rộng vốn từ

Thanh:

🔗 3 / 3
✨ STEP 5 — “REPAIR COMPLETE”

Đây là lúc  UI nên thưởng cho học sinh bằng một visual transformation.

Ban đầu:

Minh rất thích đọc sách.
        ? 
Lan thường đọc sách mỗi tối.
        ?
Vì vậy, Minh hiểu thêm nhiều điều.
        ?
Quyển sách giúp Minh mở rộng vốn từ.

Sau khi hoàn tất việc sửa,

Tất cả các câu cùng Các đường nối sáng lên, và đoạn văn trở thành một khối thống nhất.

🧠 Nhưng câu hỏi cuối mới là phần quan trọng

Không nên kết thúc bằng:

“Chúc mừng em!”

Mà hỏi:

“Bây giờ đoạn văn đã liền mạch hơn chưa? Vì sao?”

Cho học sinh tự trả lời:

○ Vì các câu đều ngắn hơn.
○ Vì các câu có những đường nối với nhau.
○ Vì đoạn văn có nhiều từ hơn.
○ Vì câu cuối hay hơn.

→ Vì các câu có những đường nối với nhau.

Sau đó hệ thống tổng kết:

🔎 EM VỪA SỬA ĐƯỢC:

🔄 Cách gọi thông tin
➡️ Quan hệ giữa các ý
🔄 Thông tin được nhắc lại

          ↓

       🔗 LIÊN KẾT


STEP 06: mini_challenge

Mini Challenge không nên biến thành một “Guided Practice trá hình”. Vì không còn từng bước, UI phải chuyển từ kiểu bài tập có hướng dẫn sang kiểu một workspace để học sinh tự sửa.

Hãy hình dung nó như một “Repair Studio”.

🛠️ ❻ MINI CHALLENGE — REPAIR STUDIO
1. Màn hình mở đầu

Không cần nhiều chữ.

┌──────────────────────────────────────────────┐
│                                              │
│           🛠️ CỨU ĐOẠN VĂN                  │
│                                              │
│  Đoạn văn này đang có vài “đường nối”        │
│  chưa thật rõ. Em có thể sửa nó không?       │
│                                              │
│  ──────────────────────────────────────────  │
│                                              │
│  🎯 NHIỆM VỤ                                 │
│                                              │
│  Hãy chỉnh sửa đoạn văn để các câu           │
│  liên kết với nhau tốt hơn.                  │
│                                              │
│             [ 🚀 BẮT ĐẦU SỬA
]              │
└──────────────────────────────────────────────┘

Không nói:

Hãy tìm phép lặp.

Không nói:

Hãy dùng phép nối.

Học sinh tự quyết định.

2. Workspace chính

Đây mới là UI quan trọng.

Ta sẽ chia màn hình thành 2 vùng:

┌────────────────────────────────────────────────────┐
│ 🛠️ REPAIR STUDIO                         0%       │
├────────────────────────────────────────────────────┤
│                                                    │
│  📝 ĐOẠN VĂN                                      │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ Mùa hè là mùa em yêu thích nhất.             │  │
│  │                                              │  │
│  │ Trời rất nóng.                               │  │
│  │                                              │  │
│  │ Em thường đi bơi.                            │  │
│  │                                              │  │
│  │ Bể bơi có nhiều người.                       │  │
│  │                                              │  │
│  │ Em cảm thấy rất vui.                         │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  🔧 CÔNG CỤ                                       │
│                                                    │
│  [✏️ Sửa câu
] [↕️ Đổi vị trí
] [＋ Thêm từ
]        │
│                                                    │
│                         [ 🚀 NỘP
]                 │
└────────────────────────────────────────────────────┘
Nhưng ta không cho hiện 4 công cụ liên kết

Không có:

🔁 Lặp
🔄 Thế
➡️ Nối
🌱 Liên tưởng

Vì như vậy là gợi ý đáp án.

Chỉ cho các thao tác chung:

✏️ sửa
➕ thêm
↕️ sắp xếp

Học sinh phải tự nghĩ sửa bằng cách nào.

3. Click vào một câu

Ví dụ học sinh click:

Bể bơi có nhiều người.

Câu được nâng lên:

┌──────────────────────────────────────┐
│ ④ Bể bơi có nhiều người.             │
│                                      │
│ ✏️ Chỉnh sửa                         │
│ ↕️ Di chuyển                         │
│ 🗑️ Xóa                               │
└──────────────────────────────────────┘

Nếu chọn Chỉnh sửa:

┌──────────────────────────────────────┐
│ ④                                      │
│                                      │
│ [Bể bơi có nhiều người.
]             │
│                                      │
│              [✓ Xong
]                │
└──────────────────────────────────────┘

Học sinh có thể tự sửa thành:

Ở bể bơi, có rất nhiều người.

hoặc:

Vì vậy, bể bơi có rất nhiều người.

Nhưng hệ thống không ép một đáp án duy nhất.

Đây là điểm rất quan trọng.

4. Tôi còn thích một interaction: “Kéo đường nối”

Thay vì chỉ edit text, ta có thể cho học sinh click giữa hai câu.

Ví dụ:

Mùa hè là mùa em yêu thích nhất.

            ⬇
         [ +
]

Trời rất nóng.

Click +:

        🔗 Thêm liên kết

[ vì vậy
] [ tuy nhiên
] [ hơn nữa
]
[ nhờ đó
] [ ngoài ra
] [ ...
]

Nhưng ta sẽ không hiện danh sách này ngay từ đầu.

Chỉ khi học sinh chủ động click vào + thì hệ thống mới cho phép thêm.

Như vậy UI vẫn là open-ended workspace, nhưng học sinh có công cụ để thao tác.

5. Sau khi sửa → đoạn văn thay đổi trực tiếp

Ví dụ học sinh sửa:

Trời rất nóng.
Vì vậy, em thường đi bơi.
Ở bể bơi, có rất nhiều người.
Em cảm thấy rất vui khi được vui chơi cùng mọi người.

UI không cần báo:

✓ Phép nối

✓ Phép thế

Ngay lúc đó.

Chỉ hiển thị:

┌──────────────────────────────────────────────┐
│                ✨ PREVIEW                   │
│                                              │
│ Mùa hè là mùa em yêu thích nhất.             │
│                                              │
│ Trời rất nóng.                               │
│        ↓                                     │
│ Vì vậy, em thường đi bơi.                    │
│        ↓                                     │
│ Ở bể bơi, có rất nhiều người.                │
│        ↓                                     │
│ Em cảm thấy rất vui khi được vui chơi        │
│ cùng mọi người.                              │
│                                              │
│        🔗 🔗 🔗 🔗                           │
└──────────────────────────────────────────────┘

Hệ thống có thể tự động vẽ đường nối màu nhạt để học sinh cảm nhận đoạn văn đã “liền” hơn.

6. Quan trọng: không nên chấm ngay từng thao tác

Mini Challenge khác Guided Practice ở chỗ:

Guided Practice
Sửa câu 2
   ↓
✓
   ↓
Sửa câu 3
   ↓
✓
Mini Challenge
        ĐOẠN VĂN
           ↓
     🛠️ TỰ SỬA
           ↓
       🚀 NỘP
           ↓
     🤖 PHÂN TÍCH

Không can thiệp giữa chừng.

Đây mới là lúc kiểm tra:

“Em có thực sự biết dùng skill không?”

7. AI Feedback nên rất trực quan

Sau khi Submit, workspace chuyển thành:

┌──────────────────────────────────────────────┐
│          🤖 AI — ĐÁNH GIÁ ĐOẠN VĂN          │
├──────────────────────────────────────────────┤
│                                              │
│ 🔗 ĐỘ LIÊN KẾT                               │
│                                              │
│ ████████████████░░░░  82%                    │
│                                              │
│ ✓ Chủ đề được duy trì xuyên suốt             │
│ ✓ Một số câu đã được nối rõ hơn              │
│ ✓ Có sự lặp lại từ ngữ phù hợp               │
│                                              │
│ ⚠️ CẦN CẢI THIỆN                             │
│                                              │
│ Câu 3 → Câu 4                                │
│ Quan hệ giữa “đi bơi” và “bể bơi”            │
│ vẫn chưa thật rõ.                             │
│                                              │
│ 💡 GỢI Ý                                     │
│ Hãy thử dùng một từ/cụm từ để làm rõ         │
│ mối quan hệ giữa hai ý.                       │
│                                              │
│              [ 🔧 SỬA LẠI
]                  │
└──────────────────────────────────────────────┘

Tôi rất thích việc AI không nói ngay đáp án.

Nó nói:

“Quan hệ chưa rõ.”

chứ không nói:

“Hãy thêm từ ‘ở’.”

→ học sinh vẫn phải tự sửa lần hai.

8. Có thể thêm “Before → After”

Cái này rất đáng làm.

          TRƯỚC                 SAU

   Câu → ? → Câu          Câu → 🔗 → Câu
          ?                       🔗
   Câu → ? → Câu          Câu → 🔗 → Câu

Hoặc:

🔴 BEFORE
Mùa hè...
Trời rất nóng.
Em thường đi bơi.
Bể bơi có nhiều người.
Em cảm thấy rất vui.


        ↓


🟢 AFTER
Mùa hè...
Trời rất nóng.
Vì vậy, em thường đi bơi.
Ở bể bơi, có rất nhiều người.
Em cảm thấy rất vui.

Học sinh nhìn thấy sản phẩm của chính mình tốt lên. Cái này có giá trị học tập hơn một dòng “8/10”.

STEP 07: reflection

sẽ làm UI kiểu “Debug Log” — rất hợp với tinh thần Repair Studio của Lesson 06.

🧠 ❼ REFLECTION — “DEBUG LOG”
1. Màn hình mở đầu

Đừng dùng card bài tập thông thường. Cho cảm giác:

┌──────────────────────────────────────────────┐
│                                              │
│              🧠 DEBUG LOG                   │
│                                              │
│       “Đoạn văn bị đứt ở đâu?”              │
│                                              │
│  Hôm nay em đã học cách tìm những            │
│  “đường nối” giữa các câu.                   │
│                                              │
└──────────────────────────────────────────────┘

Sau đó mới đưa câu hỏi.

2. Câu hỏi 1 — “Em nhận ra lỗi bằng gì?”
┌──────────────────────────────────────────────┐
│ 🔍 01                                       │
│                                              │
│ Khi đọc một đoạn văn, điều gì khiến em       │
│ cảm thấy các câu chưa liên kết?              │
│                                              │
│ ○ Câu sau không liên quan câu trước          │
│                                              │
│ ○ Từ ngữ bị lặp quá nhiều                    │
│                                              │
│ ○ Thiếu từ nối                               │
│                                              │
│ ○ Không biết câu sau đang nói về điều gì     │
└──────────────────────────────────────────────┘
Hãy cho phép chọn nhiều đáp án

Vì trong thực tế học sinh có thể nhận ra nhiều dấu hiệu cùng lúc.

UI:

☐ Câu sau không liên quan câu trước
☐ Từ ngữ bị lặp quá nhiều
☐ Thiếu từ nối
☐ Không biết câu sau đang nói về điều gì

Khi chọn:

✓  Câu sau không liên quan câu trước
✓  Không biết câu sau đang nói về điều gì

Không cần báo đúng/sai.

Thay vào đó:

💡 Đúng hướng. Em đang chú ý đến mối quan hệ giữa các câu, không chỉ từng câu riêng lẻ.

3. Câu hỏi 2 — Đây mới là phần “ăn tiền”

Màn hình chuyển sang một Debug Checklist:

┌──────────────────────────────────────────────┐
│ 🛠️ NẾU ĐOẠN VĂN CỦA EM BỊ RỜI RẠC...        │
│                                              │
│ Em sẽ kiểm tra điều gì trước?                │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Em sẽ kiểm tra...                        │ │
│ │                                          │ │
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│             [ ✓ LƯU SUY NGHĨ
]              │
└──────────────────────────────────────────────┘

Không cần AI chấm grammar.

Không cần điểm.

Không cần đúng/sai.

Học sinh có thể viết:

Em sẽ kiểm tra xem các câu có liên quan với nhau không.

Hoặc:

Em sẽ xem câu sau có nối được với câu trước không.

Hoặc:

Em sẽ kiểm tra xem có cần thêm từ nối hay thay từ không.

Tất cả đều là những câu trả lời tốt.

4. Sau khi Submit → biến thành “Debug Rule”


Ví dụ học sinh viết:

Em sẽ kiểm tra xem các câu có liên quan với nhau không.

UI chuyển thành:

╔══════════════════════════════════════════╗
║          🧠 DEBUG RULE CỦA EM           ║
╠══════════════════════════════════════════╣
║                                          ║
║ “Em sẽ kiểm tra xem các câu có liên      ║
║  quan với nhau không.”                   ║
║                                          ║
║                  ↓                       ║
║                                          ║
║ 🔗 KIỂM TRA ĐƯỜNG NỐI GIỮA CÁC CÂU      ║
║                                          ║
╚══════════════════════════════════════════╝

Nếu AI được dùng, chỉ nên làm nhiệm vụ tóm tắt suy nghĩ của học sinh, không phải chấm điểm.

5. Cuối cùng: “My Debug Checklist”

đây sẽ là phần kết cực đẹp.

┌──────────────────────────────────────────────┐
│ 🛠️ MY DEBUG CHECKLIST                       │
│                                              │
│ Khi đoạn văn nghe “kỳ kỳ”, em sẽ:            │
│                                              │
│ ① 🔗 Kiểm tra câu sau có liên quan           │
│    câu trước không.                          │
│                                              │
│ ② 🔍 Kiểm tra các từ ngữ đang được           │
│    nhắc lại / thay thế.                      │
│                                              │
│ ③ ➡️ Kiểm tra quan hệ giữa các ý.            │
│                                              │
│ ④ 🌱 Kiểm tra xem các câu có cùng            │
│    hướng về chủ đề không.                    │
│                                              │
│                  ✓ ĐÃ LƯU                    │
└──────────────────────────────────────────────┘

Nhưng đừng đưa checklist này trước khi học sinh trả lời.

Nó phải xuất hiện sau Reflection như một sự tổng kết.

STEP 08: cheat_sheet

Vì đây là Cheat Sheet: mục tiêu là để học sinh quay lại nhìn là nhớ ngay, không phải học thêm một bài nữa.

🧩 UI  đề xuất
┌──────────────────────────────────────────────┐
│                                              │
│        🔗 BỘ CÔNG CỤ NỐI CÂU                │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 🔁 LẶP                                │  │
│  │ Lặp lại từ ngữ quan trọng             │  │
│  │                              [Ví dụ →
] │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 🔄 THẾ                                │  │
│  │ Dùng từ khác thay thế                  │  │
│  │                              [Ví dụ →
] │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ ➡️ NỐI                                │  │
│  │ Dùng từ ngữ thể hiện quan hệ          │  │
│  │                              [Ví dụ →
] │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 🌱 LIÊN TƯỞNG                         │  │
│  │ Dùng các từ có quan hệ về nghĩa       │  │
│  │                              [Ví dụ →
] │  │
│  └────────────────────────────────────────┘  │
│                                              │
├──────────────────────────────────────────────┤
│ ⭐ CÂU SAU ĐANG DỰA VÀO                     │
│    CÂU TRƯỚC BẰNG CÁCH NÀO?                 │
│                                              │
│        [ 🛠️ THỬ KIỂM TRA
]                 │
│                                              │
├──────────────────────────────────────────────┤
│             🔖 Lưu      ⬇️ Tải               │
└──────────────────────────────────────────────┘
Tại sao không làm 4 màn hình?

Nếu tách:

Màn 1: Lặp → Next
Màn 2: Thế → Next
Màn 3: Nối → Next
Màn 4: Liên tưởng

thì nó lại biến Cheat Sheet thành Teach lần 2.

Trong khi Cheat Sheet phải có tính chất:

“À, quên phép thế rồi → mở card → nhìn 5 giây → nhớ lại.”

Nhưng nút [Ví dụ → ] nên mở ngay trên cùng màn hình

Ví dụ click 🔄 THẾ:

┌────────────────────────────────────────┐
│ 🔄 THẾ                                 │
│                                        │
│ Dùng từ khác thay thế                  │
│                                        │
│ Mai có một chú mèo.                    │
│      ↓                                 │
│ Nó thường nằm bên cửa sổ.              │
│                                        │
│ “Nó” thay thế cho “một chú mèo”.       │
│                                        │
│              [ Thu gọn ↑
]             │
└────────────────────────────────────────┘

Không chuyển trang.

Card mở rộng → xem → thu lại.

Như vậy học sinh vẫn giữ được bản đồ 4 công cụ trong đầu.

🛠️ Còn “Thử kiểm tra” thì anh rất thích

Nhưng ta sẽ cho nó mở thành một mini overlay/modal, không chuyển sang lesson mới.

Ví dụ:

┌────────────────────────────────────────────┐
│ 🛠️ THỬ KIỂM TRA                       ×   │
├────────────────────────────────────────────┤
│                                            │
│ Mai rất thích đọc sách.                    │
│ Những cuốn sách ấy giúp Mai mở rộng        │
│ hiểu biết.                                 │
│                                            │
│ Câu sau đang liên kết với câu trước        │
│ bằng cách nào?                             │
│                                            │
│ 🔁 Lặp    🔄 Thế    ➡️ Nối    🌱 Liên tưởng│
│                                            │
└────────────────────────────────────────────┘

Học sinh chọn → feedback → đóng modal → quay lại Connection Card.

⭐ Ta sẽ chia mức độ UI như này
Thành phần	                UI
4 phép liên kết	          4 card trên 1 màn hình
Ví dụ	                  Expand/collapse ngay trong card
Câu chốt	          Luôn hiển thị ở cuối
Thử kiểm tra	              Modal nhỏ
Lưu	                      Nút cố định cuối card
Tải	                      Nút cố định cuối card

Không cần nhiều màn hình.

Và có một điểm tôi rất muốn giữ: Cheat Sheet phải “scan được” trong 5–10 giây. Học sinh mở lại trước khi làm bài thì lập tức thấy:

🔁 Lặp — giữ từ
🔄 Thế — thay từ
➡️ Nối — thể hiện quan hệ
🌱 Liên tưởng — liên hệ về nghĩa

→ rồi câu hỏi lớn:

“Câu sau đang dựa vào câu trước bằng cách nào?”

Đó mới chính là mental model mà cả Lesson 06 đang cố xây cho học sinh.

STEP 09: final_challenge

Final Challenge của Lesson 06 nên là màn hình “nhiều UI nhất”, nhưng không làm nó thành nhiều màn hình rời nhau. Tốt nhất là một Boss Workspace có 4 phase, và UI biến đổi theo từng phase.

Điểm quan trọng: nhiều interaction, không phải nhiều trang.

🏆 FINAL BOSS — PARAGRAPH REPAIR LAB

 flow như này:

┌─────────────────────────────────────────────┐
│ 🏆 PARAGRAPH REPAIR BOSS        ① ② ③ ④   │
├─────────────────────────────────────────────┤
│                                             │
│             ĐOẠN VĂN                       │
│                                             │
│  🔍 DETECT                                  │
│       ↓                                     │
│  🛠️ REPAIR                                  │
│       ↓                                     │
│  🧠 EXPLAIN                                 │
│       ↓                                     │
│  🤖 AI ANALYSIS                             │
│                                             │
└─────────────────────────────────────────────┘

Thanh trên cùng cho học sinh biết mình đang ở đâu:

🔍 Detect → 🛠️ Repair → 🧠 Explain → 🤖 Analysis

① 🔍 DETECT — “Tìm chỗ bị đứt”


┌──────────────────────────────────────────────┐
│ 🏆 PARAGRAPH REPAIR BOSS                    │
│                                              │
│ 🔍 01 DETECT                                 │
│ Tìm những chỗ đoạn văn chưa liên kết tốt.   │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ ① Đọc sách mang lại nhiều lợi ích.      │ │
│ │                                          │ │
│ │ ② Lan đọc sách mỗi ngày.                │ │
│ │                                          │ │
│ │ ③ Vì vậy, những cuốn sách rất bổ ích.   │ │
│ │                                          │ │
│ │ ④ Minh cũng thích đọc sách.              │ │
│ │                                          │ │
│ │ ⑤ Những điều này làm em hiểu hơn        │ │
│ │   về cuộc sống.                          │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ Hãy click vào câu em cho rằng có vấn đề.    │
│                                              │
│              [ TIẾP TỤC →
]                 │
└──────────────────────────────────────────────┘

Khi click câu ③:

③ Vì vậy, những cuốn sách rất bổ ích.
             ⚠️

Có thể hiện một đường đỏ rất nhẹ giữa:

Câu 2 ──────?────── Câu 3

Nhưng không nói lỗi là gì.

Đây là Detect.

② 🛠️ REPAIR — “Sửa đoạn văn”

Sau khi Detect xong, workspace chuyển sang chế độ chỉnh sửa.

Ta sẽ không cho 5 câu nằm trong những ô input khổng lồ. Nhìn rất giống form.

Nên dùng kiểu sentence cards:

┌──────────────────────────────────────────────┐
│ 🛠️ 02 REPAIR                                │
│                                              │
│ Hãy sửa những chỗ em phát hiện.              │
│                                              │
│ ① ───────────────────────────────────────── │
│   Đọc sách mang lại nhiều lợi ích.           │
│                                              │
│ ② ───────────────────────────────────────── │
│   Lan đọc sách mỗi ngày.                     │
│                                              │
│ ③ ⚠️ ────────────────────────────────────── │
│   Vì vậy, những cuốn sách rất bổ ích.        │
│   [ ✏️ Sửa câu
]                             │
│                                              │
│ ④ ───────────────────────────────────────── │
│   Minh cũng thích đọc sách.                  │
│                                              │
│ ⑤ ⚠️ ────────────────────────────────────── │
│   Những điều này làm em hiểu hơn             │
│   về cuộc sống.                              │
│                                              │
│                  [ 🚀 HOÀN THÀNH
]           │
└──────────────────────────────────────────────┘

Click Sửa câu → inline editor.

Ví dụ:

┌──────────────────────────────────────────────┐
│ ③                                          │
│                                              │
│ [Vì vậy, những cuốn sách rất bổ ích.
]       │
│                                              │
│ ✏️ Sửa trực tiếp                             │
│                                              │
│              [✓ Xong
]                       │
└──────────────────────────────────────────────┘
Quan trọng:

Không hiện:

🔁 Lặp
🔄 Thế
➡️ Nối
🌱 Liên tưởng

vì đó là gợi ý quá mạnh.

Học sinh phải tự quyết định.

③ 🧠 EXPLAIN — “Em vừa dùng gì?”

Đây là một màn hình rất gọn.

┌──────────────────────────────────────────────┐
│ 🧠 03 EXPLAIN                               │
│                                              │
│ Em đã dùng những cách nào để liên kết       │
│ các câu?                                     │
│                                              │
│ ☑ 🔁 Phép lặp                                │
│ ☑ 🔄 Phép thế                                │
│ ☑ ➡️ Phép nối                                │
│ ☐ 🌱 Phép liên tưởng                         │
│                                              │
│        [ XÁC NHẬN
]                          │
└──────────────────────────────────────────────┘

Nhưng ta sẽ thêm một interaction nhỏ:

Sau khi chọn:

☑ 🔄 Phép thế

click vào nó → hệ thống hỏi:

“Em đã dùng phép thế ở đâu?”

Học sinh click vào câu tương ứng.

Như vậy ta kiểm tra được:

Không chỉ “biết tên” → mà biết “mình đã dùng nó ở đâu”.

④ 🤖 AI ANALYSIS — “Hồ sơ liên kết”

Đây mới là màn hình cuối và có thể đẹp nhất.

╔══════════════════════════════════════════════╗
║          🤖 HỒ SƠ LIÊN KẾT                  ║
╠══════════════════════════════════════════════╣
║                                              ║
║ 🔗 CÁC CÁCH EM ĐÃ SỬ DỤNG                  ║
║                                              ║
║ 🔁 Phép lặp          ████████░░   ✓          ║
║ 🔄 Phép thế          ██████░░░░   ✓          ║
║ ➡️ Phép nối          ████████░░   ✓          ║
║ 🌱 Liên tưởng         ██░░░░░░░░   △          ║
║                                              ║
├──────────────────────────────────────────────┤
║                                              ║
║ 📊 MỨC ĐỘ LIÊN KẾT                           ║
║                                              ║
║        ████████████████░░░░  82%             ║
║                                              ║
├──────────────────────────────────────────────┤
║                                              ║
║ ✓ Chủ đề được duy trì xuyên suốt             ║
║ ✓ Một số câu nối tốt                         ║
║ △ Một quan hệ giữa hai câu còn chưa rõ       ║
║                                              ║
├──────────────────────────────────────────────┤
║ 💡 GỢI Ý CỦA AI                              ║
║                                              ║
║ Hãy kiểm tra cụm “những điều này”.           ║
║                                              ║
║ Nó đang thay thế cho nội dung nào ở          ║
║ câu trước?                                   ║
║                                              ║
│              [ 🔧 SỬA LẠI
]                 │
╚══════════════════════════════════════════════╝
⭐ Nhưng tôi muốn thêm một thứ: “Link Map”

Đây mới là thứ làm Final Boss khác hẳn bài kiểm tra thông thường.

Sau AI Analysis, hiển thị đoạn văn dưới dạng:

Câu 1
  │
  │ 🔁
  ↓
Câu 2
  │
  │ ➡️
  ↓
Câu 3
  │
  │ ?
  ↓
Câu 4
  │
  │ 🔄
  ↓
Câu 5

Màu sắc:

🟢 đường nối tốt
🟡 đường nối chưa rõ
🔴 đường nối bị đứt

Học sinh nhìn thấy cấu trúc liên kết của chính đoạn văn mình vừa sửa.

Đây là một UI rất đáng giá vì Lesson 06 từ đầu đến cuối đều dùng metaphor:

“Các câu là những điểm. Liên kết là đường nối.”

🔥 Và ta sẽ không cho AI chấm kiểu “8.2/10” đơn thuần

AI nên trả lời theo 4 năng lực:

        🔗 LINK PROFILE

┌────────────────────────────┐
│ 🎯 Giữ chủ đề       ✓     │
│ 🔄 Duy trì đối tượng ✓    │
│ ➡️ Quan hệ ý        ✓     │
│ 🧩 Liên kết từ ngữ   △     │
└────────────────────────────┘

Sau đó:

Điểm mạnh nhất: Em biết dùng từ nối để thể hiện quan hệ giữa các ý.

Điểm cần cải thiện: Một số từ thay thế chưa có đối tượng rõ ràng.

Nhiệm vụ tiếp theo: Khi viết, hãy thử kiểm tra từng cặp câu liên tiếp.

Như vậy AI đang dạy học sinh cách tự kiểm tra, chứ không chỉ “cho điểm”.

Vậy có phải Final Challenge nhiều UI nhất không?

Có — nhưng nhiều interaction chứ không nhiều màn hình.

Ta sẽ quy hoạch như này:

Step	                        UI
Story	                    1 màn hình cinematic
Observe	                    1 màn hình so sánh
Discover	                    1 màn hình interaction
Teach	                    1 màn hình Connection Map
Guided Practice	          1 workspace + nhiều interaction
Mini Challenge	            1 Repair Studio
Reflection	                1 màn hình
Cheat Sheet	                1 Connection Card
Final Challenge	            1 Boss Workspace → 4 phase UI


