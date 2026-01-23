#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class CarGlassHubAPITester:
    def __init__(self, base_url="https://disappointed-jokes.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, response_data=None, error_msg=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            self.failed_tests.append({
                "test": name,
                "error": error_msg,
                "response": response_data
            })
            print(f"❌ {name} - FAILED: {error_msg}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
                if success:
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
            except:
                response_data = response.text[:200] if response.text else "No response body"

            if success:
                self.log_test(name, True, response_data)
                return True, response_data
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                if response_data:
                    error_msg += f" - {response_data}"
                self.log_test(name, False, response_data, error_msg)
                return False, response_data

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            self.log_test(name, False, None, error_msg)
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n" + "="*50)
        print("TESTING HEALTH ENDPOINTS")
        print("="*50)
        
        self.run_test("API Root", "GET", "", 200)
        self.run_test("Health Check", "GET", "health", 200)

    def test_vehicle_data_endpoints(self):
        """Test vehicle data endpoints"""
        print("\n" + "="*50)
        print("TESTING VEHICLE DATA ENDPOINTS")
        print("="*50)
        
        self.run_test("Get Years", "GET", "vehicles/years", 200)
        self.run_test("Get Makes", "GET", "vehicles/makes", 200)
        self.run_test("Get Toyota Models", "GET", "vehicles/models/Toyota", 200)
        self.run_test("Get Part Types", "GET", "vehicles/part-types", 200)

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION ENDPOINTS")
        print("="*50)
        
        # Test user registration
        test_user_data = {
            "email": f"testuser_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "testpass123",
            "name": "Test User"
        }
        
        success, response = self.run_test(
            "User Registration", 
            "POST", 
            "auth/register", 
            200, 
            test_user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained: {self.token[:20]}...")
        
        # Test user login
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        
        success, response = self.run_test(
            "User Login", 
            "POST", 
            "auth/login", 
            200, 
            login_data
        )
        
        # Test get current user
        if self.token:
            self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_seller_registration(self):
        """Test seller registration - This is one of the reported issues"""
        print("\n" + "="*50)
        print("TESTING SELLER REGISTRATION (REPORTED ISSUE #1)")
        print("="*50)
        
        seller_data = {
            "email": f"seller_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "test123456",
            "business_name": "Test Auto Glass Shop",
            "contact_name": "Test Seller",
            "phone": "555-1234",
            "address": "123 Test St",
            "city": "Test City",
            "state": "CA",
            "zip_code": "12345",
            "website": "https://test.com",
            "description": "Test description"
        }
        
        success, response = self.run_test(
            "Seller Registration", 
            "POST", 
            "sellers/register", 
            200, 
            seller_data
        )
        
        if success:
            print("   ✅ Seller registration is working correctly")
        else:
            print("   ❌ Seller registration is failing - this matches the reported issue")
        
        # Test get sellers
        self.run_test("Get Sellers List", "GET", "sellers", 200)

    def test_installer_registration(self):
        """Test installer registration"""
        print("\n" + "="*50)
        print("TESTING INSTALLER REGISTRATION (REPORTED ISSUE #5)")
        print("="*50)
        
        installer_data = {
            "email": f"installer_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "test123456",
            "business_name": "Test Glass Installers",
            "contact_name": "Test Installer",
            "phone": "555-5678",
            "address": "456 Install Ave",
            "city": "Install City",
            "state": "NY",
            "zip_code": "67890",
            "services": ["Windshield Replacement", "Mobile Service"],
            "website": "https://installer.com",
            "description": "Professional installation services",
            "certifications": "ASE Certified"
        }
        
        success, response = self.run_test(
            "Installer Registration", 
            "POST", 
            "installers/register", 
            200, 
            installer_data
        )
        
        if success:
            print("   ✅ Installer registration is working correctly")
        
        # Test get installers
        self.run_test("Get Installers List", "GET", "installers", 200)
        self.run_test("Search Installers by City", "GET", "installers?city=Install City", 200)

    def test_contact_endpoint(self):
        """Test contact form submission - This is one of the reported issues"""
        print("\n" + "="*50)
        print("TESTING CONTACT FORM (REPORTED ISSUE #3)")
        print("="*50)
        
        contact_data = {
            "name": "Test Contact",
            "email": "contact@test.com",
            "phone": "555-9999",
            "subject": "Test Subject",
            "message": "This is a test message from the API test"
        }
        
        success, response = self.run_test(
            "Contact Form Submission", 
            "POST", 
            "contact", 
            200, 
            contact_data
        )
        
        if success:
            print("   ✅ Contact form is working correctly")
        else:
            print("   ❌ Contact form is failing - this matches the reported issue")

    def test_parts_endpoints(self):
        """Test parts search functionality - This relates to reported issue #6"""
        print("\n" + "="*50)
        print("TESTING PARTS SEARCH (REPORTED ISSUE #6)")
        print("="*50)
        
        # Test get parts
        self.run_test("Get Parts List", "GET", "parts", 200)
        
        # Test part number search
        part_search_data = {
            "part_number": "TEST123"
        }
        
        success, response = self.run_test(
            "Part Number Search", 
            "POST", 
            "parts/search/number", 
            200, 
            part_search_data
        )
        
        # Test vehicle search
        vehicle_search_data = {
            "year": 2020,
            "make": "Toyota",
            "model": "Camry",
            "part_type": "Windshield"
        }
        
        success, response = self.run_test(
            "Vehicle Parts Search", 
            "POST", 
            "parts/search/vehicle", 
            200, 
            vehicle_search_data
        )
        
        if success:
            print("   ✅ Vehicle search functionality is working")
        else:
            print("   ❌ Vehicle search may have issues - this could relate to the reported issue")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting CarGlassHub API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("="*70)
        
        try:
            self.test_health_check()
            self.test_vehicle_data_endpoints()
            self.test_auth_endpoints()
            self.test_seller_registration()
            self.test_installer_registration()
            self.test_contact_endpoint()
            self.test_parts_endpoints()
            
        except KeyboardInterrupt:
            print("\n⚠️  Tests interrupted by user")
        except Exception as e:
            print(f"\n💥 Unexpected error during testing: {str(e)}")
        
        # Print summary
        print("\n" + "="*70)
        print("📊 TEST SUMMARY")
        print("="*70)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['test']}: {test['error']}")
        
        print("\n🎯 REPORTED ISSUES STATUS:")
        print("1. Seller Registration: Check results above")
        print("2. Login Button: Backend login API tested above")
        print("3. Contact Us Page: Backend contact API tested above")
        print("4. Made by Emergent Badge: Frontend issue - will test in UI")
        print("5. Register as Installer: Backend installer API tested above")
        print("6. Part Search Y/M/M: Backend vehicle search tested above")
        
        return len(self.failed_tests) == 0

def main():
    tester = CarGlassHubAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())