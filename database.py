from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
client = MongoClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('MONGODB_DB_NAME')]
users_collection = db[os.getenv('MONGODB_COLLECTION_USERS')]
messages_collection = db[os.getenv('MONGODB_COLLECTION_MESSAGES')]
sessions_collection = db[os.getenv('MONGODB_COLLECTION_SESSIONS')] 