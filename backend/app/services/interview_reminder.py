import asyncio
from datetime import datetime, timedelta
from app.db.mongodb import get_db
from app.services.email import send_reminder_email
from bson import ObjectId
import math

async def check_upcoming_interviews():
    """Background task to check for upcoming interviews in the next ~30 mins and send reminder."""
    # We need to manually acquire db reference since Depends() is for routers
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings
    
    # Establish local connection for daemon
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    
    print("Interview Reminder Daemon Started...")
    
    while True:
        try:
            # Get current time in IST (UTC + 5:30)
            now = datetime.utcnow() + timedelta(hours=5, minutes=30)
            
            # Find interviews that haven't had a reminder sent yet
            cursor = db.interviews.find({
                "reminder_sent": {"$ne": True}
            })
            
            async for interview in cursor:
                date_str = interview.get('date')
                time_str = interview.get('time')
                
                if date_str and time_str:
                    # Parse meeting date & time back into datetime object
                    # Expected formats: date="YYYY-MM-DD", time="HH:MM"
                    meeting_datetime_str = f"{date_str} {time_str}"
                    try:
                        meeting_time = datetime.strptime(meeting_datetime_str, "%Y-%m-%d %H:%M")
                        
                        # Calculate time difference
                        time_diff = meeting_time - now
                        diff_minutes = time_diff.total_seconds() / 60.0
                        
                        # If meeting is strictly within the next 30 minutes (and hasn't passed)
                        if 0 <= diff_minutes <= 30:
                            print(f"Triggering 30m Reminder for {interview['candidate']}...")
                            await send_reminder_email(
                                email=interview['email'],
                                candidate_name=interview['candidate'],
                                meeting_link=interview.get('link', ''),
                                time=time_str
                            )
                            # Mark as sent
                            await db.interviews.update_one(
                                {"_id": interview['_id']},
                                {"$set": {"reminder_sent": True}}
                            )
                    except ValueError as e:
                        print(f"Reminder Parsing error for {interview.get('_id')}: {e}")
                        pass
        except Exception as e:
            print(f"Reminder Daemon Error: {str(e)}")
            
        # Wait 60 seconds before checking again
        await asyncio.sleep(60)
