#!/usr/bin/env python3
"""
Test script for CSV AI Viewer setup
This script helps verify that all components are working correctly.
"""

import requests
import json
import sys
import os

def test_flask_server():
    """Test if the Flask server is running"""
    try:
        response = requests.get('http://localhost:5000/api/health', timeout=5)
        if response.status_code == 200:
            print("✅ Flask server is running")
            return True
        else:
            print(f"❌ Flask server returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Flask server is not running. Please start it with: python app.py")
        return False
    except Exception as e:
        print(f"❌ Error testing Flask server: {e}")
        return False

def test_ollama():
    """Test if Ollama is available"""
    try:
        import ollama
        client = ollama.Client()
        models = client.list()
        
        if models['models']:
            print(f"✅ Ollama is available with {len(models['models'])} models")
            for model in models['models']:
                print(f"   - {model['name']}")
            return True
        else:
            print("⚠️  Ollama is running but no models are installed")
            print("   Please install a model with: ollama pull llama2")
            return False
    except Exception as e:
        print(f"❌ Ollama is not available: {e}")
        print("   Please install Ollama from: https://ollama.ai")
        return False

def test_dependencies():
    """Test if all required dependencies are installed"""
    required_packages = [
        'flask', 'flask_cors', 'pandas', 'numpy', 'ollama'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package} is installed")
        except ImportError:
            print(f"❌ {package} is missing")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\nPlease install missing packages with:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    return True

def test_files():
    """Test if required files exist"""
    required_files = ['app.py', 'index.html', 'styles.css', 'script.js']
    
    missing_files = []
    
    for file in required_files:
        if os.path.exists(file):
            print(f"✅ {file} exists")
        else:
            print(f"❌ {file} is missing")
            missing_files.append(file)
    
    if missing_files:
        print(f"\nMissing files: {missing_files}")
        return False
    
    return True

def main():
    print("🔍 Testing CSV AI Viewer Setup")
    print("=" * 40)
    
    tests = [
        ("File Check", test_files),
        ("Dependencies", test_dependencies),
        ("Flask Server", test_flask_server),
        ("Ollama", test_ollama)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n📋 Testing {test_name}...")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Error in {test_name}: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 40)
    print("📊 Test Results:")
    
    all_passed = True
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
        if not result:
            all_passed = False
    
    print("\n" + "=" * 40)
    
    if all_passed:
        print("🎉 All tests passed! Your setup is ready.")
        print("\nTo start the application:")
        print("1. Make sure Ollama is running")
        print("2. Run: python app.py")
        print("3. Open: http://localhost:5000")
    else:
        print("⚠️  Some tests failed. Please fix the issues above.")
        print("\nCommon solutions:")
        print("- Install missing packages: pip install -r requirements.txt")
        print("- Start Ollama: ollama serve")
        print("- Install a model: ollama pull llama2")
        print("- Start Flask server: python app.py")

if __name__ == "__main__":
    main() 