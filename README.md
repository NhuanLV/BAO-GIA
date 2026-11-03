# Báo giá dự thầu WED-01 – Bến hàng nặng

Trang web báo giá gói thầu WED-01 (bến hàng nặng, NMNĐ An Khánh – Bắc Giang 650MW) của Công ty TNHH B&T.

## Cấu trúc

```
index.html          trang báo giá (tab Tổng hợp, Bảng 1–6, Vật tư – nhân lực – máy, quy trình 3D)
assets/three.min.js thư viện Three.js r128 (đồ họa 3D)
assets/h3d.js       mô hình công trường 3D
assets/data.js      số liệu báo giá và các bước thi công
ho-so/              file Excel báo giá V2 và PDF biện pháp đê quây
.nojekyll           để GitHub Pages phục vụ nguyên trạng
```

## Đưa lên GitHub Pages

1. Tạo repository mới, tải toàn bộ nội dung thư mục này lên (giữ nguyên cấu trúc).
2. Vào **Settings → Pages**, chọn **Deploy from a branch**, nhánh `main`, thư mục `/ (root)`, bấm **Save**.
3. Sau 1–2 phút trang có địa chỉ `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

Không cần cài đặt hay build. Mở thử trên máy: mở `index.html` bằng trình duyệt.

## Lưu ý

Repository công khai thì ai có link đều xem được, kể cả thư mục `ho-so/`. Nên đặt repository ở chế độ **Private** nếu không muốn công khai đơn giá.
