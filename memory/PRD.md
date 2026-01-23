# CarGlassHub - Auto Glass Marketplace PRD

## Overview
CarGlassHub is the nation's leading marketplace for automotive glass. Users can search thousands of windshields, door glass, and more from trusted sellers. Businesses can list their inventory online for free.

## User Personas
1. **Car Owners** - Search for auto glass parts by part number or vehicle
2. **Auto Glass Sellers** - List and sell auto glass inventory
3. **Installers** - Register as service providers for installation

## Core Requirements (Static)
- Part search by part number (NAGS, OEM, Interchange)
- Vehicle search by Year/Make/Model/Part Type
- User authentication (login/register)
- Seller registration and management
- Installer registration and directory
- Contact form functionality
- Browse parts listing

## What's Been Implemented (Jan 23, 2026)

### Backend (FastAPI + MongoDB)
- `/api/auth/register` - User registration
- `/api/auth/login` - User login with JWT
- `/api/auth/me` - Get current user
- `/api/sellers/register` - Seller registration
- `/api/sellers` - List sellers
- `/api/installers/register` - Installer registration  
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
- Login/Register page
- Seller registration page (/sell)
- Installer registration page (/installer-register)
- Contact Us page (/contact)
- Browse Parts page (/browse)
- Find Installers page (/installers)
- Footer with navigation
- Mobile responsive design

### Issues Fixed (Jan 23, 2026)
1. ✅ Seller registration - Now working
2. ✅ Login button - Now working
3. ✅ Contact us page - Now working
4. ✅ Made by Emergent badge - Removed
5. ✅ Register as Installer option - Added
6. ✅ Part search Year/Make/Model - Now working

## Tech Stack
- Frontend: React 19, Tailwind CSS, React Router
- Backend: FastAPI, Motor (MongoDB async driver)
- Database: MongoDB
- Authentication: JWT tokens

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✅

### P1 (High Priority)
- Seller dashboard for managing listings
- Image upload for parts
- Part inventory CRUD operations
- Email notifications for contact form

### P2 (Medium Priority)
- Advanced search filters
- Saved searches for users
- Reviews/ratings for sellers and installers
- Price comparison feature

### P3 (Future)
- Mobile app
- Real-time chat between buyers/sellers
- Integration with shipping providers
- Analytics dashboard for sellers

## Next Tasks
1. Add sample/seed data for parts to demonstrate search
2. Build seller dashboard for listing management
3. Add email integration for contact form
4. Implement part image upload
