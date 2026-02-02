#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class CarGlassHubAPITester:
    def __init__(self, base_url="https://carfix-support.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.business_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test credentials from review request
        self.test_business = {
            "email": "testbiz2@example.com",
            "password": "testpass123",
            "business_name": "Quality Auto Glass",
            "contact_name": "Jane Doe",
            "phone": "555-987-6543",
            "city": "Phoenix",
            "state": "AZ",
            "zip_code": "85001"
        }
        
        self.existing_business = {
            "email": "john@abcautoglass.com",
            "password": "password123"
        }

    def log_test(self, name, success, details="", endpoint=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test_name": name,
            "endpoint": endpoint,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            details = ""
            
            if not success:
                details = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_data = response.json()
                    if 'detail' in error_data:
                        details += f" - {error_data['detail']}"
                except:
                    details += f" - {response.text[:200]}"
            
            self.log_test(name, success, details, endpoint)
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                return False, {}

        except requests.exceptions.RequestException as e:
            details = f"Request failed: {str(e)}"
            self.log_test(name, False, details, endpoint)
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        return self.run_test("Health Check", "GET", "", 200)

    def test_business_registration(self):
        """Test business registration"""
        # Use timestamp to avoid conflicts
        timestamp = int(time.time())
        test_email = f"testbiz_{timestamp}@example.com"
        
        success, response = self.run_test(
            "Business Registration",
            "POST", 
            "auth/register/business",
            200,
            data={
                "email": test_email,
                "password": "testpass123",
                "business_name": "Test Auto Glass Shop",
                "contact_name": "Test Business Owner",
                "phone": "555-123-4567",
                "city": "Phoenix",
                "state": "AZ",
                "zip_code": "85001"
            }
        )
        
        if success and 'token' in response:
            self.business_token = response['token']
            print(f"   ✅ Business registration successful, got token")
            return True, response
        return False, {}

    def test_business_login(self):
        """Test business login with existing credentials"""
        success, response = self.run_test(
            "Business Login",
            "POST",
            "auth/login", 
            200,
            data={
                "email": self.existing_business["email"],
                "password": self.existing_business["password"]
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"   ✅ Business login successful, token stored")
            return True, response
        return False, {}

    def test_installer_registration(self):
        """Test installer registration"""
        timestamp = int(time.time())
        installer_email = f"installer_{timestamp}@example.com"
        
        success, response = self.run_test(
            "Installer Registration", 
            "POST",
            "auth/register/installer",
            200,
            data={
                "email": installer_email,
                "password": "testpass123",
                "name": "Test Installer",
                "phone": "555-987-6543",
                "service_area": "Phoenix Metro Area",
                "city": "Phoenix",
                "state": "AZ", 
                "zip_code": "85001"
            }
        )
        return success, response

    def test_public_search(self):
        """Test public search functionality (no auth required)"""
        success, response = self.run_test(
            "Public Search - Part Number",
            "POST",
            "search",
            200,
            data={"part_number": "FW02537"}
        )
        
        # Verify location field is NOT in public search results
        if success and 'results' in response:
            for product in response['results']:
                if 'location' in product:
                    self.log_test("Public Search Location Privacy", False, "Location field found in public search results", "search")
                    return False, response
            self.log_test("Public Search Location Privacy", True, "Location field properly hidden from public search", "search")
        
        return success, response

    def test_vehicle_search(self):
        """Test vehicle-based search"""
        success, response = self.run_test(
            "Public Search - Vehicle",
            "POST", 
            "search",
            200,
            data={
                "year": 2020,
                "make": "Toyota",
                "model": "Camry"
            }
        )
        return success, response

    def test_forgot_password(self):
        """Test forgot password flow"""
        success, response = self.run_test(
            "Forgot Password Request",
            "POST",
            "auth/forgot-password",
            200,
            data=None,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        # Note: This endpoint expects form data, let's try with requests params
        try:
            url = f"{self.api_url}/auth/forgot-password"
            response = requests.post(url, params={"email": self.test_user["email"]}, timeout=30)
            
            success = response.status_code == 200
            details = ""
            
            if success:
                try:
                    data = response.json()
                    if 'reset_code' in data:
                        print(f"   ✅ Reset code received (demo mode): {data['reset_code']}")
                    else:
                        print(f"   ✅ Reset request processed")
                except:
                    pass
            else:
                details = f"Expected 200, got {response.status_code}"
                
            self.log_test("Forgot Password Request", success, details, "auth/forgot-password")
            return success, response.json() if success else {}
            
        except Exception as e:
            self.log_test("Forgot Password Request", False, str(e), "auth/forgot-password")
            return False, {}

    def test_part_search_by_number(self):
        """Test part search by part number"""
        success, response = self.run_test(
            "Part Search by Number",
            "POST",
            "parts/search/number",
            200,
            data={"part_number": "FW02537"}
        )
        return success, response

    def test_part_search_by_vehicle(self):
        """Test part search by vehicle"""
        success, response = self.run_test(
            "Part Search by Vehicle",
            "POST", 
            "parts/search/vehicle",
            200,
            data={
                "year": 2020,
                "make": "Toyota",
                "model": "Camry",
                "part_type": "Windshield"
            }
        )
        return success, response

    def test_contact_form(self):
        """Test contact form submission"""
        success, response = self.run_test(
            "Contact Form Submission",
            "POST",
            "contact",
            200,
            data={
                "name": "Test Contact",
                "email": "test@example.com",
                "subject": "Test Subject",
                "message": "This is a test message from automated testing."
            }
        )
        return success, response

    def test_get_installers(self):
        """Test get installers endpoint"""
        success, response = self.run_test(
            "Get Installers List",
            "GET",
            "installers",
            200
        )
        return success, response

    def test_get_parts(self):
        """Test get parts endpoint (browse parts)"""
        success, response = self.run_test(
            "Browse Parts",
            "GET", 
            "parts",
            200
        )
        return success, response

    def test_vehicle_data_endpoints(self):
        """Test vehicle data endpoints"""
        # Test years
        success1, _ = self.run_test("Get Vehicle Years", "GET", "vehicles/years", 200)
        
        # Test makes  
        success2, _ = self.run_test("Get Vehicle Makes", "GET", "vehicles/makes", 200)
        
        # Test models for Toyota
        success3, _ = self.run_test("Get Toyota Models", "GET", "vehicles/models/Toyota", 200)
        
        # Test part types
        success4, _ = self.run_test("Get Part Types", "GET", "vehicles/part-types", 200)
        
        return all([success1, success2, success3, success4])

    def test_authenticated_endpoints(self):
        """Test endpoints that require authentication"""
        if not self.token:
            print("⚠️  Skipping authenticated tests - no token available")
            return False
            
        # Test get current user
        success, _ = self.run_test("Get Current User", "GET", "auth/me", 200)
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting CarGlassHub API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Basic connectivity
        self.test_health_check()
        
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_seller_registration()
        self.test_installer_registration()
        self.test_forgot_password()
        
        # Authenticated endpoints
        self.test_authenticated_endpoints()
        
        # Search functionality
        self.test_part_search_by_number()
        self.test_part_search_by_vehicle()
        
        # Public endpoints
        self.test_contact_form()
        self.test_get_installers()
        self.test_get_parts()
        self.test_vehicle_data_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Save detailed results
        results = {
            "summary": {
                "total_tests": self.tests_run,
                "passed_tests": self.tests_passed,
                "failed_tests": self.tests_run - self.tests_passed,
                "success_rate": round(self.tests_passed/self.tests_run*100, 1),
                "test_timestamp": datetime.now().isoformat()
            },
            "test_results": self.test_results
        }
        
        with open('/app/test_reports/backend_api_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: /app/test_reports/backend_api_results.json")
        
        return self.tests_passed == self.tests_run

def main():
    tester = CarGlassHubAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())