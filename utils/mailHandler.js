require('dotenv').config();
const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT || 2525);
  const user = process.env.MAIL_USERNAME;
  const pass = process.env.MAIL_PASSWORD;
  const secure = String(process.env.MAIL_SECURE || 'false') === 'true';

  if (!host || !user || !pass) {
    throw new Error('Thiếu cấu hình gửi mail. Hãy thêm MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD vào file .env');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
}

async function sendNewUserPasswordEmail({ to, username, password }) {
  const transporter = createTransporter();
  const from = process.env.MAIL_FROM || 'no-reply@example.com';

  return transporter.sendMail({
    from,
    to,
    subject: 'Tai khoan moi cua ban',
    text: [
      'Xin chao,',
      '',
      `Tai khoan cua ban da duoc tao thanh cong.`,
      `Username: ${username}`,
      `Password tam thoi: ${password}`,
      '',
      'Vui long dang nhap va doi mat khau sau lan dang nhap dau tien.',
      '',
      'Trân trọng.'
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#222">
        <h2>Tài khoản mới của bạn</h2>
        <p>Xin chào,</p>
        <p>Tài khoản của bạn đã được tạo thành công.</p>
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Password tạm thời:</strong> ${password}</p>
        <p>Vui lòng đăng nhập và đổi mật khẩu sau lần đăng nhập đầu tiên.</p>
        <p>Trân trọng.</p>
      </div>
    `
  });
}

module.exports = {
  sendNewUserPasswordEmail
};
