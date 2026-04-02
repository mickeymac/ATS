from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def create_indexes():
    """Create database indexes for better query performance."""
    db = db_instance.db
    
    # Users collection indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    
    # Jobs collection indexes
    await db.jobs.create_index("created_by")
    await db.jobs.create_index("created_at")
    await db.jobs.create_index("title")
    
    # Applications collection indexes
    await db.applications.create_index("job_id")
    await db.applications.create_index("uploaded_by")
    await db.applications.create_index("review_status")
    await db.applications.create_index("applied_at")
    await db.applications.create_index("candidate_email")
    await db.applications.create_index("final_score")
    await db.applications.create_index([("job_id", 1), ("candidate_email", 1)])  # Compound index for duplicate detection
    
    # Messages collection indexes for Chat
    await db.messages.create_index("sender_id")
    await db.messages.create_index("receiver_id")
    await db.messages.create_index("timestamp")
    await db.messages.create_index("is_read")
    
    # Notifications collection indexes
    await db.notifications.create_index("user_id")
    await db.notifications.create_index("read")
    await db.notifications.create_index("created_at")
    
    # Review batches collection indexes
    await db.review_batches.create_index("batch_id", unique=True)
    await db.review_batches.create_index("recruiter_id")
    await db.review_batches.create_index("status")
    
    print("✓ Database indexes created successfully")

async def connect_to_mongo():
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_instance.db = db_instance.client[settings.DB_NAME]
    print(f"Connected to MongoDB: {settings.DB_NAME}")
    # Create indexes after connection
    await create_indexes()

async def close_mongo_connection():
    db_instance.client.close()
    print("Closed MongoDB connection")

def get_db():
    return db_instance.db
