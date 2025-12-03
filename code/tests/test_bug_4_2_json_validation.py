#!/usr/bin/env python3
"""
Test suite for BUG #4.2 - JSON Content Validation
Validates JSON validation functions against known test cases
"""

import json
import io
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


def test_json_structure_validation():
    """Test JSON structure validation function"""
    from server_api import validate_json_structure
    
    print("Testing validate_json_structure()...")
    
    # Test 1: Valid simple object
    data = {"name": "test", "value": 123}
    is_valid, error = validate_json_structure(data)
    assert is_valid, f"Simple object should be valid: {error}"
    print("  ✓ Valid simple object")
    
    # Test 2: Valid array
    data = [1, 2, 3, "test"]
    is_valid, error = validate_json_structure(data)
    assert is_valid, f"Array should be valid: {error}"
    print("  ✓ Valid array")
    
    # Test 3: Valid nested object (shallow)
    data = {"a": {"b": {"c": "deep"}}}
    is_valid, error = validate_json_structure(data)
    assert is_valid, f"Nested object should be valid: {error}"
    print("  ✓ Valid nested object (3 levels)")
    
    # Test 4: Invalid - too deeply nested
    data = {"a": {"b": {"c": {"d": {"e": "too deep"}}}}}
    depth_test = data
    for i in range(60):  # Create 60-level deep object
        depth_test = {"x": depth_test}
    
    is_valid, error = validate_json_structure(depth_test)
    assert not is_valid, "Deep nesting should be invalid"
    assert error and "depth exceeds maximum" in error.lower()
    print("  ✓ Invalid - too deeply nested (60 levels)")
    
    # Test 5: Invalid - too many keys
    data = {f"key_{i}": i for i in range(15000)}  # 15k keys
    is_valid, error = validate_json_structure(data)
    assert not is_valid, "Too many keys should be invalid"
    assert error and "key count exceeds" in error.lower()
    print("  ✓ Invalid - too many keys (15,000)")
    
    # Test 6: Invalid - string too long
    data = {"text": "x" * (2 * 1024 * 1024)}  # 2MB string
    is_valid, error = validate_json_structure(data)
    assert not is_valid, "Long string should be invalid"
    assert error and "exceeds maximum length" in error.lower()
    print("  ✓ Invalid - string too long (2MB)")
    
    # Test 7: Valid primitives
    for value in [123, 45.67, True, False, None]:
        is_valid, error = validate_json_structure(value)
        assert is_valid, f"Primitive {type(value)} should be valid: {error}"
    print("  ✓ Valid - all primitive types")
    
    # Test 8: Invalid type
    class CustomClass:
        pass
    
    data = CustomClass()
    is_valid, error = validate_json_structure(data)
    assert not is_valid, "Custom class should be invalid"
    assert error and "unsupported" in error.lower()
    print("  ✓ Invalid - custom class type")
    
    print("✅ validate_json_structure() tests PASSED\n")


def test_json_parsing():
    """Test JSON parsing and validation"""
    from server_api import parse_and_validate_json
    
    print("Testing parse_and_validate_json()...")
    
    # Test 1: Valid JSON
    json_data = json.dumps({"name": "test", "value": 123})
    stream = io.BytesIO(json_data.encode("utf-8"))
    is_valid, data, error = parse_and_validate_json(stream)
    assert is_valid, f"Valid JSON should parse: {error}"
    assert data == {"name": "test", "value": 123}
    print("  ✓ Valid JSON parsing")
    
    # Test 2: Empty file
    stream = io.BytesIO(b"")
    is_valid, data, error = parse_and_validate_json(stream)
    assert not is_valid, "Empty file should be invalid"
    assert error and "empty" in error.lower()
    print("  ✓ Empty file rejected")
    
    # Test 3: Invalid UTF-8
    stream = io.BytesIO(b"\\xff\\xfe")  # Invalid UTF-8
    is_valid, data, error = parse_and_validate_json(stream)
    assert not is_valid, "Invalid UTF-8 should be rejected"
    assert error and ("utf-8" in error.lower() or "encoding" in error.lower())
    print("  ✓ Invalid UTF-8 rejected")
    
    # Test 4: Malformed JSON
    json_data = b'{"invalid": json}'  # Missing quotes
    stream = io.BytesIO(json_data)
    is_valid, data, error = parse_and_validate_json(stream)
    assert not is_valid, "Malformed JSON should be rejected"
    assert error and "invalid json" in error.lower()
    print("  ✓ Malformed JSON rejected")
    
    # Test 5: JSON with error location
    json_data = b'{"key": "value", invalid}'
    stream = io.BytesIO(json_data)
    is_valid, data, error = parse_and_validate_json(stream)
    assert not is_valid, "Invalid JSON should report location"
    assert error and ("line" in error.lower() or "col" in error.lower())
    print("  ✓ JSON error location reported")
    
    # Test 6: Valid JSON array
    json_data = json.dumps([1, 2, 3, "test"])
    stream = io.BytesIO(json_data.encode("utf-8"))
    is_valid, data, error = parse_and_validate_json(stream)
    assert is_valid, f"Valid array should parse: {error}"
    print("  ✓ Valid array parsing")
    
    # Test 7: Size limit
    large_json = json.dumps({"data": "x" * (150 * 1024 * 1024)})
    stream = io.BytesIO(large_json.encode("utf-8"))
    is_valid, data, error = parse_and_validate_json(stream, max_size=100*1024*1024)
    assert not is_valid, "File over size limit should be rejected"
    assert error and "exceeds maximum size" in error.lower()
    print("  ✓ Size limit enforced")
    
    print("✅ parse_and_validate_json() tests PASSED\n")


def test_edge_cases():
    """Test edge cases and boundary conditions"""
    from server_api import validate_json_structure, parse_and_validate_json
    
    print("Testing edge cases...")
    
    # Test 1: Exactly at limits (should pass)
    data = {f"key_{i}": i for i in range(10000)}  # Exactly 10k keys
    is_valid, error = validate_json_structure(data)
    assert is_valid, f"Data at limit should be valid: {error}"
    print("  ✓ Exactly at key limit (10,000)")
    
    # Test 2: Just over limits (should fail)
    data = {f"key_{i}": i for i in range(10001)}  # 10k + 1
    is_valid, error = validate_json_structure(data)
    assert not is_valid, "Data over limit should be invalid"
    print("  ✓ Just over key limit (10,001)")
    
    # Test 3: Mixed nested and array structures
    data = {
        "users": [
            {"name": "Alice", "id": 1},
            {"name": "Bob", "id": 2},
        ],
        "meta": {
            "count": 2,
            "active": True
        }
    }
    is_valid, error = validate_json_structure(data)
    assert is_valid, f"Mixed structure should be valid: {error}"
    print("  ✓ Mixed nested/array structure")
    
    # Test 4: Unicode characters
    data = {"emoji": "😀🎉", "chinese": "你好"}
    json_data = json.dumps(data)
    stream = io.BytesIO(json_data.encode("utf-8"))
    is_valid, parsed, error = parse_and_validate_json(stream)
    assert is_valid, f"Unicode JSON should be valid: {error}"
    print("  ✓ Unicode characters handled")
    
    # Test 5: Escaped characters
    data = {"escaped": "line1\\nline2\\ttab"}
    is_valid, error = validate_json_structure(data)
    assert is_valid, f"Escaped chars should be valid: {error}"
    print("  ✓ Escaped characters handled")
    
    # Test 6: Zero and negative numbers
    data = {"zero": 0, "negative": -123, "float": -45.67}
    is_valid, error = validate_json_structure(data)
    assert is_valid, f"Numbers should be valid: {error}"
    print("  ✓ Zero and negative numbers")
    
    # Test 7: Empty structures
    data = {"empty_dict": {}, "empty_array": []}
    is_valid, error = validate_json_structure(data)
    assert is_valid, f"Empty structures should be valid: {error}"
    print("  ✓ Empty structures")
    
    # Test 8: Null values in structures
    data = {"value": None, "array": [1, None, 3]}
    is_valid, error = validate_json_structure(data)
    assert is_valid, f"Null values should be valid: {error}"
    print("  ✓ Null values handled")
    
    print("✅ Edge case tests PASSED\n")


def main():
    """Run all test suites"""
    print("=" * 60)
    print("BUG #4.2 - JSON Content Validation Test Suite")
    print("=" * 60)
    print()
    
    try:
        test_json_structure_validation()
        test_json_parsing()
        test_edge_cases()
        
        print("=" * 60)
        print("🎉 ALL TESTS PASSED!")
        print("=" * 60)
        return 0
    
    except AssertionError as e:
        print()
        print("=" * 60)
        print(f"❌ TEST FAILED: {e}")
        print("=" * 60)
        return 1
    
    except Exception as e:
        print()
        print("=" * 60)
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
