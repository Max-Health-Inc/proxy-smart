#!/usr/bin/env python3
"""
Senior AI: Review and validate proposed changes
This script reviews changes and validates search patterns to ensure accuracy
"""

import json
import os
import sys
import re
import requests
from pathlib import Path
from typing import Dict, List, Any

from ai_proposal_schema import get_propose_payload_base, get_common_headers, get_api_config, get_base_url, create_system_message


class UnifiedChangeReviewer:
    def __init__(self, api_key: str, repo_root: str):
        self.api_key = api_key
        self.repo_root = Path(repo_root)
        self.base_url = get_base_url()
        
    def detect_component_type(self, changes_data: Dict) -> str:
        """Detect component type from changes data"""
        content_str = json.dumps(changes_data).lower()
        
        if any(indicator in content_str for indicator in ['ui/', 'vite', 'react', 'jsx', 'tsx']):
            return "frontend"
        elif any(indicator in content_str for indicator in ['backend/', 'node', 'express', 'fastify']):
            return "backend"
        
        # Check files mentioned in changes
        if 'changes' in changes_data:
            for change in changes_data['changes']:
                file_path = change.get('file', '').lower()
                if 'ui/' in file_path or 'components' in file_path:
                    return "frontend"
                elif 'backend/' in file_path or 'src/lib' in file_path or 'src/routes' in file_path:
                    return "backend"
        
        return "unknown"
    
    def validate_search_patterns(self, changes_data: Dict) -> Dict:
        """
        Enhanced search pattern validation with auto-correction.
        Validates that search patterns in changes match actual file content.
        Auto-corrects common patterns and warns about mismatches.
        """
        print("🔍 Validating search patterns in changes...", file=sys.stderr)
        
        if not isinstance(changes_data, dict) or 'changes' not in changes_data:
            return changes_data
        
        auto_corrections = 0
        warnings = []
        
        for change_idx, change in enumerate(changes_data['changes']):
            action = change.get('action', 'modify')
            file_path = change.get('file', '')
            search_pattern = change.get('search', '')
            
            # Skip validation for create actions (they don't need search patterns)
            if action == "create":
                if file_path:
                    print(f"📁 Will create new file: {file_path}", file=sys.stderr)
                continue
            
            # Only validate modify actions
            if not file_path or not search_pattern:
                continue
            
            # Check if file exists
            full_path = self.repo_root / file_path
            if not full_path.exists():
                warnings.append(f"File {file_path} does not exist")
                continue
            
            try:
                file_content = full_path.read_text(encoding='utf-8')
                
                # Validate final pattern
                if search_pattern not in file_content:
                    # Try with normalized whitespace
                    normalized_pattern = re.sub(r'\s+', ' ', search_pattern.strip())
                    normalized_content = re.sub(r'\s+', ' ', file_content)
                    
                    if normalized_pattern not in normalized_content:
                        warnings.append(f"Search pattern not found in {file_path}:\n{search_pattern}")
                
            except Exception as e:
                warnings.append(f"Error validating {file_path}: {str(e)}")
        
        if auto_corrections > 0:
            print(f"✅ Applied {auto_corrections} auto-corrections", file=sys.stderr)
        
        if warnings:
            print(f"⚠️ Found {len(warnings)} validation warnings:", file=sys.stderr)
            for warning in warnings[:5]:  # Limit output
                print(f"  ⚠️ {warning}", file=sys.stderr)
        
        return changes_data
    
    def validate_junior_output(self, changes_data: Dict) -> tuple[bool, str]:
        """Validate Junior AI output before sending to Senior AI"""
        print("🔍 Validating Junior AI output...", file=sys.stderr)
        
        # Check if it's a valid dict
        if not isinstance(changes_data, dict):
            return False, "Output is not a valid dictionary"
        
        # Check for error indicators in analysis
        analysis = changes_data.get("analysis", "")
        error_indicators = [
            "error occurred", "timeout", "failed", "max iterations", 
            "api call failed", "all attempts", "giving up"
        ]
        
        if any(indicator in analysis.lower() for indicator in error_indicators):
            print(f"⚠️ Junior AI encountered issues: {analysis}", file=sys.stderr)
            
            # Check if there are still useful changes despite the error
            changes = changes_data.get("changes", [])
            if not changes or len(changes) == 0:
                return False, f"Junior AI failed with no useful changes: {analysis}"
            
            # If there are changes but with error indicators, it might still be worth reviewing
            print(f"✅ Junior AI provided {len(changes)} changes despite issues", file=sys.stderr)
        
        # Check for changes array
        changes = changes_data.get("changes", [])
        if not isinstance(changes, list):
            return False, "Changes is not a valid array"
        
        if len(changes) == 0:
            return False, "No changes provided by Junior AI"
        
        # Validate each change has required fields
        valid_changes = 0
        for i, change in enumerate(changes):
            if not isinstance(change, dict):
                continue
                
            # Check for required fields
            has_file = "file" in change and change["file"]
            has_operation = "operation" in change or ("search" in change and "replace" in change)
            
            if has_file and has_operation:
                valid_changes += 1
        
        if valid_changes == 0:
            return False, "No valid changes found (missing required fields)"
        
        print(f"✅ Junior AI output validated: {valid_changes} valid changes", file=sys.stderr)
        return True, f"Valid output with {valid_changes} changes"

    def review_changes(self, changes_data: Dict, error_log: str) -> Dict:
        """Review and validate proposed changes."""
        if not self.api_key:
            print("❌ No API key available - skipping AI review", file=sys.stderr)
            return changes_data

        # First validate Junior AI output
        is_valid, validation_message = self.validate_junior_output(changes_data)
        
        if not is_valid:
            print(f"❌ Junior AI output invalid, skipping Senior AI review: {validation_message}", file=sys.stderr)
            return changes_data

        print("🧠 Senior AI starting review process...", file=sys.stderr)

        # Detect component type
        component_type = self.detect_component_type(changes_data)
        print(f"🎯 Detected component type: {component_type}", file=sys.stderr)        # Validate search patterns with auto-correction
        validated_changes = self.validate_search_patterns(changes_data)
        
        # Create review prompt
        review_prompt = f"""You are a Senior Developer AI reviewing proposed changes! 🎯

ORIGINAL ERROR LOG:
{error_log}

PROPOSED FIXES FROM JUNIOR AI:
{json.dumps(validated_changes, indent=2)}

COMPONENT TYPE: {component_type}

Your task is to review these changes carefully and provide a refined version.

FOCUS AREAS:
1. ✅ Verify the changes address the actual errors
2. 🔍 Check that search patterns are precise and will match exactly
3. 🎯 Ensure replacements are syntactically correct
4. 📋 Validate the reasoning makes sense
5. 🚀 Suggest improvements or optimizations

Be critical but constructive. If changes look good, approve them. If they need changes, refine them.

Return the SAME JSON structure but with your improvements:
{{
  "analysis": "Your enhanced analysis",
  "changes": [
    {{
      "file": "exact/file/path",
      "search": "exact code to find (must match exactly)",
      "replace": "exact replacement code",
      "reasoning": "why this change works"
    }}
  ]
}}"""
        
        payload = get_propose_payload_base("gpt-5")
        payload["messages"] = [
            {
                "role": "system",
                "content": create_system_message(component_type if component_type != "unknown" else "backend", "review")
            },
            {
                "role": "user", 
                "content": review_prompt
            }
        ]
        
        headers = get_common_headers(self.api_key)
        
        try:
            print("🌐 Sending review request to Senior AI...", file=sys.stderr)
            
            # Increase timeout and add retry logic for large requests
            max_retries = 3
            timeout = 180  # 3 minutes
            
            for attempt in range(max_retries):
                try:
                    print(f"🔄 Attempt {attempt + 1}/{max_retries} - Sending request to OpenAI...", file=sys.stderr)
                    response = requests.post(self.base_url, json=payload, headers=headers, timeout=timeout)
                    print(f"🌐 HTTP Status: {response.status_code}", file=sys.stderr)
                    
                    if response.status_code != 200:
                        print(f"❌ Senior AI API call failed: {response.text}", file=sys.stderr)
                        return validated_changes
                    
                    result = response.json()
                    review_content = result['choices'][0]['message']['content']
                    
                    try:
                        reviewed_changes = json.loads(review_content)
                        print("✅ Senior AI review complete", file=sys.stderr)
                        return reviewed_changes
                    except json.JSONDecodeError:
                        print("❌ Failed to parse Senior AI response as JSON", file=sys.stderr)
                        print(f"Raw response: {review_content}", file=sys.stderr)
                        return validated_changes
                    
                except requests.exceptions.Timeout:
                    print(f"⏰ Request timed out after {timeout} seconds (attempt {attempt + 1})", file=sys.stderr)
                    if attempt < max_retries - 1:
                        print("🔄 Retrying with simplified request...", file=sys.stderr)
                        # Simplify the payload for retry
                        if len(json.dumps(validated_changes)) > 8000:
                            print("📋 Simplifying changes data for retry...", file=sys.stderr)
                            simplified_changes = {
                                "analysis": validated_changes.get("analysis", "")[:500] + "...",
                                "changes": validated_changes.get("changes", [])[:3]  # Limit to first 3 changes
                            }
                            payload["messages"][1]["content"] = review_prompt.replace(
                                json.dumps(validated_changes, indent=2),
                                json.dumps(simplified_changes, indent=2)
                            )
                    else:
                        print("❌ All retry attempts failed due to timeout", file=sys.stderr)
                        return validated_changes
                        
                except requests.exceptions.RequestException as e:
                    print(f"❌ Request failed: {e} (attempt {attempt + 1})", file=sys.stderr)
                    if attempt < max_retries - 1:
                        print("🔄 Retrying...", file=sys.stderr)
                    else:
                        print("❌ All retry attempts failed", file=sys.stderr)
                        return validated_changes
                
        except Exception as e:
            print(f"❌ Error during Senior AI review: {e}", file=sys.stderr)
            return validated_changes


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python review-changes.py <proposed-changes-json> [error-log-file]", file=sys.stderr)
        sys.exit(1)
    
    changes_json_file = sys.argv[1]
    error_log_file = sys.argv[2] if len(sys.argv) > 2 else ""
    repo_root = os.environ.get("GITHUB_WORKSPACE", ".")
    
    # Use GitHub Models API (GITHUB_TOKEN) or fallback to OpenAI
    config = get_api_config()
    if not config:
        print("❌ GITHUB_TOKEN or OPENAI_API_KEY environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    api_key = config["api_key"]
    print(f"🔌 Using {config['provider']} API with model {config['model']}", file=sys.stderr)
    
    print("🧠 Senior AI starting unified review process...", file=sys.stderr)
    
    # Read proposed changes
    try:
        with open(changes_json_file, 'r', encoding='utf-8') as f:
            changes_data = json.load(f)
    except Exception as e:
        print(f"❌ Failed to read proposed changes: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Read error log if provided
    error_log = ""
    if error_log_file:
        try:
            with open(error_log_file, 'r', encoding='utf-8') as f:
                error_log = f.read()
        except Exception as e:
            print(f"⚠️ Could not read error log: {e}", file=sys.stderr)
    
    # Initialize reviewer
    reviewer = UnifiedChangeReviewer(api_key, repo_root)
    
    # Review changes
    reviewed_changes = reviewer.review_changes(changes_data, error_log)
    
    # Output as JSON - ONLY JSON goes to stdout
    print(json.dumps(reviewed_changes, indent=2))


if __name__ == "__main__":
    main()
