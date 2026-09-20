const fs = require('fs');
const filePath = '/Users/doducqunynhtram/Documents/projects/prjvan/data/lessons/viet-doan-van/06-viet-cac-kieu-doan-van.json';
const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));

json.steps[0] = {
    id: "story",
    type: "story",
    data: {
        title: "Cùng nói về mẹ, nhưng sao viết khác nhau?",
        subtitle: "Một nội dung có thể được tổ chức theo nhiều mục đích.",
        ui: {
            layout: "four_cards",
            question: "Cùng nói về mẹ. Nhưng người viết đang làm những việc khác nhau. Em nhận ra không?",
            buttonText: "Tìm hiểu →"
        },
        cards: [
            { label: "A · KỂ", text: "Sáng hôm ấy, mẹ đánh thức em dậy rồi chuẩn bị bữa sáng. Sau đó, mẹ đưa em đến trường." },
            { label: "B · TẢ", text: "Mẹ có mái tóc đen dài và nụ cười rất dịu dàng. Đôi bàn tay mẹ luôn thoăn thoắt làm việc." },
            { label: "C · CẢM XÚC", text: "Em luôn cảm thấy ấm áp mỗi khi nghĩ về mẹ. Với em, mẹ là người em yêu thương nhất." },
            { label: "D · SUY NGHĨ", text: "Tình yêu thương của mẹ có ý nghĩa rất lớn đối với mỗi người. Nó giúp chúng ta có thêm động lực để trưởng thành." }
        ]
    }
};

fs.writeFileSync(filePath, JSON.stringify(json, null, 4));
console.log("Updated JSON");
