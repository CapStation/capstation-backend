// src/services/mail.service.js
const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
} else {
  console.warn('SMTP not configured — emails will be printed to console.');
}

async function sendMail(opts) {
  if (!transporter) {
    console.log('MAIL (console):', opts);
    return;
  }
  return transporter.sendMail(opts);
}

exports.sendVerificationEmail = async (to, name, verifyUrl) => {
  const subject = 'CapStation — Verify your email';
  const html = `<p>Hi ${name || ''},</p><p>Click to verify: <a href="${verifyUrl}">${verifyUrl}</a></p>`;
  await sendMail({ from: '"CapStation" <noreply@capstation.local>', to, subject, html });
};

exports.sendResetPasswordEmail = async (to, name, resetUrl) => {
  const subject = 'CapStation — Reset your password';
  const html = `<p>Hi ${name || ''},</p><p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`;
  await sendMail({ from: '"CapStation" <noreply@capstation.local>', to, subject, html });
};
