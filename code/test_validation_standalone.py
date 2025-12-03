#!/usr/bin/env python3
"""
Test suite for BUG #4.2 - JSON Content Validation
Standalone validation without Flask dependency
"""

import json
import io
import sys

# Import as standalone modules
MAX_JSON_DEPTH = 50
MAX_JSON_KEYS = 10000
MAX_STRING_LENGTH = 1024 * 1024
CHUNK_SIZE = 1024 * 1024


def validate_json_structure(data, depth=0, key_count=0):
    """Validate JSON structure against DoS vectors"""
    if depth > MAX_JSON_DEPTH:
        return False, f"JSON depth exceeds maximum ({MAX_JSON_DEPTH})"
    
    if isinstance(data, dict):
        for key, value in data.items():
            if len(str(key)) > MAX_STRING_LENGTH:
                return False, "JSON key exceeds maximum length"
            
            key_count += 1
            if key_count > MAX_JSON_KEYS:
                return False, f"JSON key count exceeds maximum ({MAX_JSON_KEYS})"
            
            is_valid, error = validate_json_structure(value, depth + 1, key_count)
            if not is_valid:
                return False, error
    
    elif isinstance(data, list):
        if len(data) > MAX_JSON_KEYS:
            return False, f"JSON array size exceeds maximum ({MAX_JSON_KEYS})"
        
        for item in data:
            is_valid, error = validate_json_structure(item, depth + 1, key_count)
            if not is_valid:
                return False, error
    
    elif isinstance(data, str):
        if len(data) > MAX_STRING_LENGTH:
            return False, "JSON string value exceeds maximum length"
    
    elif isinstance(data, (int, float, bool, type(None))):
        pass
    else:
        return False, f"Unsupported JSON type: {type(data).__name__}"
    
    return True, None


def parse_and_validate_json(file_stream, max_size=None):
    """Parse and validate JSON from stream"""
    if max_size is None:
        max_size = 100 * 1024 * 1024
    
    try:
        content = b""
        bytes_read = 0
        
        while True:
            chunk = file_stream.read(CHUNK_SIZE)
            if not chunk:
                break
            
            bytes_read += len(chunk)
            if bytes_read > max_size:
                return False, None, f"JSON content exceeds maximum size ({max_size} bytes)"
            
            content += chunk
        
        if not content:
            return False, None, "Empty JSON file"
        
        try:
            json_str = content.decode("utf-8")
        except UnicodeDecodeError:
            return False, None, "Invalid UTF-8 encoding in JSON file"
        
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            return False, None, f"Invalid JSON: {e.msg} at line {e.lineno}, col {e.colno}"
        except Exception as e:
            return False, None, f"JSON parsing error: {str(e)}"
        
        is_valid, error = validate_json_structure(data)
        if not is_valid:
            return False, None, error
        
        return True, data, None
    
    except Exception as e:
        return False, None, f"Unexpected error: {str(e)}"


def test_json_structure_validation():
    """Test JSON structure validation function"""
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
    depth_test = {"x": "value"}
    for i in range(60):
        depth_test = {"x": depth_test}
    
    is_valid, error = validate_json_structure(depth_test)
    assert not is_valid, "Deep nesting should be invalid"
    assert error and "depth exceeds maximum" in error.lower()
    print("  ✓ Invalid - too deeply nested (60 levels)")
    
    # Test 5: Invalid - too many keys
    data = {f"key_{i}": i for i in range(15000)}
    is_valid, error = validate_json_structure(data)
    assert not is_valid, "Too many keys should be invalid"
    assert error and "key count exceeds" in error.lower()
    print("  ✓ Invalid - too many keys (15,000)")
    
    # Test 6: Invalid - string too long
    data = {"text": "x" * (2 * 1024 * 1024)}
    is_valid, error = validate_json_structure(data)
    assert not is_valid, "Long string should be invalid"
    assert error and "exceeds maximum length" in error.lower()
    print("  ✓ Invalid - string too long (2MB)")
    
    # Test 7: Valid primitives
    for value in [123, 45.67, True, False, None]:
        is_valid, error = validate_json_structure(value)
        assert is_valid, f"Primitive {type(value)} should be valid: {error}"
    print("  ✓ Valid - all primitive types")
    
    print("✅ validate_json_structure() tests PASSED\n")


def test_json_parsing():
    """Test JSON parsing and validation"""
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
    stream = io.BytesIO(bytes([0xff, 0xfe]))
    is_valid, data, error = parse_and_validate_json(stream)
    assert not is_valid, "Invalid UTF-8 should be rejected"
    assert error and ("utf-8" in error.lower() or "encoding" in error.lower())
    print("  ✓ Invalid UTF-8 rejected")
    
    # Test 4: Malformed JSON
    json_data = b'{"invalid": json}'
    stream = io.BytesIO(json_data)
    is_valid, data, error = parse_and_validate_json(stream)
    assert not is_valid, "Malformed JSON should be rejected"
    assert error and "invalid json" in error.lower()
    print("  ✓ Malformed JSON rejected")
    
    # Test 5: Valid JSON array
    json_data = json.dumps([1, 2, 3, "test"])
    stream = io.BytesIO(json_data.encode("utf-8"))
    is_valid, data, error = parse_and_validate_json(stream)
    assert is_valid, f"Valid array should parse: {error}"
    print("  ✓ Valid array parsing")
    
    print("✅ parse_and_validate_json() tests PASSED\n")


def test_edge_cases():
    """Test edge cases and boundary conditions"""
    print("Testing edge cases...")
    
    # Test 1: Exactly at limits (should pass)
    data = {f"key_{i}": i for i in range(10000)}
    is_valid, error = validate_json_structure(data)
    assert is_valid, f"Data at limit should be valid: {error}"
    print("  ✓ Exactly at key limit (10,000)")
    
    # Test 2: Just over limits (should fail)
    data = {f"key_{i}": i for i in range(10001)}
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
    
    # Test 5: Empty structures
    data = {"empty_dict": {}, "empty_array": []}
    is_valid, error = validate_json_structure(data)
    assert is_valid, f"Empty structures should be valid: {error}"
    print("  ✓ Empty structures")
    
    # Test 6: Null values in structures
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
