from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging

logger = logging.getLogger(__name__)

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db_mongo = MongoDB()

def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at: {settings.MONGODB_URI}")
    db_mongo.client = AsyncIOMotorClient(settings.MONGODB_URI)
    # Extracts the DB name from the URI or defaults to 'blast_safety'
    db_name = settings.MONGODB_URI.split("/")[-1].split("?")[0] or "blast_safety"
    db_mongo.db = db_mongo.client[db_name]
    logger.info("Connected to MongoDB successfully.")

def close_mongo_connection():
    if db_mongo.client:
        db_mongo.client.close()
        logger.info("MongoDB connection closed.")

def get_mongo_db():
    return db_mongo.db
