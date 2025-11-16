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
  const subject = "Confirm your account for CapStation";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to CapStation!</h1>
      </div>
      
      <div style="background-color: #f9fafb; padding: 40px 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi ${name || "there"},
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Thank you for registering with CapStation! We're excited to have you on board.
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          Click the following link to confirm and activate your account:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
            Confirm Account
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
          If the link is not clickable, try copying and pasting it into your browser:
        </p>
        <p style="color: #6b7280; font-size: 13px; word-break: break-all; background-color: #e5e7eb; padding: 12px; border-radius: 6px; font-family: monospace;">
          ${verifyUrl}
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #d1d5db;">
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
            This verification link will expire in 24 hours. If you didn't create an account with CapStation, you can safely ignore this email.
          </p>
        </div>
      </div>
    </div>
  `;
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
