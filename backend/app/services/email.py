import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

async def send_email(subject: str, recipient: str, body: str, is_html: bool = False):
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        print(f"Mock Email to {recipient}: {subject}\n{body}")
        return

    message = MIMEMultipart()
    message["From"] = settings.MAIL_FROM
    message["To"] = recipient
    message["Subject"] = subject
    message.attach(MIMEText(body, "html" if is_html else "plain"))

    try:
        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT)
        server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(settings.MAIL_FROM, recipient, message.as_string())
        server.quit()
    except Exception as e:
        print(f"Failed to send email: {e}")

async def send_status_update_email(email: str, status: str, job_title: str):
    subject = f"Application Status Update: {job_title}"
    body = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; border-radius: 12px;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="rgba(0, 102, 255, 0.1)" stroke="#0066FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
                    <polygon points="12.5 7 7.5 13 12 13 11.5 17 16.5 11 12 11" fill="#0066FF"></polygon>
                </svg>
                <span style="font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.5px; vertical-align: middle;">Tecno<span style="color: #0066FF;">Legacy</span></span>
            </div>
            <h2 style="color: #111827; margin-bottom: 24px; font-size: 20px; font-weight: 800;">Application Update</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Your application for <strong>{job_title}</strong> has been updated.</p>
            <div style="background-color: #f3f4f6; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #374151; font-size: 18px;">New Status: <strong style="color: #0066FF; text-transform: uppercase;">{status}</strong></p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">You can view more details in your candidate portal.<br/><br/><strong>The Hiring Team</strong></p>
        </div>
    </div>
    """
    await send_email(subject, email, body, is_html=True)

async def send_otp_email(email: str, otp: str):
    subject = "Your Password Reset OTP"
    body = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; border-radius: 12px;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="rgba(0, 102, 255, 0.1)" stroke="#0066FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
                    <polygon points="12.5 7 7.5 13 12 13 11.5 17 16.5 11 12 11" fill="#0066FF"></polygon>
                </svg>
                <span style="font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.5px; vertical-align: middle;">Tecno<span style="color: #0066FF;">Legacy</span></span>
            </div>
            <h2 style="color: #111827; margin-bottom: 16px; font-size: 24px; font-weight: 800;">Password Reset</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">You requested a password reset. Your OTP verification code is:</p>
            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
                <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0f172a;">{otp}</span>
            </div>
            <p style="color: #ef4444; font-size: 14px; font-weight: 600;">This code will expire in 10 minutes.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
            <p style="color: #6b7280; font-size: 12px; margin: 0;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
        </div>
    </div>
    """
    await send_email(subject, email, body, is_html=True)

async def send_interview_email(email: str, candidate_name: str, meeting_link: str, date: str, time: str):
    subject = "Invitation to Interview"
    body = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; border-radius: 12px;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="rgba(0, 102, 255, 0.1)" stroke="#0066FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
                    <polygon points="12.5 7 7.5 13 12 13 11.5 17 16.5 11 12 11" fill="#0066FF"></polygon>
                </svg>
                <span style="font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.5px; vertical-align: middle;">Tecno<span style="color: #0066FF;">Legacy</span></span>
            </div>
            <h2 style="color: #111827; margin-bottom: 24px; font-size: 24px; font-weight: 800;">Interview Invitation</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hello <strong>{candidate_name}</strong>,</p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">We are thrilled to invite you to an upcoming interview. We were very impressed with your application!</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 24px 0;">
                <p style="margin: 0 0 10px 0; color: #374151; font-size: 16px;"><strong>📅 Date:</strong> {date}</p>
                <p style="margin: 0; color: #374151; font-size: 16px;"><strong>⏰ Time:</strong> {time} IST</p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
                <a href="{meeting_link}" style="background-color: #0066FF; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">Join Zoom Meeting</a>
            </div>
            
            <p style="color: #4b5563; font-size: 14px;">If the button above does not work, you can copy and paste this link manually:<br/>
            <a href="{meeting_link}" style="color: #0066FF; line-height: 1.8;">{meeting_link}</a></p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Best Regards,<br/><strong>The Hiring Team</strong></p>
        </div>
    </div>
    """
    await send_email(subject, email, body, is_html=True)

async def send_reminder_email(email: str, candidate_name: str, meeting_link: str, time: str):
    subject = "Interview Reminder: Starting in 30 Minutes"
    body = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; border-radius: 12px;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; border-top: 6px solid #F59E0B; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="rgba(0, 102, 255, 0.1)" stroke="#0066FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
                    <polygon points="12.5 7 7.5 13 12 13 11.5 17 16.5 11 12 11" fill="#0066FF"></polygon>
                </svg>
                <span style="font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.5px; vertical-align: middle;">Tecno<span style="color: #0066FF;">Legacy</span></span>
            </div>
            <h2 style="color: #111827; margin-bottom: 24px; font-size: 24px; font-weight: 800;">Starting Soon: Your Interview</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hello <strong>{candidate_name}</strong>,</p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">This is a quick reminder that your interview is starting in approximately <strong>30 minutes</strong> at {time} IST.</p>

            <div style="text-align: center; margin: 32px 0;">
                <a href="{meeting_link}" style="background-color: #0066FF; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">Enter Waiting Room</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Good luck!<br/><strong>The Hiring Team</strong></p>
        </div>
    </div>
    """
    await send_email(subject, email, body, is_html=True)

async def send_interview_updated_email(email: str, candidate_name: str, meeting_link: str, date: str, time: str):
    subject = "Update: Your Interview Details Have Changed"
    body = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; border-radius: 12px;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="rgba(0, 102, 255, 0.1)" stroke="#0066FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
                    <polygon points="12.5 7 7.5 13 12 13 11.5 17 16.5 11 12 11" fill="#0066FF"></polygon>
                </svg>
                <span style="font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.5px; vertical-align: middle;">Tecno<span style="color: #0066FF;">Legacy</span></span>
            </div>
            <h2 style="color: #111827; margin-bottom: 24px; font-size: 24px; font-weight: 800;">Interview Updated</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hello <strong>{candidate_name}</strong>,</p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Your scheduled interview has been updated. Please note the new date and time below:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 24px 0;">
                <p style="margin: 0 0 10px 0; color: #374151; font-size: 16px;"><strong>📅 New Date:</strong> {date}</p>
                <p style="margin: 0; color: #374151; font-size: 16px;"><strong>⏰ New Time:</strong> {time} IST</p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
                <a href="{meeting_link}" style="background-color: #0066FF; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">Join Zoom Meeting</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Best Regards,<br/><strong>The Hiring Team</strong></p>
        </div>
    </div>
    """
    await send_email(subject, email, body, is_html=True)

async def send_interview_cancelled_email(email: str, candidate_name: str):
    subject = "Update: Interview Cancelled"
    body = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; border-radius: 12px;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="rgba(0, 102, 255, 0.1)" stroke="#0066FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
                    <polygon points="12.5 7 7.5 13 12 13 11.5 17 16.5 11 12 11" fill="#0066FF"></polygon>
                </svg>
                <span style="font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.5px; vertical-align: middle;">Tecno<span style="color: #0066FF;">Legacy</span></span>
            </div>
            <h2 style="color: #ef4444; margin-bottom: 24px; font-size: 24px; font-weight: 800;">Interview Cancelled</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hello <strong>{candidate_name}</strong>,</p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Your previously scheduled interview has been cancelled. We will reach out to you if we need to reschedule.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Best Regards,<br/><strong>The Hiring Team</strong></p>
        </div>
    </div>
    """
    await send_email(subject, email, body, is_html=True)
