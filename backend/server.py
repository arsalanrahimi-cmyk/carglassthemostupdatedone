from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="CarGlassHub API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    user_type: str
    created_at: str

class SellerCreate(BaseModel):
    email: EmailStr
    password: str
    business_name: str
    contact_name: str
    phone: str
    address: Optional[str] = None
    city: str
    state: str
    zip_code: str
    website: Optional[str] = None
    description: Optional[str] = None

class InstallerCreate(BaseModel):
    email: EmailStr
    password: str
    business_name: str
    contact_name: str
    phone: str
    address: Optional[str] = None
    city: str
    state: str
    zip_code: str
    services: List[str] = []
    website: Optional[str] = None
    description: Optional[str] = None
    certifications: Optional[str] = None

class ReviewCreate(BaseModel):
    installer_id: str
    rating: int = Field(ge=1, le=5)
    reviewer_name: str
    reviewer_email: Optional[EmailStr] = None
    comment: str

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str

class PartCreate(BaseModel):
    part_number: str
    nags_number: Optional[str] = None
    oem_number: Optional[str] = None
    interchange_number: Optional[str] = None
    part_type: str
    year_start: int
    year_end: int
    make: str
    model: str
    price: float
    quantity: int
    condition: str = "New"
    description: Optional[str] = None

class VehicleSearch(BaseModel):
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    part_type: Optional[str] = None

class PartNumberSearch(BaseModel):
    part_number: str

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_token(user_id: str, user_type: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "user_type": user_type,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=dict)
async def register_user(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "phone": user.phone,
        "user_type": "customer",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_doc["id"], user_doc["user_type"])
    return {
        "token": token,
        "user": {
            "id": user_doc["id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "user_type": user_doc["user_type"]
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login_user(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["user_type"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "user_type": user["user_type"]
        }
    }

@api_router.get("/auth/me", response_model=dict)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "user_type": current_user["user_type"],
        "phone": current_user.get("phone")
    }

# ==================== SELLER ROUTES ====================

@api_router.post("/sellers/register", response_model=dict)
async def register_seller(seller: SellerCreate):
    existing = await db.users.find_one({"email": seller.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    seller_id = str(uuid.uuid4())
    
    user_doc = {
        "id": user_id,
        "email": seller.email,
        "password": hash_password(seller.password),
        "name": seller.contact_name,
        "phone": seller.phone,
        "user_type": "seller",
        "seller_id": seller_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    seller_doc = {
        "id": seller_id,
        "user_id": user_id,
        "business_name": seller.business_name,
        "contact_name": seller.contact_name,
        "email": seller.email,
        "phone": seller.phone,
        "address": seller.address,
        "city": seller.city,
        "state": seller.state,
        "zip_code": seller.zip_code,
        "website": seller.website,
        "description": seller.description,
        "verified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    await db.sellers.insert_one(seller_doc)
    
    token = create_token(user_id, "seller")
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": seller.email,
            "name": seller.contact_name,
            "user_type": "seller",
            "seller_id": seller_id
        },
        "message": "Seller registration successful"
    }

@api_router.get("/sellers", response_model=List[dict])
async def get_sellers():
    sellers = await db.sellers.find({}, {"_id": 0}).to_list(100)
    return sellers

@api_router.get("/sellers/{seller_id}", response_model=dict)
async def get_seller(seller_id: str):
    seller = await db.sellers.find_one({"id": seller_id}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return seller

# ==================== INSTALLER ROUTES ====================

@api_router.post("/installers/register", response_model=dict)
async def register_installer(installer: InstallerCreate):
    existing = await db.users.find_one({"email": installer.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    installer_id = str(uuid.uuid4())
    
    user_doc = {
        "id": user_id,
        "email": installer.email,
        "password": hash_password(installer.password),
        "name": installer.contact_name,
        "phone": installer.phone,
        "user_type": "installer",
        "installer_id": installer_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    installer_doc = {
        "id": installer_id,
        "user_id": user_id,
        "business_name": installer.business_name,
        "contact_name": installer.contact_name,
        "email": installer.email,
        "phone": installer.phone,
        "address": installer.address,
        "city": installer.city,
        "state": installer.state,
        "zip_code": installer.zip_code,
        "services": installer.services,
        "website": installer.website,
        "description": installer.description,
        "certifications": installer.certifications,
        "verified": False,
        "rating": 0,
        "review_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    await db.installers.insert_one(installer_doc)
    
    token = create_token(user_id, "installer")
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": installer.email,
            "name": installer.contact_name,
            "user_type": "installer",
            "installer_id": installer_id
        },
        "message": "Installer registration successful"
    }

@api_router.get("/installers", response_model=List[dict])
async def get_installers(city: Optional[str] = None, state: Optional[str] = None, zip_code: Optional[str] = None):
    query = {}
    if zip_code:
        query["zip_code"] = {"$regex": zip_code, "$options": "i"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if state:
        query["state"] = {"$regex": state, "$options": "i"}
    
    installers = await db.installers.find(query, {"_id": 0}).to_list(100)
    return installers

@api_router.get("/installers/{installer_id}", response_model=dict)
async def get_installer(installer_id: str):
    installer = await db.installers.find_one({"id": installer_id}, {"_id": 0})
    if not installer:
        raise HTTPException(status_code=404, detail="Installer not found")
    return installer

# ==================== REVIEW ROUTES ====================

@api_router.post("/reviews", response_model=dict)
async def create_review(review: ReviewCreate):
    # Check if installer exists
    installer = await db.installers.find_one({"id": review.installer_id})
    if not installer:
        raise HTTPException(status_code=404, detail="Installer not found")
    
    review_doc = {
        "id": str(uuid.uuid4()),
        "installer_id": review.installer_id,
        "rating": review.rating,
        "reviewer_name": review.reviewer_name,
        "reviewer_email": review.reviewer_email,
        "comment": review.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)
    
    # Update installer's average rating
    all_reviews = await db.reviews.find({"installer_id": review.installer_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    await db.installers.update_one(
        {"id": review.installer_id},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(all_reviews)}}
    )
    
    return {"success": True, "message": "Review submitted successfully!", "review_id": review_doc["id"]}

@api_router.get("/reviews/{installer_id}", response_model=List[dict])
async def get_installer_reviews(installer_id: str):
    reviews = await db.reviews.find({"installer_id": installer_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reviews

# ==================== CONTACT ROUTES ====================

@api_router.post("/contact", response_model=dict)
async def submit_contact(message: ContactMessage):
    contact_doc = {
        "id": str(uuid.uuid4()),
        "name": message.name,
        "email": message.email,
        "phone": message.phone,
        "subject": message.subject,
        "message": message.message,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(contact_doc)
    return {"success": True, "message": "Thank you for contacting us. We will get back to you soon!"}

# ==================== PARTS ROUTES ====================

@api_router.post("/parts", response_model=dict)
async def create_part(part: PartCreate, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] not in ["seller", "admin"]:
        raise HTTPException(status_code=403, detail="Only sellers can create parts")
    
    part_doc = {
        "id": str(uuid.uuid4()),
        "seller_id": current_user.get("seller_id"),
        **part.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.parts.insert_one(part_doc)
    return {"success": True, "part_id": part_doc["id"]}

@api_router.get("/parts", response_model=List[dict])
async def get_parts(
    part_type: Optional[str] = None,
    make: Optional[str] = None,
    limit: int = 50
):
    query = {}
    if part_type:
        query["part_type"] = {"$regex": part_type, "$options": "i"}
    if make:
        query["make"] = {"$regex": make, "$options": "i"}
    
    parts = await db.parts.find(query, {"_id": 0}).to_list(limit)
    return parts

@api_router.post("/parts/search/number", response_model=List[dict])
async def search_by_part_number(search: PartNumberSearch):
    query = {
        "$or": [
            {"part_number": {"$regex": search.part_number, "$options": "i"}},
            {"nags_number": {"$regex": search.part_number, "$options": "i"}},
            {"oem_number": {"$regex": search.part_number, "$options": "i"}},
            {"interchange_number": {"$regex": search.part_number, "$options": "i"}}
        ]
    }
    parts = await db.parts.find(query, {"_id": 0}).to_list(50)
    return parts

@api_router.post("/parts/search/vehicle", response_model=List[dict])
async def search_by_vehicle(search: VehicleSearch):
    query = {}
    
    if search.year:
        query["$and"] = [
            {"year_start": {"$lte": search.year}},
            {"year_end": {"$gte": search.year}}
        ]
    if search.make:
        query["make"] = {"$regex": search.make, "$options": "i"}
    if search.model:
        query["model"] = {"$regex": search.model, "$options": "i"}
    if search.part_type:
        query["part_type"] = {"$regex": search.part_type, "$options": "i"}
    
    parts = await db.parts.find(query, {"_id": 0}).to_list(50)
    return parts

@api_router.get("/parts/{part_id}", response_model=dict)
async def get_part(part_id: str):
    part = await db.parts.find_one({"id": part_id}, {"_id": 0})
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    return part

# ==================== VEHICLE DATA ROUTES ====================

@api_router.get("/vehicles/years", response_model=List[int])
async def get_years():
    current_year = datetime.now().year
    return list(range(current_year + 1, 1979, -1))

@api_router.get("/vehicles/makes", response_model=List[str])
async def get_makes():
    makes = [
        "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Buick",
        "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Ferrari", "Fiat", "Ford",
        "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia",
        "Lamborghini", "Land Rover", "Lexus", "Lincoln", "Maserati", "Mazda",
        "McLaren", "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan", "Porsche",
        "Ram", "Rolls-Royce", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo"
    ]
    return makes

@api_router.get("/vehicles/models/{make}", response_model=List[str])
async def get_models(make: str):
    models_by_make = {
        "Toyota": ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "Tundra", "4Runner", "Prius", "Sienna", "Avalon"],
        "Honda": ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V", "Ridgeline", "Passport", "Fit", "Insight"],
        "Ford": ["F-150", "Mustang", "Explorer", "Escape", "Edge", "Ranger", "Bronco", "Expedition", "Focus", "Fusion"],
        "Chevrolet": ["Silverado", "Equinox", "Tahoe", "Malibu", "Traverse", "Colorado", "Camaro", "Corvette", "Suburban", "Blazer"],
        "BMW": ["3 Series", "5 Series", "7 Series", "X3", "X5", "X7", "M3", "M5", "i4", "iX"],
        "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLS", "A-Class", "CLA", "AMG GT", "EQS"],
        "Nissan": ["Altima", "Maxima", "Sentra", "Rogue", "Pathfinder", "Murano", "Frontier", "Titan", "Kicks", "Armada"],
        "Hyundai": ["Elantra", "Sonata", "Tucson", "Santa Fe", "Palisade", "Kona", "Venue", "Ioniq", "Genesis", "Veloster"],
        "Kia": ["Optima", "Forte", "Sorento", "Sportage", "Telluride", "Soul", "Seltos", "Carnival", "Stinger", "EV6"],
        "Volkswagen": ["Jetta", "Passat", "Golf", "Tiguan", "Atlas", "Arteon", "ID.4", "Taos", "GTI", "Beetle"],
        "Audi": ["A3", "A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron", "RS6"],
        "Lexus": ["ES", "IS", "LS", "RX", "NX", "GX", "LX", "UX", "RC", "LC"],
        "Jeep": ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Renegade", "Gladiator", "Wagoneer", "Grand Wagoneer"],
        "Dodge": ["Charger", "Challenger", "Durango", "Ram 1500", "Ram 2500", "Journey", "Grand Caravan"],
        "Tesla": ["Model 3", "Model S", "Model X", "Model Y", "Cybertruck"],
        "Subaru": ["Outback", "Forester", "Crosstrek", "Impreza", "Legacy", "Ascent", "WRX", "BRZ"],
        "Mazda": ["Mazda3", "Mazda6", "CX-5", "CX-9", "CX-30", "MX-5 Miata", "CX-50"],
    }
    return models_by_make.get(make, ["Other"])

@api_router.get("/vehicles/part-types", response_model=List[str])
async def get_part_types():
    return [
        "Windshield",
        "Front Door Glass - Driver",
        "Front Door Glass - Passenger",
        "Rear Door Glass - Driver",
        "Rear Door Glass - Passenger",
        "Rear Window/Back Glass",
        "Quarter Glass - Driver",
        "Quarter Glass - Passenger",
        "Vent Glass - Driver",
        "Vent Glass - Passenger",
        "Sunroof Glass",
        "Moonroof Glass"
    ]

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "CarGlassHub API is running", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
