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
    price: Optional[float] = None
    call_for_price: bool = False
    quantity: int
    condition: str = "New"
    description: Optional[str] = None
    listing_type: str = "for_sale"  # "for_sale" or "private"
    images: List[str] = []  # Base64 encoded images, up to 3
    
class PartUpdate(BaseModel):
    part_number: Optional[str] = None
    nags_number: Optional[str] = None
    oem_number: Optional[str] = None
    interchange_number: Optional[str] = None
    part_type: Optional[str] = None
    year_start: Optional[int] = None
    year_end: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    price: Optional[float] = None
    call_for_price: Optional[bool] = None
    quantity: Optional[int] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    listing_type: Optional[str] = None
    images: Optional[List[str]] = None

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

class PartBulkCreate(BaseModel):
    parts: List[PartCreate]

@api_router.post("/parts/bulk", response_model=dict)
async def create_parts_bulk(bulk: PartBulkCreate, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] not in ["seller", "admin"]:
        raise HTTPException(status_code=403, detail="Only sellers can create parts")
    
    created_count = 0
    errors = []
    
    for idx, part in enumerate(bulk.parts):
        try:
            part_doc = {
                "id": str(uuid.uuid4()),
                "seller_id": current_user.get("seller_id"),
                **part.model_dump(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.parts.insert_one(part_doc)
            created_count += 1
        except Exception as e:
            errors.append({"row": idx + 1, "error": str(e)})
    
    return {
        "success": True,
        "created_count": created_count,
        "total_submitted": len(bulk.parts),
        "errors": errors
    }

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
    # Only show parts that are for sale (not private)
    query = {"listing_type": {"$ne": "private"}}
    if part_type:
        query["part_type"] = {"$regex": part_type, "$options": "i"}
    if make:
        query["make"] = {"$regex": make, "$options": "i"}
    
    parts = await db.parts.find(query, {"_id": 0}).to_list(limit)
    return parts

@api_router.get("/parts/my-listings", response_model=List[dict])
async def get_my_parts(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="Only sellers can view their listings")
    
    parts = await db.parts.find(
        {"seller_id": current_user.get("seller_id")}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return parts

@api_router.put("/parts/{part_id}", response_model=dict)
async def update_part(part_id: str, part: PartUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="Only sellers can update parts")
    
    existing = await db.parts.find_one({"id": part_id, "seller_id": current_user.get("seller_id")})
    if not existing:
        raise HTTPException(status_code=404, detail="Part not found or not owned by you")
    
    update_data = {k: v for k, v in part.model_dump().items() if v is not None}
    if update_data:
        await db.parts.update_one({"id": part_id}, {"$set": update_data})
    
    return {"success": True, "message": "Part updated successfully"}

@api_router.delete("/parts/{part_id}", response_model=dict)
async def delete_part(part_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="Only sellers can delete parts")
    
    result = await db.parts.delete_one({"id": part_id, "seller_id": current_user.get("seller_id")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Part not found or not owned by you")
    
    return {"success": True, "message": "Part deleted successfully"}

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
    return list(range(current_year + 1, 1949, -1))

@api_router.get("/vehicles/makes", response_model=List[str])
async def get_makes():
    makes = [
        "Acura", "Alfa Romeo", "AMC", "Aston Martin", "Audi", "Austin", "Bentley", "BMW", "Buick",
        "Cadillac", "Chevrolet", "Chrysler", "Citroën", "Daewoo", "Daihatsu", "Datsun", "DeLorean",
        "Dodge", "Eagle", "Ferrari", "Fiat", "Fisker", "Ford", "Freightliner", "Genesis", "Geo",
        "GMC", "Honda", "Hummer", "Hyundai", "Infiniti", "International", "Isuzu", "Jaguar", "Jeep",
        "Kia", "Lamborghini", "Lancia", "Land Rover", "Lexus", "Lincoln", "Lotus", "Lucid",
        "Maserati", "Maybach", "Mazda", "McLaren", "Mercedes-Benz", "Mercury", "Mini", "Mitsubishi",
        "Nash", "Nissan", "Oldsmobile", "Opel", "Packard", "Peugeot", "Plymouth", "Polestar",
        "Pontiac", "Porsche", "Ram", "Renault", "Rivian", "Rolls-Royce", "Saab", "Saturn", "Scion",
        "Smart", "Studebaker", "Subaru", "Suzuki", "Tesla", "Toyota", "Triumph", "Volkswagen",
        "Volvo", "Willys"
    ]
    return sorted(makes)

@api_router.get("/vehicles/models/{make}", response_model=List[str])
async def get_models(make: str):
    models_by_make = {
        "Toyota": ["4Runner", "86", "Avalon", "Camry", "Celica", "Corolla", "Corona", "Cressida", "Crown", "FJ Cruiser", "GR86", "GR Supra", "Highlander", "Land Cruiser", "Matrix", "MR2", "Paseo", "Prius", "RAV4", "Sequoia", "Sienna", "Solara", "Supra", "Tacoma", "Tercel", "Tundra", "Venza", "Yaris"],
        "Honda": ["Accord", "Civic", "CR-V", "CR-Z", "Crosstour", "Del Sol", "Element", "Fit", "HR-V", "Insight", "Odyssey", "Passport", "Pilot", "Prelude", "Prologue", "Ridgeline", "S2000"],
        "Ford": ["Bronco", "Bronco Sport", "C-Max", "Contour", "Crown Victoria", "E-Series", "Edge", "Escape", "Escort", "Excursion", "Expedition", "Explorer", "F-150", "F-250", "F-350", "Fairlane", "Falcon", "Festiva", "Fiesta", "Five Hundred", "Flex", "Focus", "Freestar", "Freestyle", "Fusion", "Galaxie", "Granada", "GT", "LTD", "Maverick", "Model A", "Model T", "Mustang", "Pinto", "Probe", "Ranger", "Taurus", "Tempo", "Thunderbird", "Torino", "Transit", "Windstar"],
        "Chevrolet": ["Astro", "Avalanche", "Aveo", "Bel Air", "Blazer", "Bolt", "Camaro", "Caprice", "Cavalier", "Celebrity", "Chevelle", "Citation", "Cobalt", "Colorado", "Corsica", "Corvette", "Cruze", "El Camino", "Equinox", "Express", "HHR", "Impala", "Lumina", "Malibu", "Monte Carlo", "Nova", "S-10", "Silverado", "Sonic", "Spark", "SS", "Suburban", "Tahoe", "Tracker", "TrailBlazer", "Traverse", "Trax", "Uplander", "Vega", "Venture", "Volt"],
        "BMW": ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "6 Series", "7 Series", "8 Series", "i3", "i4", "i7", "i8", "iX", "M2", "M3", "M4", "M5", "M6", "M8", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z3", "Z4"],
        "Mercedes-Benz": ["190", "240", "280", "300", "350", "380", "420", "450", "500", "560", "600", "A-Class", "AMG GT", "B-Class", "C-Class", "CL-Class", "CLA", "CLK", "CLS", "E-Class", "EQB", "EQC", "EQE", "EQS", "G-Class", "GL-Class", "GLA", "GLB", "GLC", "GLE", "GLK", "GLS", "Maybach", "ML-Class", "R-Class", "S-Class", "SL-Class", "SLC", "SLK", "SLR", "SLS", "Sprinter"],
        "Nissan": ["200SX", "240SX", "240Z", "260Z", "280Z", "280ZX", "300ZX", "350Z", "370Z", "Altima", "Armada", "Cube", "Frontier", "GT-R", "Juke", "Kicks", "Leaf", "Maxima", "Murano", "NV", "NX", "Pathfinder", "Quest", "Rogue", "Sentra", "Stanza", "Titan", "Versa", "Xterra", "Z"],
        "Hyundai": ["Accent", "Azera", "Elantra", "Entourage", "Equus", "Excel", "Genesis", "Genesis Coupe", "Ioniq", "Ioniq 5", "Ioniq 6", "Kona", "Nexo", "Palisade", "Santa Cruz", "Santa Fe", "Scoupe", "Sonata", "Tiburon", "Tucson", "Veloster", "Venue", "Veracruz", "XG350"],
        "Kia": ["Amanti", "Borrego", "Cadenza", "Carnival", "EV6", "Forte", "K5", "K900", "Niro", "Optima", "Rio", "Rondo", "Sedona", "Seltos", "Sephia", "Sorento", "Soul", "Spectra", "Sportage", "Stinger", "Telluride"],
        "Volkswagen": ["Arteon", "Atlas", "Beetle", "Cabrio", "CC", "Corrado", "Eos", "Fox", "GLI", "Golf", "GTI", "ID.4", "Jetta", "Karmann Ghia", "Microbus", "Passat", "Phaeton", "Rabbit", "Routan", "Scirocco", "Taos", "Thing", "Tiguan", "Touareg", "Type 1", "Type 2", "Type 3"],
        "Audi": ["80", "90", "100", "200", "4000", "5000", "A3", "A4", "A5", "A6", "A7", "A8", "Allroad", "Cabriolet", "e-tron", "e-tron GT", "Q3", "Q4 e-tron", "Q5", "Q7", "Q8", "R8", "RS3", "RS4", "RS5", "RS6", "RS7", "S3", "S4", "S5", "S6", "S7", "S8", "SQ5", "SQ7", "SQ8", "TT"],
        "Lexus": ["CT", "ES", "GS", "GX", "HS", "IS", "LC", "LFA", "LS", "LX", "NX", "RC", "RX", "SC", "TX", "UX"],
        "Jeep": ["Cherokee", "CJ", "Comanche", "Commander", "Compass", "DJ", "Gladiator", "Grand Cherokee", "Grand Wagoneer", "J-Series", "Liberty", "Patriot", "Renegade", "Scrambler", "Wagoneer", "Willys", "Wrangler"],
        "Dodge": ["Aries", "Avenger", "Caliber", "Caravan", "Challenger", "Charger", "Colt", "Dakota", "Dart", "Daytona", "Demon", "Durango", "Dynasty", "Grand Caravan", "Hornet", "Intrepid", "Journey", "Lancer", "Magnum", "Monaco", "Neon", "Nitro", "Omni", "Polara", "Ram", "Shadow", "Spirit", "Stealth", "Stratus", "Viper"],
        "Tesla": ["Cybertruck", "Model 3", "Model S", "Model X", "Model Y", "Roadster"],
        "Subaru": ["Ascent", "Baja", "BRZ", "Crosstrek", "Forester", "Impreza", "Justy", "Legacy", "Outback", "Solterra", "SVX", "Tribeca", "WRX", "XT"],
        "Mazda": ["2", "3", "5", "6", "323", "626", "929", "B-Series", "CX-3", "CX-30", "CX-5", "CX-50", "CX-7", "CX-9", "CX-90", "Miata", "Millenia", "MPV", "MX-3", "MX-5", "MX-6", "MX-30", "Navajo", "Protege", "RX-7", "RX-8", "Tribute"],
        "Acura": ["CL", "ILX", "Integra", "Legend", "MDX", "NSX", "RDX", "RL", "RLX", "RSX", "SLX", "TL", "TLX", "TSX", "Vigor", "ZDX"],
        "Infiniti": ["EX", "FX", "G20", "G25", "G35", "G37", "I30", "I35", "J30", "JX", "M30", "M35", "M37", "M45", "M56", "Q40", "Q45", "Q50", "Q60", "Q70", "QX4", "QX30", "QX50", "QX55", "QX56", "QX60", "QX70", "QX80"],
        "Buick": ["Cascada", "Century", "Electra", "Enclave", "Encore", "Encore GX", "Envision", "Envista", "Grand National", "LaCrosse", "LeSabre", "Lucerne", "Park Avenue", "Rainier", "Reatta", "Regal", "Rendezvous", "Riviera", "Roadmaster", "Skylark", "Terraza", "Verano"],
        "Cadillac": ["Allante", "ATS", "Brougham", "Catera", "CT4", "CT5", "CT6", "CTS", "DeVille", "DTS", "Eldorado", "Escalade", "EXT", "Fleetwood", "Lyriq", "Seville", "SRX", "STS", "XLR", "XT4", "XT5", "XT6", "XTS"],
        "GMC": ["Acadia", "Canyon", "Envoy", "Hummer EV", "Jimmy", "Safari", "Savana", "Sierra", "Sonoma", "Suburban", "Syclone", "Terrain", "Typhoon", "Vandura", "Yukon"],
        "Chrysler": ["200", "300", "300M", "Aspen", "Cirrus", "Concorde", "Conquest", "Cordoba", "Crossfire", "Fifth Avenue", "Imperial", "LeBaron", "LHS", "Neon", "New Yorker", "Pacifica", "Prowler", "PT Cruiser", "Sebring", "TC", "Town & Country", "Voyager"],
        "Lincoln": ["Aviator", "Blackwood", "Continental", "Corsair", "LS", "Mark LT", "Mark VII", "Mark VIII", "MKC", "MKS", "MKT", "MKX", "MKZ", "Nautilus", "Navigator", "Town Car", "Zephyr"],
        "Pontiac": ["Aztek", "Bonneville", "Fiero", "Firebird", "G3", "G5", "G6", "G8", "Grand Am", "Grand Prix", "GTO", "LeMans", "Montana", "Solstice", "Sunbird", "Sunfire", "Torrent", "Trans Am", "Trans Sport", "Vibe"],
        "Saturn": ["Astra", "Aura", "Ion", "L-Series", "Outlook", "Relay", "SC", "Sky", "SL", "SW", "Vue"],
        "Mercury": ["Capri", "Cougar", "Grand Marquis", "Marauder", "Mariner", "Milan", "Montego", "Monterey", "Mountaineer", "Mystique", "Sable", "Topaz", "Tracer", "Villager"],
        "Oldsmobile": ["442", "88", "98", "Achieva", "Alero", "Aurora", "Bravada", "Cutlass", "Cutlass Supreme", "Intrigue", "LSS", "Regency", "Silhouette", "Toronado"],
        "Plymouth": ["Acclaim", "Barracuda", "Belvedere", "Breeze", "Duster", "Fury", "Gran Fury", "GTX", "Horizon", "Laser", "Neon", "Prowler", "Reliant", "Road Runner", "Satellite", "Sundance", "Valiant", "Voyager"],
        "Hummer": ["H1", "H2", "H3"],
        "Scion": ["FR-S", "iA", "iM", "iQ", "tC", "xA", "xB", "xD"],
        "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Freelander", "LR2", "LR3", "LR4", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
        "Jaguar": ["E-Pace", "E-Type", "F-Pace", "F-Type", "I-Pace", "S-Type", "X-Type", "XE", "XF", "XJ", "XJ6", "XJ8", "XJR", "XJS", "XK", "XK8", "XKR"],
        "Porsche": ["718", "911", "918", "924", "928", "930", "944", "968", "Boxster", "Carrera GT", "Cayenne", "Cayman", "Macan", "Panamera", "Taycan"],
        "Volvo": ["240", "740", "850", "940", "960", "C30", "C40", "C70", "S40", "S60", "S70", "S80", "S90", "V40", "V50", "V60", "V70", "V90", "XC40", "XC60", "XC70", "XC90"],
        "Mitsubishi": ["3000GT", "Diamante", "Eclipse", "Eclipse Cross", "Endeavor", "Expo", "Galant", "i-MiEV", "Lancer", "Mirage", "Montero", "Outlander", "Outlander Sport", "Raider"],
        "Fiat": ["124 Spider", "500", "500L", "500X", "Spider"],
        "Alfa Romeo": ["164", "4C", "Giulia", "Giulietta", "Spider", "Stelvio", "Tonale"],
        "Maserati": ["Ghibli", "GranSport", "GranTurismo", "Grecale", "Levante", "MC20", "Quattroporte", "Spyder"],
        "Ferrari": ["208", "246", "250", "275", "288", "296", "308", "328", "348", "360", "365", "400", "412", "456", "458", "488", "512", "550", "575", "599", "612", "812", "California", "Enzo", "F12", "F355", "F40", "F430", "F8", "FF", "GTC4Lusso", "LaFerrari", "Mondial", "Portofino", "Purosangue", "Roma", "SF90", "Testarossa"],
        "Lamborghini": ["350", "400", "Aventador", "Countach", "Diablo", "Espada", "Gallardo", "Huracan", "Jalpa", "Miura", "Murcielago", "Revuelto", "Urus"],
        "Bentley": ["Arnage", "Azure", "Bentayga", "Continental", "Flying Spur", "Mulsanne"],
        "Rolls-Royce": ["Corniche", "Cullinan", "Dawn", "Ghost", "Phantom", "Silver Cloud", "Silver Shadow", "Silver Spirit", "Silver Spur", "Spectre", "Wraith"],
        "Aston Martin": ["DB11", "DB7", "DB9", "DBS", "DBX", "Rapide", "V12 Vantage", "V8 Vantage", "Vanquish", "Vantage", "Virage"],
        "McLaren": ["540C", "570GT", "570S", "600LT", "620R", "650S", "675LT", "720S", "765LT", "Artura", "GT", "MP4-12C", "P1", "Senna", "Speedtail"],
        "Genesis": ["Electrified G80", "Electrified GV70", "G70", "G80", "G90", "GV60", "GV70", "GV80"],
        "Rivian": ["R1S", "R1T"],
        "Lucid": ["Air"],
        "Polestar": ["1", "2", "3"]
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
