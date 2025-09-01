import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase-admin';

// Create reusable transporter using environment variables
const createTransporter = () => {
  // Use SendGrid if available
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }
  
  // Fallback to Gmail SMTP
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  
  // Use Resend if configured
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY
      }
    });
  }
  
  console.warn('⚠️ No email service configured. Email notifications will not be sent.');
  return null;
};

// Email template for usage reset
const getUsageResetEmailTemplate = (plan: string, auditLimit: number) => {
  const planLabels: Record<string, string> = {
    basic: 'Basic',
    pro: 'Pro',
    team: 'Team',
    free: 'Free'
  };
  
  const planName = planLabels[plan] || 'Basic';
  
  return {
    subject: `✨ Your ${planName} plan just refreshed (${auditLimit} audits available!)`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Usage Reset</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700;">✨ Audits Refreshed!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your Reality Auditor usage has been reset</p>
            </div>
            
            <!-- Content -->
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
              <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #1f2937;">Hi there!</h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; line-height: 1.6;">
                Great news! Your Reality Auditor usage has been reset for the new billing cycle. You're all set to keep scanning articles and auditing reality.
              </p>
              
              <!-- Plan Details -->
              <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Plan:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1f2937;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Monthly Audits:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1f2937;">${auditLimit}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Status:</td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 100px; font-size: 14px; font-weight: 500;">Active</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Start Auditing 🚀
                </a>
              </div>
              
              <!-- Footer -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #9ca3af; font-size: 14px; text-align: center;">
                  You're receiving this because you have an active Reality Auditor subscription.
                </p>
                <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 14px; text-align: center;">
                  © ${new Date().getFullYear()} Reality Auditor • Powered by MetalMindTech
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
  };
};

// Send usage reset email
export async function sendUsageResetEmail(userId: string, plan: string, auditLimit: number) {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log('📧 Email service not configured, skipping notification');
      return;
    }
    
    // Get user email from profiles or subscriptions collection
    const profileDoc = await db.collection('profiles').doc(userId).get();
    let userEmail = profileDoc.data()?.email;
    
    if (!userEmail) {
      const subDoc = await db.collection('subscriptions').doc(userId).get();
      userEmail = subDoc.data()?.customerEmail;
    }
    
    if (!userEmail) {
      console.error(`❌ No email found for user ${userId}`);
      return;
    }
    
    // Skip email for free plans to avoid spam
    if (plan === 'free') {
      console.log('📧 Skipping email for free plan reset');
      return;
    }
    
    const { subject, html } = getUsageResetEmailTemplate(plan, auditLimit);
    
    await transporter.sendMail({
      from: `"Reality Auditor" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@realityauditor.com'}>`,
      to: userEmail,
      subject,
      html
    });
    
    console.log(`✅ Usage reset email sent to ${userEmail} for ${plan} plan`);
  } catch (error) {
    console.error('❌ Failed to send usage reset email:', error);
    // Don't throw - email failure shouldn't break the webhook
  }
}

// Send welcome email for new signups
export async function sendWelcomeEmail(email: string) {
  try {
    const transporter = createTransporter();
    if (!transporter) return;
    
    await transporter.sendMail({
      from: `"Reality Auditor" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@realityauditor.com'}>`,
      to: email,
      subject: '🎉 Welcome to Reality Auditor!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🎉 Welcome to Reality Auditor!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">X-ray vision for media bias</p>
              </div>
              
              <!-- Content -->
              <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #1f2937;">You're all set!</h2>
                
                <p style="margin: 0 0 20px 0; color: #4b5563; line-height: 1.6;">
                  Thanks for joining Reality Auditor! You now have access to powerful AI-driven tools to analyze media bias, detect manipulation, and uncover the truth in any article.
                </p>
                
                <!-- What's included -->
                <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1f2937;">Your Free Plan includes:</h3>
                  <ul style="margin: 0; padding: 0 0 0 20px; color: #4b5563; line-height: 1.8;">
                    <li>5 article audits per month</li>
                    <li>Real-time bias detection</li>
                    <li>Manipulation tactics analysis</li>
                    <li>Fact checking with citations</li>
                    <li>Truth score calculation</li>
                  </ul>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                    Audit Your First Article
                  </a>
                </div>
                
                <!-- Tips -->
                <div style="background: #eff6ff; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                  <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #1e40af;">💡 Pro tip</h3>
                  <p style="margin: 0; color: #3730a3; font-size: 14px; line-height: 1.6;">
                    Start by pasting an article URL or text content, and watch as Reality Auditor reveals bias patterns, missing angles, and manipulation tactics in seconds!
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #9ca3af; font-size: 14px; text-align: center;">
                    Questions? Reply to this email and we'll help you out!
                  </p>
                  <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 14px; text-align: center;">
                    © ${new Date().getFullYear()} Reality Auditor • Powered by MetalMindTech
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `
    });
    
    console.log(`✅ Welcome email sent to ${email}`);
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
  }
}
