#!/usr/bin/env python3
import urllib.request
import urllib.parse
import urllib.error
import sys
import http.cookiejar

def test_login(username, password):
    """Test login functionality with provided credentials using standard library"""
    # Create cookie jar to handle sessions
    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
    urllib.request.install_opener(opener)
    
    # Prepare login data
    login_url = "http://localhost:5002/login"
    login_data = urllib.parse.urlencode({
        "username": username,
        "password": password
    }).encode('ascii')
    
    try:
        # First visit login page to get any needed cookies
        opener.open(login_url)
        
        # Submit login form
        response = opener.open(login_url, login_data)
        
        # Check the final URL after redirects
        final_url = response.geturl()
        print(f"Status code: {response.getcode()}")
        print(f"Final URL: {final_url}")
        
        # If we're still on the login page, login failed
        if "/login" in final_url:
            print("Login FAILED - Still on login page")
            return False
        else:
            print("Login SUCCESS - Redirected to:", final_url)
            return True
            
    except urllib.error.URLError as e:
        print(f"Error connecting to server: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python test_login.py username password")
        sys.exit(1)
        
    username = sys.argv[1]
    password = sys.argv[2]
    
    print(f"Testing login with username: {username}")
    result = test_login(username, password)
    
    if result:
        print("✓ Login successful! Fix verified.")
    else:
        print("✗ Login failed. Problem still exists.")