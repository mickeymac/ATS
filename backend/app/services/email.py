import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

async def send_email(subject: str, recipient: str, body: str):
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        print(f"Mock Email to {recipient}: {subject}\n{body}")
        return

    message = MIMEMultipart()
    message["From"] = settings.MAIL_FROM
    message["To"] = recipient
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))

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
    body = f"Your application for {job_title} has been updated to: {status}."
    await send_email(subject, email, body)
