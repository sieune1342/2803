# Import user tu file Excel va gui mat khau qua Mailtrap

## 1) Cai thu vien
```bash
npm install
```

## 2) Tao file `.env`
Copy tu `.env.example` va dien thong tin SMTP Mailtrap:
```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_FROM=no-reply@example.com
MAIL_SECURE=false
```

## 3) Chay project
```bash
npm start
```

## 4) API import
- Method: `POST`
- URL: `http://localhost:3000/api/v1/users/import`
- Body: `form-data`
- Key: `file` (chon file `user.xlsx`)

## 5) Du lieu import
- Lay `username` va `email` tu file Excel
- `role` mac dinh: `user`
- `password`: sinh ngau nhien 16 ky tu
- Gui password den email nguoi dung bang Mailtrap
- Tu dong tao cart cho user moi

## 6) Ket qua tra ve
API tra ve danh sach tung user da import, gom:
- `success`: tao user va gui mail thanh cong
- `mail_failed`: tao user thanh cong nhung gui mail loi
- `skipped`: username/email da ton tai
- `failed`: loi khi tao user

## 7) Git de nop
```bash
git add .
git commit -m "feat: import users from excel and send password email"
git remote add origin <link-github-cua-ban>
git push -u origin main
```

## 8) Anh Mailtrap
Sau khi import thanh cong:
1. Mo Mailtrap Inbox
2. Chup man hinh email vua nhan duoc
3. Nop kem link git
