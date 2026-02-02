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
        
        # Test credentials
        self.timestamp = int(time.time())
        self.test_business = {
            "email": f"testbiz_{self.timestamp}@example.com",
            "password": "testpass123",
            "business_name": "Test Auto Glass",
            "contact_name": "John Doe",
            "phone": "555-1234",
            "city": "Los Angeles",
            "state": "CA",
            "zip_code": "90001"
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

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None):
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
                response = requests.get(url, headers=test_headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, params=params, timeout=30)
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
                    else:
                        details += f" - {error_data}"
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
        success, response = self.run_test(
            "Business Registration",
            "POST", 
            "auth/register/business",
            200,
            data=self.test_business
        )
        
        if success and 'token' in response:
            self.business_token = response['token']
            print(f"   ✅ Business registration successful, got token")
            return True, response
        return False, {}

    def test_installer_registration(self):
        """Test installer registration"""
        installer_data = {
            "email": f"installer_{self.timestamp}@example.com",
            "password": "testpass123",
            "name": "Test Installer",
            "phone": "555-987-6543",
            "service_area": "Los Angeles Metro",
            "city": "Los Angeles",
            "state": "CA",
            "zip_code": "90001",
            "experience": "5 years",
            "availability": "Mon-Fri 8am-6pm",
            "certifications": "NGA Certified"
        }
        
        success, response = self.run_test(
            "Installer Registration",
            "POST",
            "auth/register/installer",
            200,
            data=installer_data
        )
        return success, response

    def test_login(self):
        """Test login with business credentials"""
        success, response = self.run_test(
            "Business Login",
            "POST",
            "auth/login", 
            200,
            data={
                "email": self.test_business["email"],
                "password": self.test_business["password"]
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"   ✅ Login successful, token stored")
            return True, response
        return False, {}

    def test_forgot_password(self):
        """Test forgot password flow"""
        success, response = self.run_test(
            "Forgot Password Request",
            "POST",
            "auth/forgot-password",
            200,
            params={"email": self.test_business["email"]}
        )
        
        if success and 'reset_code' in response:
            print(f"   ✅ Reset code received: {response['reset_code']}")
            
            # Test password reset
            reset_success, reset_response = self.run_test(
                "Password Reset",
                "POST",
                "auth/reset-password",
                200,
                params={
                    "email": self.test_business["email"],
                    "code": response['reset_code'],
                    "new_password": "newpassword123"
                }
            )
            return reset_success, reset_response
        
        return success, response

    def test_public_search(self):
        """Test public search functionality"""
        # Test search by part number
        success1, response1 = self.run_test(
            "Search by Part Number",
            "POST",
            "search",
            200,
            data={"part_number": "FW02537"}
        )
        
        # Test search by vehicle
        success2, response2 = self.run_test(
            "Search by Vehicle",
            "POST", 
            "search",
            200,
            data={
                "year": 2020,
                "make": "Toyota",
                "model": "Camry",
                "category": "windshield"
            }
        )
        
        return success1 and success2, {}

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
                "phone": "555-123-4567",
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

    def test_vehicle_data_endpoints(self):
        """Test vehicle data endpoints"""
        # Test years
        success1, _ = self.run_test("Get Vehicle Years", "GET", "vehicles/years", 200)
        
        # Test makes  
        success2, _ = self.run_test("Get Vehicle Makes", "GET", "vehicles/makes", 200)
        
        # Test models for Toyota
        success3, _ = self.run_test("Get Toyota Models", "GET", "vehicles/models/Toyota", 200)
        
        # Test categories
        success4, _ = self.run_test("Get Categories", "GET", "vehicles/categories", 200)
        
        return all([success1, success2, success3, success4])

    def test_authenticated_endpoints(self):
        """Test endpoints that require authentication"""
        if not self.token:
            print("⚠️  Skipping authenticated tests - no token available")
            return False
            
        # Test get current user
        success1, _ = self.run_test("Get Current User", "GET", "auth/me", 200)
        
        # Test add product
        product_data = {
            "part_number": f"TEST{self.timestamp}",
            "category": "windshield",
            "year_start": 2020,
            "year_end": 2024,
            "make": "Toyota",
            "model": "Camry",
            "condition": "New",
            "price": 299.99,
            "quantity": 5,
            "listing_type": "public",
            "description": "Test product from automated testing"
        }
        
        success2, product_response = self.run_test(
            "Add Product",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        # Test get my inventory
        success3, _ = self.run_test("Get My Inventory", "GET", "products/my-inventory", 200)
        
        # Test product visibility toggle if product was created
        if success2 and 'product_id' in product_response:
            product_id = product_response['product_id']
            success4, _ = self.run_test(
                "Toggle Product Visibility",
                "PUT",
                f"products/{product_id}",
                200,
                data={"listing_type": "private"}
            )
            
            # Test delete product
            success5, _ = self.run_test(
                "Delete Product",
                "DELETE",
                f"products/{product_id}",
                200
            )
            
            return all([success1, success2, success3, success4, success5])
        
        return all([success1, success2, success3])

    def test_csv_template(self):
        """Test CSV template endpoint"""
        success, response = self.run_test(
            "Get CSV Template",
            "GET",
            "products/template",
            200
        )
        return success, response

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting CarGlassHub API Tests (Updated)")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Basic connectivity
        self.test_health_check()
        
        # Authentication tests
        self.test_business_registration()
        self.test_installer_registration()
        self.test_login()
        self.test_forgot_password()
        
        # Public endpoints
        self.test_public_search()
        self.test_contact_form()
        self.test_get_installers()
        self.test_vehicle_data_endpoints()
        self.test_csv_template()
        
        # Authenticated endpoints
        self.test_authenticated_endpoints()
        
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
        
        with open('/app/test_reports/backend_api_results_updated.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: /app/test_reports/backend_api_results_updated.json")
        
        return self.tests_passed == self.tests_run

def main():
    tester = CarGlassHubAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())