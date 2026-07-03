const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
  const isEmailConfigured = !!(
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
  );

  if (!isEmailConfigured) {
    console.log('\n==================================================');
    console.log(`[EMAIL SIMULATOR] (SMTP details not configured in .env)`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text:    ${text}`);
    console.log('==================================================\n');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Yogyata" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`[Email] Sent successfully to ${to}`);
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${to}:`, error);
  }
};

module.exports = sendEmail;
