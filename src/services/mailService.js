// src/services/mail.service.js
const nodemailer = require("nodemailer");

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
} else {
  console.warn("SMTP not configured — emails will be printed to console.");
}

async function sendMail(opts) {
  if (!transporter) {
    console.log("MAIL (console):", opts);
    return;
  }
  return transporter.sendMail(opts);
}

exports.sendVerificationEmail = async (to, name, verifyUrl) => {
  const subject = "CapStation — Verify your email";
  const html = `<p>Hi ${
    name || ""
  },</p><p>Click to verify: <a href="${verifyUrl}">${verifyUrl}</a></p>`;
  await sendMail({
    from: '"CapStation" <noreply@capstation.local>',
    to,
    subject,
    html,
  });
};

exports.sendResetPasswordEmail = async (to, name, resetUrl) => {
  const subject = "Password Reset Request from CapStation";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Did you initiate a password reset on CapStation? If you didn't initiate this request you can ignore this email.</p>
      <p>Click the following link to reset your password:</p>
      <p style="margin: 20px 0;">
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
      </p>
      <p style="color: #666; font-size: 14px;">If the link is not clickable, try copying and pasting it into your browser:</p>
      <p style="color: #666; font-size: 14px; word-break: break-all;">${resetUrl}</p>
    </div>
  `;
  await sendMail({
    from: '"CapStation" <noreply@capstation.local>',
    to,
    subject,
    html,
  });
};

exports.sendPasswordChangeConfirmation = async (to, name) => {
  const subject = "Password Change Confirmation for CapStation";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Change Confirmation</h2>
      <p>Your password for CapStation has been changed.</p>
      <p>If you didn't request a password change you can reset your password here:</p>
      <p style="margin: 20px 0;">
        <a href="http://localhost:3000/forgot-password" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
      </p>
      <p style="color: #666; font-size: 14px;">If the link is not clickable, try copying and pasting it into your browser:</p>
      <p style="color: #666; font-size: 14px;">http://localhost:3000/forgot-password</p>
    </div>
  `;
  await sendMail({
    from: '"CapStation" <noreply@capstation.local>',
    to,
    subject,
    html,
  });
};
