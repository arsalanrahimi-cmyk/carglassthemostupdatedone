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
    nags_number: str  # Required
    oem_number: str   # Required - OEM Part Number
    part_number: Optional[str] = None
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

# Message Models
class MessageCreate(BaseModel):
    recipient_id: str  # Business ID or User ID
    product_id: Optional[str] = None
    subject: str
    message: str

class MessageReply(BaseModel):
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
    
    # Validate NAGS number is provided
    if not product.nags_number or not product.nags_number.strip():
        raise HTTPException(status_code=400, detail="NAGS Number is required")
    
    # Validate OEM Part Number is provided
    if not product.oem_number or not product.oem_number.strip():
        raise HTTPException(status_code=400, detail="OEM Part Number is required")
    
    # Limit images to 3
    images = product.images[:3] if product.images else []
    
    product_doc = {
        "id": str(uuid.uuid4()),
        "business_id": current_user.get("business_id"),
        "user_id": current_user["id"],
        **product.model_dump(),
        "images": images,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    return {"success": True, "product_id": product_doc["id"]}

@api_router.post("/products/bulk", response_model=dict)
async def bulk_upload_products(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Bulk upload products via CSV file - very flexible, all fields optional"""
    if current_user["user_type"] not in ["business", "admin"]:
        raise HTTPException(status_code=403, detail="Only businesses can upload products")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    created_count = 0
    skipped_count = 0
    errors = []
    
    for idx, row in enumerate(reader):
        try:
            # Check if row has at least some data (any non-empty field)
            has_data = any(str(v).strip() for v in row.values() if v)
            if not has_data:
                skipped_count += 1
                continue
            
            # All fields are optional - just grab whatever is provided
            nags_number = row.get("nags_number", "").strip() or row.get("NAGS", "").strip() or row.get("nags", "").strip()
            oem_number = row.get("oem_number", "").strip() or row.get("OEM", "").strip() or row.get("oem", "").strip()
            part_number = row.get("part_number", "").strip() or row.get("part", "").strip() or row.get("Part", "").strip()
            
            # Generate a reference if no part numbers provided
            if not nags_number and not oem_number and not part_number:
                part_number = f"PART-{idx+1}"
            
            # Parse year fields flexibly
            year_start = None
            year_end = None
            year_val = row.get("year_start") or row.get("year") or row.get("Year") or ""
            if year_val:
                try:
                    year_start = int(str(year_val).strip())
                except:
                    pass
            year_end_val = row.get("year_end") or row.get("year_to") or ""
            if year_end_val:
                try:
                    year_end = int(str(year_end_val).strip())
                except:
                    pass
            # If only one year provided, use it for both
            if year_start and not year_end:
                year_end = year_start
            if year_end and not year_start:
                year_start = year_end
            
            # Parse price flexibly
            price = None
            price_val = row.get("price") or row.get("Price") or ""
            if price_val:
                try:
                    # Remove $ and commas
                    price_str = str(price_val).replace("$", "").replace(",", "").strip()
                    if price_str:
                        price = float(price_str)
                except:
                    pass
            
            # Parse quantity flexibly
            quantity = 1
            qty_val = row.get("quantity") or row.get("qty") or row.get("Qty") or row.get("Quantity") or ""
            if qty_val:
                try:
                    quantity = int(str(qty_val).strip())
                except:
                    quantity = 1
            
            product_doc = {
                "id": str(uuid.uuid4()),
                "business_id": current_user.get("business_id"),
                "user_id": current_user["id"],
                "nags_number": nags_number or None,
                "oem_number": oem_number or None,
                "part_number": part_number or None,
                "interchange_number": (row.get("interchange_number") or row.get("interchange") or "").strip() or None,
                "category": (row.get("category") or row.get("Category") or row.get("type") or "").strip() or None,
                "year_start": year_start,
                "year_end": year_end,
                "make": (row.get("make") or row.get("Make") or "").strip() or None,
                "model": (row.get("model") or row.get("Model") or "").strip() or None,
                "glass_type": (row.get("glass_type") or "").strip() or None,
                "condition": (row.get("condition") or row.get("Condition") or "").strip() or None,
                "price": price,
                "call_for_price": str(row.get("call_for_price", "")).lower() in ["true", "yes", "1", "call"],
                "quantity": quantity,
                "location": (row.get("location") or row.get("Location") or row.get("loc") or "").strip() or None,
                "description": (row.get("description") or row.get("Description") or row.get("notes") or row.get("Notes") or "").strip() or None,
                "listing_type": (row.get("listing_type") or row.get("visibility") or "public").strip().lower() or "public",
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
        "skipped_empty_rows": skipped_count,
        "error_count": len(errors),
        "errors": errors[:10],
        "message": f"Successfully uploaded {created_count} products!"
    }

@api_router.get("/products/template")
async def get_csv_template():
    """Download CSV template for bulk upload - all fields optional!"""
    from fastapi.responses import StreamingResponse
    
    # Create simple, friendly CSV content
    csv_content = """nags_number,oem_number,part_number,make,model,year,category,condition,price,quantity,location,description
FW02537,43R-001025,,Toyota,Camry,2020,windshield,New,150.00,5,Warehouse A,Front windshield
DW01456,43R-002030,,Honda,Accord,2022,door_glass,Used,75.00,3,Shelf B2,Driver side
,,,Ford,F-150,2021,back_glass,OEM,,2,Storage 5,Call for price
ABC123,,,,,,,New,50,10,,Generic part"""
    
    # Return as downloadable CSV file
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=carglasshub_inventory_template.csv"}
    )

@api_router.get("/products/template-info")
async def get_csv_template_info():
    """Get CSV template column information"""
    return {
        "message": "ALL FIELDS ARE OPTIONAL! Just fill in what you have.",
        "columns": {
            "nags_number": "NAGS part number (optional)",
            "oem_number": "OEM part number (optional)", 
            "part_number": "Your internal part number (optional)",
            "make": "Vehicle make - Toyota, Honda, Ford, etc.",
            "model": "Vehicle model - Camry, Accord, F-150, etc.",
            "year": "Vehicle year (or use year_start and year_end for ranges)",
            "category": "windshield, door_glass, back_glass, quarter_glass, etc.",
            "condition": "New, Used, OEM, Aftermarket",
            "price": "Price in dollars (leave empty for 'Call for Price')",
            "quantity": "Number in stock (defaults to 1)",
            "location": "Where you store it (private - only you see this)",
            "description": "Any notes about the part"
        },
        "tips": [
            "You can use just ONE column if that's all you have",
            "Empty rows are automatically skipped",
            "Price can include $ sign - we'll handle it",
            "Column names are flexible: 'Make' or 'make' both work"
        ]
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
    
    # Exclude location field from public search results
    products = await db.products.find(query, {"_id": 0, "location": 0}).limit(100).to_list(100)
    
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
    # Exclude location field from public product details
    product = await db.products.find_one({"id": product_id, "listing_type": "public"}, {"_id": 0, "location": 0})
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
    messages_count = await db.messages.count_documents({})
    unread_messages = await db.messages.count_documents({"is_read": False})
    
    return {
        "total_users": users_count,
        "total_businesses": businesses_count,
        "total_installers": installers_count,
        "total_products": products_count,
        "public_listings": public_products,
        "new_contacts": contacts_count,
        "total_messages": messages_count,
        "unread_messages": unread_messages
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

# ==================== MESSAGING ROUTES ====================

@api_router.post("/messages", response_model=dict)
async def send_message(msg: MessageCreate, current_user: dict = Depends(get_current_user)):
    """Send a message to a business/seller"""
    # Get recipient info
    recipient = await db.users.find_one({"id": msg.recipient_id}, {"_id": 0})
    if not recipient:
        # Try finding by business_id
        business = await db.businesses.find_one({"id": msg.recipient_id}, {"_id": 0})
        if business:
            recipient = await db.users.find_one({"business_id": msg.recipient_id}, {"_id": 0})
    
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Get sender info
    sender_name = current_user.get("name", "Unknown")
    sender_business = None
    if current_user.get("business_id"):
        sender_business = await db.businesses.find_one({"id": current_user["business_id"]}, {"_id": 0, "business_name": 1})
    
    message_doc = {
        "id": str(uuid.uuid4()),
        "conversation_id": str(uuid.uuid4()),
        "sender_id": current_user["id"],
        "sender_name": sender_name,
        "sender_email": current_user.get("email"),
        "sender_business": sender_business.get("business_name") if sender_business else None,
        "recipient_id": recipient["id"],
        "recipient_name": recipient.get("name"),
        "product_id": msg.product_id,
        "subject": msg.subject,
        "message": msg.message,
        "is_read": False,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Get product info if provided
    if msg.product_id:
        product = await db.products.find_one({"id": msg.product_id}, {"_id": 0, "nags_number": 1, "oem_number": 1, "make": 1, "model": 1})
        if product:
            message_doc["product_info"] = product
    
    await db.messages.insert_one(message_doc)
    return {"success": True, "message_id": message_doc["id"], "message": "Message sent successfully"}

@api_router.get("/messages/inbox", response_model=List[dict])
async def get_inbox(current_user: dict = Depends(get_current_user)):
    """Get messages received by the current user"""
    messages = await db.messages.find(
        {"recipient_id": current_user["id"], "status": "active"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return messages

@api_router.get("/messages/sent", response_model=List[dict])
async def get_sent_messages(current_user: dict = Depends(get_current_user)):
    """Get messages sent by the current user"""
    messages = await db.messages.find(
        {"sender_id": current_user["id"], "status": "active"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return messages

@api_router.get("/messages/unread-count", response_model=dict)
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread messages"""
    count = await db.messages.count_documents({"recipient_id": current_user["id"], "is_read": False, "status": "active"})
    return {"unread_count": count}

@api_router.put("/messages/{message_id}/read", response_model=dict)
async def mark_message_read(message_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a message as read"""
    result = await db.messages.update_one(
        {"id": message_id, "recipient_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"success": True}

@api_router.post("/messages/{message_id}/reply", response_model=dict)
async def reply_to_message(message_id: str, reply: MessageReply, current_user: dict = Depends(get_current_user)):
    """Reply to a message"""
    original = await db.messages.find_one({"id": message_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Determine recipient (swap sender/recipient)
    if original["sender_id"] == current_user["id"]:
        recipient_id = original["recipient_id"]
        recipient_name = original["recipient_name"]
    else:
        recipient_id = original["sender_id"]
        recipient_name = original["sender_name"]
    
    sender_name = current_user.get("name", "Unknown")
    sender_business = None
    if current_user.get("business_id"):
        sender_business = await db.businesses.find_one({"id": current_user["business_id"]}, {"_id": 0, "business_name": 1})
    
    reply_doc = {
        "id": str(uuid.uuid4()),
        "conversation_id": original.get("conversation_id", original["id"]),
        "parent_id": message_id,
        "sender_id": current_user["id"],
        "sender_name": sender_name,
        "sender_email": current_user.get("email"),
        "sender_business": sender_business.get("business_name") if sender_business else None,
        "recipient_id": recipient_id,
        "recipient_name": recipient_name,
        "product_id": original.get("product_id"),
        "product_info": original.get("product_info"),
        "subject": f"Re: {original['subject']}",
        "message": reply.message,
        "is_read": False,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.messages.insert_one(reply_doc)
    return {"success": True, "message_id": reply_doc["id"]}

@api_router.delete("/messages/{message_id}", response_model=dict)
async def delete_message(message_id: str, current_user: dict = Depends(get_current_user)):
    """Delete (archive) a message"""
    result = await db.messages.update_one(
        {"id": message_id, "$or": [{"sender_id": current_user["id"]}, {"recipient_id": current_user["id"]}]},
        {"$set": {"status": "deleted"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"success": True}

# ==================== ADMIN MESSAGE ROUTES ====================

@api_router.get("/admin/messages", response_model=List[dict])
async def admin_get_all_messages(admin: dict = Depends(require_admin)):
    """Get all messages (admin only)"""
    messages = await db.messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return messages

@api_router.delete("/admin/messages/{message_id}", response_model=dict)
async def admin_delete_message(message_id: str, admin: dict = Depends(require_admin)):
    """Permanently delete a message (admin only)"""
    result = await db.messages.delete_one({"id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"success": True}

@api_router.put("/admin/contacts/{contact_id}/status", response_model=dict)
async def admin_update_contact_status(contact_id: str, status: str, admin: dict = Depends(require_admin)):
    """Update contact message status (new, read, resolved)"""
    result = await db.contacts.update_one(
        {"id": contact_id},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True}

@api_router.delete("/admin/users/{user_id}", response_model=dict)
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    """Delete a user and their associated data (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete associated business if exists
    if user.get("business_id"):
        await db.businesses.delete_one({"id": user["business_id"]})
        await db.products.delete_many({"business_id": user["business_id"]})
    
    # Delete associated installer if exists
    if user.get("installer_id"):
        await db.installers.delete_one({"id": user["installer_id"]})
    
    # Delete user's messages
    await db.messages.delete_many({"$or": [{"sender_id": user_id}, {"recipient_id": user_id}]})
    
    # Delete user
    await db.users.delete_one({"id": user_id})
    
    return {"success": True, "message": "User and associated data deleted"}

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
