# CarGlassHub - Auto Glass Marketplace PRD

## Overview
CarGlassHub is the nation's leading marketplace for automotive glass. Users can search thousands of windshields, door glass, and more from trusted sellers. Businesses can list their inventory online for free.

## User Personas
1. **Car Owners** - Search for auto glass parts by part number or vehicle
2. **Auto Glass Sellers** - List and sell auto glass inventory
3. **Installers** - Register as service providers for installation, showcase work portfolio

## Core Requirements (Static)
- Part search by part number (NAGS, OEM, Interchange)
- Vehicle search by Year/Make/Model/Part Type
- User authentication (login/register)
- Seller registration and management
- Installer registration and directory
- Contact form functionality
- Browse parts listing

## What's Been Implemented

### Backend (FastAPI + MongoDB)
- `/api/auth/register` - User registration
- `/api/auth/login` - User login with JWT (blocks deactivated accounts)
- `/api/auth/me` - Get current user
- `/api/auth/forgot-password` - Request password reset code
- `/api/auth/reset-password` - Reset password with code
- `/api/auth/change-password` - Change password (authenticated)
- `/api/auth/deactivate` - Deactivate account (authenticated)
- `/api/sellers/register` - Seller registration
- `/api/sellers` - List sellers
- `/api/installers/register` - Installer registration (with work_images support)
- `/api/installers` - Search installers by city/state
- `/api/contact` - Contact form submission
- `/api/parts` - Parts listing
- `/api/parts/search/number` - Search by part number
- `/api/parts/search/vehicle` - Search by vehicle
- `/api/vehicles/years` - Get available years
- `/api/vehicles/makes` - Get car makes
- `/api/vehicles/models/{make}` - Get models for make
- `/api/vehicles/part-types` - Get part types

### Frontend (React + Tailwind)
- Homepage with dual search (part number + vehicle)
- Login/Register page with "Forgot Password?" link
- Forgot Password page (2-step: email → code + new password)
- Account Settings page (change password, deactivate account)
- Seller registration page (/sell)
- Seller Dashboard with inventory management
- Installer registration page (/installer-register) with work portfolio upload (up to 5 images)
- Contact Us page (/contact)
- Browse Parts page (/browse)
- Find Installers page (/installers) - displays work portfolio images
- Footer with navigation
- Mobile responsive design

### Issues Fixed
1. ✅ Seller registration - Working
2. ✅ Login button - Working
3. ✅ Contact us page - Working
4. ✅ Made by Emergent badge - Removed
5. ✅ Register as Installer option - Added
6. ✅ Part search Year/Make/Model - Working
7. ✅ Account Deactivation - Implemented (Jan 23, 2026)
8. ✅ Forgot Password - Implemented with code-based reset (Jan 23, 2026)
9. ✅ Installer Work Portfolio - Up to 5 images upload (Jan 23, 2026)

## Tech Stack
- Frontend: React 19, Tailwind CSS, React Router
- Backend: FastAPI, Motor (MongoDB async driver)
- Database: MongoDB
- Authentication: JWT tokens
- Email: Resend (optional, demo mode available without API key)

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✅

### P1 (High Priority)
- Configure Resend API key for production email sending
- Refactor App.js into smaller components

### P2 (Medium Priority)
- Email notifications for contact form
- Advanced search filters
- Saved searches for users
- Price comparison feature

### P3 (Future)
- Mobile app
- Real-time chat between buyers/sellers
- Integration with shipping providers
- Analytics dashboard for sellers

## Database Schema

### users collection
```json
{
  "id": "uuid",
  "email": "string",
  "password": "hashed",
  "name": "string",
  "phone": "string",
  "user_type": "customer|seller|installer",
  "seller_id": "uuid (optional)",
  "installer_id": "uuid (optional)",
  "is_active": "boolean (default true)",
  "deactivated_at": "datetime (optional)",
  "created_at": "datetime"
}
```

### installers collection
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "business_name": "string",
  "contact_name": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "zip_code": "string",
  "services": ["array of strings"],
  "website": "string",
  "description": "string",
  "certifications": "string",
  "work_images": ["array of base64 images, max 5"],
  "verified": "boolean",
  "rating": "number",
  "review_count": "number",
  "is_active": "boolean",
  "created_at": "datetime"
}
```

### password_resets collection
```json
{
  "email": "string",
  "code": "6-digit string",
  "expires_at": "datetime",
  "created_at": "datetime"
}
```

## Notes
- Forgot Password works in DEMO MODE when Resend API key is not configured - shows code in response
- Account deactivation marks users as inactive and prevents login
- Installer work images are stored as base64 encoded strings (max 5 per installer)
