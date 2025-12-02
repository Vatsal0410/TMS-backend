import nodemailer from "nodemailer";

// Create a Nodemailer transporter
export const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send welcome email
export const sendWelcomeEmail = async (
  email: string,
  tempPassword: string,
  name: string
): Promise<void> => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Welcome to Project Management Platform",
    html: `
      <!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Welcome to the Team</title>
</head>
<body style="background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; margin: 0; padding: 0; color: #374151;">
  <div style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
    <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); overflow: hidden;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); height: 6px;"></div>

      <div style="padding: 40px;">
        <span style="color: #4f46e5; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; display: block; margin-bottom: 32px;">TaskFlow</span>

        <h1 style="font-weight: 800; font-size: 24px; margin: 0 0 24px; color: #111827; text-align: center; letter-spacing: -0.025em;">Welcome to the team, ${name}.</h1>

        <p style="font-size: 16px; margin: 0 0 24px; color: #4b5563;">
          Your account is all set up and ready to go. We're excited to have
          you on board and can't wait to see what you'll accomplish.
        </p>

        <p style="font-size: 16px; margin: 0 0 24px; color: #4b5563;">
          Use the credentials below to sign in and start managing your
          projects.
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
          <div style="margin-bottom: 16px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; display: block; margin-bottom: 6px;">Email Address</span>
            <span style="font-family: 'Courier New', monospace; font-size: 15px; color: #1f2937; background: transparent; padding: 8px 12px; border-radius: 6px; border: none; padding-left: 0; font-weight: 600; display: inline-block; min-width: 200px;">${email}</span>
          </div>
          <div style="margin-bottom: 0;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; display: block; margin-bottom: 6px;">Temporary Password</span>
            <span style="font-family: 'Courier New', monospace; font-size: 15px; color: #1f2937; background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #e5e7eb; display: inline-block; min-width: 200px;">${tempPassword}</span>
          </div>
        </div>

        <a href="https://your-platform-url.com/login" style="display: block; background-color: #4f46e5; border-radius: 50px; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 40px; text-decoration: none; text-align: center; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4); margin-bottom: 32px;">Sign In to Your Account</a>

        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e; padding: 16px; border-radius: 0 4px 4px 0; font-size: 14px; margin-bottom: 32px;">
          <strong>Important:</strong> You'll be prompted to create a new
          password on your first login to keep your account secure.
        </div>

        <p style="margin-bottom: 12px; font-size: 16px; color: #4b5563;">Questions or need assistance?</p>
        <p style="font-size: 14px; margin-bottom: 0; color: #4b5563;">
          Our support team is here to help—just reply to this email.
        </p>
      </div>

      <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 24px; padding: 0 20px;">
        <p style="margin: 0 0 8px;">
          © 2025 TaskFlow Inc. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send password reset OTP
export const sendPasswordResetOTP = async (
  email: string,
  otp: string,
  name: string
): Promise<void> => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset OTP - Project Management Platform",
    html: `
      <!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Password Reset Request</title>
</head>
<body style="background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; margin: 0; padding: 0; color: #374151;">
  <div style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
    <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); overflow: hidden;">
      <div style="background: linear-gradient(135deg, #DC2626 0%, #EA580C 100%); height: 6px;"></div>
      
      <div style="padding: 40px;">
        <span style="color: #DC2626; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; display: block; margin-bottom: 32px;">Security Alert</span>
        
        <h1 style="font-weight: 800; font-size: 24px; margin: 0 0 24px; color: #111827; text-align: center; letter-spacing: -0.025em;">Password Reset Request</h1>
        
        <p style="font-size: 16px; margin: 0 0 24px; color: #4B5563;">Hello <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin: 0 0 24px; color: #4B5563;">We received a request to reset your password. Use the verification code below to proceed:</p>

        <div style="background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); border: 2px solid #DC2626; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #DC2626; margin-bottom: 12px;">Your Verification Code</div>
          <h2 style="font-family: 'Courier New', monospace; font-size: 28px; font-weight: 800; color: #DC2626; letter-spacing: 5px; margin: 0;">${otp}</h2>
        </div>

        <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; color: #92400E; padding: 16px; border-radius: 0 4px 4px 0; font-size: 14px; margin-bottom: 24px;">
          <strong>Time Sensitive:</strong> This code will expire in 10 minutes for your security.
        </div>

        <div style="background-color: #F0F9FF; border-left: 4px solid #0EA5E9; color: #075985; padding: 16px; border-radius: 0 4px 4px 0; font-size: 14px; margin-bottom: 32px;">
          <strong>Didn't request this?</strong> If you didn't initiate this password reset, please ignore this email. Your account remains secure.
        </div>

        <p style="font-size: 14px; margin-bottom: 0; color: #4B5563;">Stay secure,</p>
        <p style="font-size: 14px; margin-bottom: 0; color: #4B5563;"><strong>Project Management Team</strong></p>
      </div>
      
      <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 24px; padding: 0 20px;">
        <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px;">
          © 2025 TaskFlow Inc. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send task assignment email
export const sendTaskAssignmentEmail = async (
  email: string,
  taskTitle: string,
  assignerName: string,
  taskId: string,
  userName: string
): Promise<void> => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `New Task Assigned: ${taskTitle}`,
    html: `
      <!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Task Assigned</title>
</head>
<body style="background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; margin: 0; padding: 0; color: #374151;">
  <div style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
    <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); overflow: hidden;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); height: 6px;"></div>
      
      <div style="padding: 40px;">
        <span style="color: #059669; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; display: block; margin-bottom: 32px;">New Task</span>
        
        <h1 style="font-weight: 800; font-size: 24px; margin: 0 0 24px; color: #111827; text-align: center; letter-spacing: -0.025em;">You've Been Assigned a Task</h1>
        
        <p style="font-size: 16px; margin: 0 0 24px; color: #4B5563;">Hello <strong>${userName}</strong>,</p>
        
        <p style="font-size: 16px; margin: 0 0 24px; color: #4B5563;">
          <strong>${assignerName}</strong> has assigned you a new task:
        </p>

        <div style="background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
          <div style="font-size: 18px; font-weight: 700; color: #065f46; margin-bottom: 12px; text-align: center;">
            ${taskTitle}
          </div>
          <div style="text-align: center;">
            <span style="background-color: #d1fae5; color: #065f46; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">Task ID: ${taskId}</span>
          </div>
        </div>

        <a href="${process.env.FRONTEND_URL}/tasks/${taskId}" style="display: block; background-color: #059669; border-radius: 50px; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 40px; text-decoration: none; text-align: center; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.4); margin-bottom: 32px;">
          View Task Details
        </a>

        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; color: #075985; padding: 16px; border-radius: 0 4px 4px 0; font-size: 14px; margin-bottom: 32px;">
          <strong>Next Steps:</strong> Review the task details and update the status as you begin working on it.
        </div>

        <p style="font-size: 14px; margin-bottom: 0; color: #4B5563;">Best regards,</p>
        <p style="font-size: 14px; margin-bottom: 0; color: #4B5563;"><strong>TaskFlow Team</strong></p>
      </div>
      
      <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 24px; padding: 0 20px;">
        <p style="margin: 0 0 8px;">© 2025 TaskFlow Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send project assignment email
export const sendProjectAssignmentEmail = async (
  email: string,
  projectTitle: string,
  projectRole: string,
  assignerName: string,
  userName: string
): Promise<void> => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `You've been added to project: ${projectTitle}`,
    html: `
      <!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Project Assignment</title>
</head>
<body style="background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; margin: 0; padding: 0; color: #374151;">
  <div style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
    <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); height: 6px;"></div>
      
      <div style="padding: 40px;">
        <span style="color: #6366f1; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; display: block; margin-bottom: 32px;">Project Update</span>
        
        <h1 style="font-weight: 800; font-size: 24px; margin: 0 0 24px; color: #111827; text-align: center; letter-spacing: -0.025em;">Welcome to Project: ${projectTitle}</h1>
        
        <p style="font-size: 16px; margin: 0 0 24px; color: #4B5563;">Hello <strong>${userName}</strong>,</p>
        
        <p style="font-size: 16px; margin: 0 0 24px; color: #4B5563;">
          <strong>${assignerName}</strong> has added you to the project team with the role:
        </p>

        <div style="background-color: #eef2ff; border: 2px solid #6366f1; border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: center;">
          <div style="font-size: 14px; color: #4f46e5; margin-bottom: 8px;">Your Role</div>
          <div style="font-size: 20px; font-weight: 700; color: #3730a3;">${projectRole}</div>
        </div>

        <p style="font-size: 16px; margin: 0 0 32px; color: #4B5563; text-align: center;">
          You can now access all project tasks and collaborate with your team members.
        </p>

        <a href="${process.env.FRONTEND_URL}/projects" style="display: block; background-color: #6366f1; border-radius: 50px; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 40px; text-decoration: none; text-align: center; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4); margin-bottom: 32px;">
          Go to Projects Dashboard
        </a>

        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; color: #075985; padding: 16px; border-radius: 0 4px 4px 0; font-size: 14px; margin-bottom: 32px;">
          <strong>Note:</strong> As a project member, you'll receive task assignments and updates related to this project.
        </div>

        <p style="font-size: 14px; margin-bottom: 0; color: #4B5563;">Best regards,</p>
        <p style="font-size: 14px; margin-bottom: 0; color: #4B5563;"><strong>TaskFlow Team</strong></p>
      </div>
      
      <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 24px; padding: 0 20px;">
        <p style="margin: 0 0 8px;">© 2025 TaskFlow Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send password change confirmation email
export const sendPasswordChangeConfirmationEmail = async (
  email: string,
  userName: string
): Promise<void> => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Changed Successfully",
    html: `
      <!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Password Changed</title>
</head>
<body style="background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; margin: 0; padding: 0; color: #374151;">
  <div style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
    <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); overflow: hidden;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); height: 6px;"></div>
      
      <div style="padding: 40px;">
        <span style="color: #10b981; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; display: block; margin-bottom: 32px;">Security Confirmation</span>
        
        <h1 style="font-weight: 800; font-size: 24px; margin: 0 0 24px; color: #111827; text-align: center; letter-spacing: -0.025em;">Password Updated Successfully</h1>
        
        <p style="font-size: 16px; margin: 0 0 24px; color: #4B5563;">Hello <strong>${userName}</strong>,</p>
        
        <p style="font-size: 16px; margin: 0 0 24px; color: #4B5563;">
          Your password has been successfully changed. This change was made at:
        </p>

        <div style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 32px;">
          <div style="font-size: 14px; color: #065f46; margin-bottom: 8px;">Change Time</div>
          <div style="font-size: 18px; font-weight: 600; color: #065f46;">${new Date().toLocaleString()}</div>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; color: #92400e; padding: 16px; border-radius: 0 4px 4px 0; font-size: 14px; margin-bottom: 32px;">
          <strong>Security Note:</strong> If you didn't make this change, please contact our support team immediately.
        </div>

        <p style="font-size: 14px; margin-bottom: 0; color: #4B5563;">Best regards,</p>
        <p style="font-size: 14px; margin-bottom: 0; color: #4B5563;"><strong>TaskFlow Security Team</strong></p>
      </div>
      
      <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 24px; padding: 0 20px;">
        <p style="margin: 0 0 8px;">© 2025 TaskFlow Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send account status email
export const sendAccountStatusEmail = async (
  email: string,
  userName: string,
  isActive: boolean
): Promise<void> => {
  const status = isActive ? "Activated" : "Deactivated";
  const color = isActive ? "#10b981" : "#dc2626";
  const bgColor = isActive ? "#d1fae5" : "#fee2e2";
  const textColor = isActive ? "#065f46" : "#991b1b";

  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Account ${status} - TaskFlow`,
    html: `
      <!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Account ${status}</title>
</head>
<body style="background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; margin: 0; padding: 0; color: #374151;">
  <div style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
    <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); overflow: hidden;">
      <div style="background: linear-gradient(135deg, ${color} 0%, ${
      isActive ? "#34d399" : "#f87171"
    } 100%); height: 6px;"></div>
      
      <div style="padding: 40px;">
        <span style="color: ${color}; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; display: block; margin-bottom: 32px;">Account Update</span>
        
        <h1 style="font-weight: 800; font-size: 24px; margin: 0 0 24px; color: #111827; text-align: center; letter-spacing: -0.025em;">
          Account ${status}
        </h1>
        
        <p style="font-size: 16px; margin: 0 0 24px; color: #4B5563;">Hello <strong>${userName}</strong>,</p>
        
        <p style="font-size: 16px; margin: 0 0 24px; color: #4B5563;">
          Your account has been <strong>${status.toLowerCase()}</strong> by an administrator.
        </p>

        <div style="background-color: ${bgColor}; border: 2px solid ${color}; border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: ${textColor}; margin-bottom: 8px;">
            Account Status: ${status}
          </div>
          <div style="font-size: 14px; color: ${textColor};">
            Effective: ${new Date().toLocaleDateString()}
          </div>
        </div>

        ${
          isActive
            ? `<p style="font-size: 16px; margin: 0 0 32px; color: #4B5563;">
                Your account is now active. You can log in and access all platform features.
              </p>
              <a href="${process.env.FRONTEND_URL}/login" style="display: block; background-color: ${color}; border-radius: 50px; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 40px; text-decoration: none; text-align: center; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4); margin-bottom: 32px;">
                Log In to Your Account
              </a>`
            : `<div style="background-color: #fee2e2; border-left: 4px solid #ef4444; color: #991b1b; padding: 16px; border-radius: 0 4px 4px 0; font-size: 14px; margin-bottom: 32px;">
                <strong>Note:</strong> You will not be able to log in until your account is reactivated by an administrator.
              </div>`
        }

        <p style="font-size: 14px; margin-bottom: 0; color: #4B5563;">If you have any questions, please contact our support team.</p>
        <p style="font-size: 14px; margin-bottom: 0; color: #4B5563;"><strong>TaskFlow Team</strong></p>
      </div>
      
      <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 24px; padding: 0 20px;">
        <p style="margin: 0 0 8px;">© 2025 TaskFlow Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
  };

  await transporter.sendMail(mailOptions);
};
