from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
import secrets
import csv
import io

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

# Admin Registration Code
ADMIN_CODE = os.environ.get('ADMIN_CODE', 'CARGLASS2024ADMIN')

# Create the main app
app = FastAPI(title="CarGlassHub API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# ==================== MODELS ====================

# Auth Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class BusinessRegister(BaseModel):
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

class InstallerRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    service_area: str
    city: str
    state: str
    zip_code: str
    experience: Optional[str] = None
    availability: Optional[str] = None
    certifications: Optional[str] = None
    description: Optional[str] = None

class AdminRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    admin_code: str

# Product Models
class ProductCreate(BaseModel):
    nags_number: str  # Required - only required field
    part_number: Optional[str] = None
    oem_number: Optional[str] = None
    interchange_number: Optional[str] = None
    category: Optional[str] = None
    year_start: Optional[int] = None
    year_end: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    glass_type: Optional[str] = None
    condition: Optional[str] = None
    price: Optional[float] = None
    call_for_price: bool = False
    quantity: int = 1
    location: Optional[str] = None
    description: Optional[str] = None
    listing_type: str = "public"  # public or private
    images: List[str] = []  # Up to 3 images as base64

class ProductUpdate(BaseModel):
    part_number: Optional[str] = None
    nags_number: Optional[str] = None
    oem_number: Optional[str] = None
    interchange_number: Optional[str] = None
    category: Optional[str] = None
    year_start: Optional[int] = None
    year_end: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    glass_type: Optional[str] = None
    condition: Optional[str] = None
    price: Optional[float] = None
    call_for_price: Optional[bool] = None
    quantity: Optional[int] = None
    location: Optional[str] = None
    description: Optional[str] = None
    listing_type: Optional[str] = None
    images: Optional[List[str]] = None

class ProductSearch(BaseModel):
    query: Optional[str] = None
    part_number: Optional[str] = None
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    category: Optional[str] = None

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str

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
    if user.get("is_active") is False:
        raise HTTPException(status_code=401, detail="Account deactivated")
    return user

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=dict)
async def register_user(user: UserCreate):
    """Register a basic user account"""
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
        "is_active": True,
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

@api_router.post("/auth/register/business", response_model=dict)
async def register_business(business: BusinessRegister):
    """Register a business account"""
    existing = await db.users.find_one({"email": business.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    business_id = str(uuid.uuid4())
    
    user_doc = {
        "id": user_id,
        "email": business.email,
        "password": hash_password(business.password),
        "name": business.contact_name,
        "phone": business.phone,
        "user_type": "business",
        "business_id": business_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    business_doc = {
        "id": business_id,
        "user_id": user_id,
        "business_name": business.business_name,
        "contact_name": business.contact_name,
        "email": business.email,
        "phone": business.phone,
        "address": business.address,
        "city": business.city,
        "state": business.state,
        "zip_code": business.zip_code,
        "website": business.website,
        "description": business.description,
        "verified": False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    await db.businesses.insert_one(business_doc)
    
    token = create_token(user_id, "business")
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": business.email,
            "name": business.contact_name,
            "user_type": "business",
            "business_id": business_id
        }
    }

@api_router.post("/auth/register/installer", response_model=dict)
async def register_installer(installer: InstallerRegister):
    """Register a mobile installer account"""
    existing = await db.users.find_one({"email": installer.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    installer_id = str(uuid.uuid4())
    
    user_doc = {
        "id": user_id,
        "email": installer.email,
        "password": hash_password(installer.password),
        "name": installer.name,
        "phone": installer.phone,
        "user_type": "installer",
        "installer_id": installer_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    installer_doc = {
        "id": installer_id,
        "user_id": user_id,
        "name": installer.name,
        "email": installer.email,
        "phone": installer.phone,
        "service_area": installer.service_area,
        "city": installer.city,
        "state": installer.state,
        "zip_code": installer.zip_code,
        "experience": installer.experience,
        "availability": installer.availability,
        "certifications": installer.certifications,
        "description": installer.description,
        "verified": False,
        "is_active": True,
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
            "name": installer.name,
            "user_type": "installer",
            "installer_id": installer_id
        }
    }

@api_router.post("/auth/register/admin", response_model=dict)
async def register_admin(admin: AdminRegister):
    """Register an admin account (requires admin code)"""
    if admin.admin_code != ADMIN_CODE:
        raise HTTPException(status_code=403, detail="Invalid admin registration code")
    
    existing = await db.users.find_one({"email": admin.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": admin.email,
        "password": hash_password(admin.password),
        "name": admin.name,
        "user_type": "admin",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_doc["id"], "admin")
    return {
        "token": token,
        "user": {
            "id": user_doc["id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "user_type": "admin"
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login_user(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user.get("is_active") is False:
        raise HTTPException(status_code=401, detail="Account deactivated. Please contact support.")
    
    token = create_token(user["id"], user["user_type"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "user_type": user["user_type"],
            "business_id": user.get("business_id"),
            "installer_id": user.get("installer_id")
        }
    }

@api_router.get("/auth/me", response_model=dict)
async def get_me(current_user: dict = Depends(get_current_user)):
    response = {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "user_type": current_user["user_type"],
        "phone": current_user.get("phone")
    }
    
    if current_user.get("business_id"):
        business = await db.businesses.find_one({"id": current_user["business_id"]}, {"_id": 0})
        if business:
            response["business"] = business
    
    if current_user.get("installer_id"):
        installer = await db.installers.find_one({"id": current_user["installer_id"]}, {"_id": 0})
        if installer:
            response["installer"] = installer
    
    return response

@api_router.post("/auth/forgot-password", response_model=dict)
async def forgot_password(email: EmailStr):
    user = await db.users.find_one({"email": email})
    if not user:
        return {"success": True, "message": "If this email exists, a reset code has been sent."}
    
    reset_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_resets.delete_many({"email": email})
    await db.password_resets.insert_one({
        "email": email,
        "code": reset_code,
        "expires_at": expiry.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Demo mode - return code in response
    return {
        "success": True,
        "message": f"Reset code generated. Your code is: {reset_code}",
        "reset_code": reset_code
    }

@api_router.post("/auth/reset-password", response_model=dict)
async def reset_password(email: EmailStr, code: str, new_password: str):
    reset = await db.password_resets.find_one({"email": email, "code": code})
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    expires_at = datetime.fromisoformat(reset["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Reset code has expired")
    
    await db.users.update_one(
        {"email": email},
        {"$set": {"password": hash_password(new_password)}}
    )
    await db.password_resets.delete_one({"email": email})
    
    return {"success": True, "message": "Password reset successfully"}

@api_router.post("/auth/change-password", response_model=dict)
async def change_password(current_password: str, new_password: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    if not verify_password(current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": hash_password(new_password)}}
    )
    return {"success": True, "message": "Password changed successfully"}

# ==================== PRODUCT ROUTES ====================

@api_router.post("/products", response_model=dict)
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] not in ["business", "admin"]:
        raise HTTPException(status_code=403, detail="Only businesses can create products")
    
    product_doc = {
        "id": str(uuid.uuid4()),
        "business_id": current_user.get("business_id"),
        "user_id": current_user["id"],
        **product.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    return {"success": True, "product_id": product_doc["id"]}

@api_router.post("/products/bulk", response_model=dict)
async def bulk_upload_products(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Bulk upload products via CSV file"""
    if current_user["user_type"] not in ["business", "admin"]:
        raise HTTPException(status_code=403, detail="Only businesses can upload products")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    created_count = 0
    errors = []
    
    for idx, row in enumerate(reader):
        try:
            product_doc = {
                "id": str(uuid.uuid4()),
                "business_id": current_user.get("business_id"),
                "user_id": current_user["id"],
                "part_number": row.get("part_number", ""),
                "nags_number": row.get("nags_number"),
                "oem_number": row.get("oem_number"),
                "interchange_number": row.get("interchange_number"),
                "category": row.get("category", "windshield"),
                "year_start": int(row.get("year_start", 2020)),
                "year_end": int(row.get("year_end", 2024)),
                "make": row.get("make", ""),
                "model": row.get("model", ""),
                "glass_type": row.get("glass_type"),
                "condition": row.get("condition", "New"),
                "price": float(row.get("price", 0)) if row.get("price") else None,
                "call_for_price": row.get("call_for_price", "").lower() == "true",
                "quantity": int(row.get("quantity", 1)),
                "location": row.get("location"),
                "description": row.get("description"),
                "listing_type": row.get("listing_type", "public"),
                "images": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.products.insert_one(product_doc)
            created_count += 1
        except Exception as e:
            errors.append({"row": idx + 2, "error": str(e)})
    
    return {
        "success": True,
        "created_count": created_count,
        "error_count": len(errors),
        "errors": errors[:10]  # Return first 10 errors
    }

@api_router.get("/products/template")
async def get_csv_template():
    """Get CSV template for bulk upload"""
    return {
        "columns": [
            "part_number", "nags_number", "oem_number", "interchange_number",
            "category", "year_start", "year_end", "make", "model",
            "glass_type", "condition", "price", "call_for_price",
            "quantity", "location", "description", "listing_type"
        ],
        "categories": [
            "windshield", "door_glass", "quarter_glass", "vent_glass",
            "roof_glass", "back_glass", "window_regulator", "side_mirror"
        ],
        "conditions": ["New", "Used", "OEM", "Aftermarket"],
        "listing_types": ["public", "private"]
    }

@api_router.get("/products/my-inventory", response_model=List[dict])
async def get_my_inventory(current_user: dict = Depends(get_current_user)):
    """Get all products for current business (including private)"""
    if current_user["user_type"] not in ["business", "admin"]:
        raise HTTPException(status_code=403, detail="Only businesses can view inventory")
    
    products = await db.products.find(
        {"business_id": current_user.get("business_id")},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return products

@api_router.put("/products/{product_id}", response_model=dict)
async def update_product(product_id: str, product: ProductUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.products.find_one({
        "id": product_id,
        "business_id": current_user.get("business_id")
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    return {"success": True, "message": "Product updated"}

@api_router.delete("/products/{product_id}", response_model=dict)
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.products.delete_one({
        "id": product_id,
        "business_id": current_user.get("business_id")
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "message": "Product deleted"}

# ==================== PUBLIC SEARCH ROUTES ====================

@api_router.post("/search", response_model=dict)
async def search_products(search: ProductSearch):
    """Public search - available to everyone"""
    query = {"listing_type": "public"}
    
    if search.part_number:
        query["$or"] = [
            {"part_number": {"$regex": search.part_number, "$options": "i"}},
            {"nags_number": {"$regex": search.part_number, "$options": "i"}},
            {"oem_number": {"$regex": search.part_number, "$options": "i"}},
            {"interchange_number": {"$regex": search.part_number, "$options": "i"}}
        ]
    
    if search.year:
        query["year_start"] = {"$lte": search.year}
        query["year_end"] = {"$gte": search.year}
    
    if search.make:
        query["make"] = {"$regex": search.make, "$options": "i"}
    
    if search.model:
        query["model"] = {"$regex": search.model, "$options": "i"}
    
    if search.category:
        query["category"] = {"$regex": search.category, "$options": "i"}
    
    if search.query:
        text_query = {"$or": [
            {"part_number": {"$regex": search.query, "$options": "i"}},
            {"nags_number": {"$regex": search.query, "$options": "i"}},
            {"make": {"$regex": search.query, "$options": "i"}},
            {"model": {"$regex": search.query, "$options": "i"}},
            {"description": {"$regex": search.query, "$options": "i"}}
        ]}
        query = {"$and": [query, text_query]} if query != {"listing_type": "public"} else {**query, **text_query}
    
    products = await db.products.find(query, {"_id": 0}).limit(100).to_list(100)
    
    # Get business info for each product
    for product in products:
        if product.get("business_id"):
            business = await db.businesses.find_one(
                {"id": product["business_id"]},
                {"_id": 0, "business_name": 1, "city": 1, "state": 1, "phone": 1}
            )
            product["seller"] = business
    
    return {
        "results": products,
        "count": len(products)
    }

@api_router.get("/products/{product_id}", response_model=dict)
async def get_product(product_id: str):
    """Get single product details"""
    product = await db.products.find_one({"id": product_id, "listing_type": "public"}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.get("business_id"):
        business = await db.businesses.find_one(
            {"id": product["business_id"]},
            {"_id": 0, "business_name": 1, "city": 1, "state": 1, "phone": 1, "email": 1}
        )
        product["seller"] = business
    
    return product

# ==================== INSTALLER ROUTES ====================

@api_router.get("/installers", response_model=List[dict])
async def get_installers(city: Optional[str] = None, state: Optional[str] = None, zip_code: Optional[str] = None):
    query = {"is_active": True}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if state:
        query["state"] = {"$regex": state, "$options": "i"}
    if zip_code:
        query["zip_code"] = {"$regex": zip_code, "$options": "i"}
    
    installers = await db.installers.find(query, {"_id": 0}).to_list(100)
    return installers

@api_router.get("/installers/{installer_id}", response_model=dict)
async def get_installer(installer_id: str):
    installer = await db.installers.find_one({"id": installer_id}, {"_id": 0})
    if not installer:
        raise HTTPException(status_code=404, detail="Installer not found")
    return installer

# ==================== BUSINESS ROUTES ====================

@api_router.get("/businesses", response_model=List[dict])
async def get_businesses(city: Optional[str] = None, state: Optional[str] = None):
    query = {"is_active": True}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if state:
        query["state"] = {"$regex": state, "$options": "i"}
    
    businesses = await db.businesses.find(query, {"_id": 0}).to_list(100)
    return businesses

@api_router.get("/businesses/{business_id}", response_model=dict)
async def get_business(business_id: str):
    business = await db.businesses.find_one({"id": business_id}, {"_id": 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

@api_router.put("/businesses/profile", response_model=dict)
async def update_business_profile(
    business_name: Optional[str] = None,
    contact_name: Optional[str] = None,
    phone: Optional[str] = None,
    address: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
    website: Optional[str] = None,
    description: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_type"] != "business":
        raise HTTPException(status_code=403, detail="Only businesses can update profile")
    
    update_data = {}
    if business_name: update_data["business_name"] = business_name
    if contact_name: update_data["contact_name"] = contact_name
    if phone: update_data["phone"] = phone
    if address: update_data["address"] = address
    if city: update_data["city"] = city
    if state: update_data["state"] = state
    if zip_code: update_data["zip_code"] = zip_code
    if website: update_data["website"] = website
    if description: update_data["description"] = description
    
    if update_data:
        await db.businesses.update_one(
            {"id": current_user.get("business_id")},
            {"$set": update_data}
        )
    
    return {"success": True, "message": "Profile updated"}

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

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users", response_model=List[dict])
async def admin_get_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.put("/admin/users/{user_id}/status", response_model=dict)
async def admin_toggle_user_status(user_id: str, is_active: bool, admin: dict = Depends(require_admin)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": is_active}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": f"User {'activated' if is_active else 'deactivated'}"}

@api_router.get("/admin/products", response_model=List[dict])
async def admin_get_products(admin: dict = Depends(require_admin)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return products

@api_router.delete("/admin/products/{product_id}", response_model=dict)
async def admin_delete_product(product_id: str, admin: dict = Depends(require_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "message": "Product deleted"}

@api_router.get("/admin/contacts", response_model=List[dict])
async def admin_get_contacts(admin: dict = Depends(require_admin)):
    contacts = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return contacts

@api_router.get("/admin/stats", response_model=dict)
async def admin_get_stats(admin: dict = Depends(require_admin)):
    users_count = await db.users.count_documents({})
    businesses_count = await db.businesses.count_documents({})
    installers_count = await db.installers.count_documents({})
    products_count = await db.products.count_documents({})
    public_products = await db.products.count_documents({"listing_type": "public"})
    contacts_count = await db.contacts.count_documents({"status": "new"})
    
    return {
        "total_users": users_count,
        "total_businesses": businesses_count,
        "total_installers": installers_count,
        "total_products": products_count,
        "public_listings": public_products,
        "new_contacts": contacts_count
    }

# ==================== VEHICLE DATA ROUTES ====================

@api_router.get("/vehicles/years", response_model=List[int])
async def get_years():
    current_year = datetime.now().year
    return list(range(current_year + 1, 1949, -1))

@api_router.get("/vehicles/makes", response_model=List[str])
async def get_makes():
    makes = [
        "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Buick",
        "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Ferrari", "Fiat", "Ford",
        "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia",
        "Lamborghini", "Land Rover", "Lexus", "Lincoln", "Maserati", "Mazda",
        "McLaren", "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan", "Porsche",
        "Ram", "Rivian", "Rolls-Royce", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo"
    ]
    return sorted(makes)

@api_router.get("/vehicles/models/{make}", response_model=List[str])
async def get_models(make: str):
    models_by_make = {
        "Toyota": ["4Runner", "Avalon", "Camry", "Corolla", "GR86", "Highlander", "Land Cruiser", "Prius", "RAV4", "Sequoia", "Sienna", "Supra", "Tacoma", "Tundra", "Venza"],
        "Honda": ["Accord", "Civic", "CR-V", "HR-V", "Insight", "Odyssey", "Passport", "Pilot", "Ridgeline"],
        "Ford": ["Bronco", "Edge", "Escape", "Expedition", "Explorer", "F-150", "F-250", "F-350", "Maverick", "Mustang", "Ranger", "Transit"],
        "Chevrolet": ["Blazer", "Camaro", "Colorado", "Corvette", "Equinox", "Malibu", "Silverado", "Suburban", "Tahoe", "Traverse", "Trax"],
        "BMW": ["2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "8 Series", "i4", "iX", "X1", "X3", "X5", "X7", "Z4"],
        "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "EQS"],
        "Nissan": ["Altima", "Armada", "Frontier", "Kicks", "Leaf", "Maxima", "Murano", "Pathfinder", "Rogue", "Sentra", "Titan", "Versa", "Z"],
        "Hyundai": ["Accent", "Elantra", "Ioniq", "Kona", "Palisade", "Santa Fe", "Sonata", "Tucson", "Venue"],
        "Kia": ["Carnival", "EV6", "Forte", "K5", "Niro", "Rio", "Seltos", "Sorento", "Soul", "Sportage", "Stinger", "Telluride"],
        "Volkswagen": ["Arteon", "Atlas", "Golf", "ID.4", "Jetta", "Passat", "Taos", "Tiguan"],
        "Tesla": ["Model 3", "Model S", "Model X", "Model Y", "Cybertruck"],
        "Jeep": ["Cherokee", "Compass", "Gladiator", "Grand Cherokee", "Renegade", "Wagoneer", "Wrangler"],
        "Dodge": ["Challenger", "Charger", "Durango", "Hornet"],
        "Ram": ["1500", "2500", "3500", "ProMaster"],
    }
    return models_by_make.get(make, ["Other"])

@api_router.get("/vehicles/categories", response_model=List[dict])
async def get_categories():
    return [
        {"id": "windshield", "name": "Windshield"},
        {"id": "door_glass", "name": "Door Glass"},
        {"id": "quarter_glass", "name": "Quarter Glass"},
        {"id": "vent_glass", "name": "Vent Glass"},
        {"id": "roof_glass", "name": "Roof Glass"},
        {"id": "back_glass", "name": "Back Glass"},
        {"id": "window_regulator", "name": "Window Regulator"},
        {"id": "side_mirror", "name": "Side Mirror"}
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
