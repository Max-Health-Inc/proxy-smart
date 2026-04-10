#!/usr/bin/env python3
"""
Junior AI: Propose Code Implementations / Changes / Changes 
This script analyzes an input (error logs, instructions) using MCP-enhanced exploration
And proposes code changes based on the analysis.
"""

import json
import os
import sys
import re
import subprocess
import pickle
import hashlib
import time
import inspect
from pathlib import Path
from typing import Dict, List, Any

# Load environment variables from .env file (for local development)
# In GitHub workflows, environment variables are set directly
try:
    from dotenv import load_dotenv
    # Load .env from the script's directory
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"🔧 Loaded local environment from {env_path}", file=sys.stderr)
    else:
        print("📝 No .env file found, using system environment variables", file=sys.stderr)
except ImportError:
    print("📝 python-dotenv not installed, using system environment variables", file=sys.stderr)
except Exception as e:
    print(f"⚠️ Failed to load .env file: {e}, using system environment variables", file=sys.stderr)

import requests
from ai_proposal_schema import get_propose_payload_base, get_common_headers, create_system_message, create_user_content_base

def make_api_call_with_retry(url: str, payload: dict, headers: dict, max_retries: int = 3, timeout: int = 240) -> requests.Response:
    """Make an API call with automatic retry logic for rate limits"""
    retry_count = 0
    
    while retry_count < max_retries:
        response = requests.post(url, json=payload, headers=headers, timeout=timeout)
        
        if response.status_code == 429:  # Rate limit exceeded
            retry_count += 1
            if retry_count < max_retries:
                # Extract wait time from error message or use exponential backoff
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', {}).get('message', '')
                    # Look for "Please try again in 630ms" or "630s" pattern
                    wait_match = re.search(r'try again in (\d+(?:\.\d+)?)([ms]+)', error_msg)
                    if wait_match:
                        wait_time = float(wait_match.group(1))
                        unit = wait_match.group(2)
                        if unit == 'ms':
                            wait_time = wait_time / 1000  # Convert to seconds
                        elif unit == 's':
                            pass  # Already in seconds
                        wait_time = max(wait_time, 1)  # Minimum 1 second
                    else:
                        # Exponential backoff: 2^retry_count seconds + some jitter
                        wait_time = (2 ** retry_count) + (retry_count * 0.5)
                except:
                    wait_time = (2 ** retry_count) + (retry_count * 0.5)
                
                print(f"⏳ Rate limit hit. Waiting {wait_time:.1f}s before retry {retry_count}/{max_retries}", file=sys.stderr)
                time.sleep(wait_time)
                continue
            else:
                print(f"❌ Rate limit exceeded after {max_retries} retries", file=sys.stderr)
                break
        else:
            # Success or non-rate-limit error, return response
            break
    
    return response

# Import Friend AI with proper module name handling
import sys
import importlib.util
friend_ai_path = Path(__file__).parent / "friend-ai.py"
spec = importlib.util.spec_from_file_location("friend_ai", friend_ai_path)
friend_ai_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(friend_ai_module)
CollaborationSession = friend_ai_module.CollaborationSession


def load_base_tools() -> List[Dict]:
    """Load base tools schema from JSON file"""
    try:
        base_tools_path = Path(__file__).parent / "base-tools.json"
        with open(base_tools_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️ Failed to load base tools from JSON: {e}", file=sys.stderr)
        return []


class CodeExplorerMCP:
    """MCP tools for interactive code exploration with dynamic tool creation, persistence, and schema generation"""
    
    MAX_CONTENT_CHARS = 8000  # Reduced to avoid token limits during exploration
    
    def __init__(self, repo_root: Path):
        self.repo_root = repo_root
        self.dynamic_tools = {}  # Store dynamically created tools
        self.cache_dir = repo_root / ".ai_tools_cache"
        self.cache_dir.mkdir(exist_ok=True)
        
        # Sandbox management
        self.sandboxes = {}  # Store active sandboxes
        self.sandbox_dir = repo_root / ".ai_sandboxes"
        self.sandbox_dir.mkdir(exist_ok=True)
        
        # Load cached tools on initialization
        self._load_cached_tools()
    
    def list_directory(self, path: str) -> Dict[str, Any]:
        """List contents of a directory"""
        try:
            dir_path = self.repo_root / path
            if not dir_path.exists():
                return {"error": f"Directory {path} not found"}
            
            files = [f.name for f in dir_path.iterdir() if f.is_file()]
            directories = [d.name for d in dir_path.iterdir() if d.is_dir() and not d.name.startswith('.')]
            
            return {
                "path": path,
                "files": files[:20],  # Limit results
                "directories": directories[:20]
            }
        except Exception as e:
            return {"error": f"Error listing directory {path}: {str(e)}"}
    
    def read_file(self, path: str, lines: str = None) -> Dict[str, Any]:
        """Read a file or specific lines"""
        try:
            file_path = self.repo_root / path
            if not file_path.exists():
                return {"error": f"File {path} not found"}
            
            content = file_path.read_text(encoding='utf-8')
            total_lines = len(content.split('\n'))
            
            if lines:
                # Parse lines like "1-50" or "20"
                if '-' in lines:
                    start, end = map(int, lines.split('-'))
                    file_lines = content.split('\n')
                    content = '\n'.join(file_lines[start-1:end])
                else:
                    line_num = int(lines)
                    file_lines = content.split('\n')
                    # Show context around the line
                    start = max(0, line_num - 5)
                    end = min(len(file_lines), line_num + 5)
                    content = '\n'.join(file_lines[start:end])
            
            # Cap large content
            if len(content) > self.MAX_CONTENT_CHARS:
                content = content[:self.MAX_CONTENT_CHARS] + "\n/* truncated */"
            
            return {
                "path": path,
                "content": content,
                "total_lines": total_lines
            }
        except Exception as e:
            return {"error": f"Error reading file {path}: {str(e)}"}
    
    def search_files(self, pattern: str, file_type: str = "*.ts", max_matches: int = 10) -> Dict[str, Any]:
        """Search for patterns in files"""
        try:
            matches = []
            search_paths = [
                self.repo_root / "backend" / "**" / file_type,
                self.repo_root / "ui" / "**" / file_type
            ]
            
            for search_path in search_paths:
                for file_path in self.repo_root.glob(str(search_path.relative_to(self.repo_root))):
                    if file_path.is_file():
                        try:
                            content = file_path.read_text(encoding='utf-8')
                            if pattern in content:
                                lines = content.split('\n')
                                line_matches = [(i+1, line.strip()) for i, line in enumerate(lines) 
                                              if pattern in line][:3]  # Limit to first 3 matches per file
                                
                                matches.append({
                                    "file": str(file_path.relative_to(self.repo_root)),
                                    "matches": line_matches
                                })
                                
                                if len(matches) >= max_matches:
                                    break
                        except:
                            continue
                            
            return {"pattern": pattern, "matches": matches}
        except Exception as e:
            return {"error": f"Error searching for pattern {pattern}: {str(e)}"}
    
    def find_imports(self, file_path: str) -> Dict[str, Any]:
        """Find all imports in a file and resolve them"""
        try:
            full_path = self.repo_root / file_path
            if not full_path.exists():
                return {"error": f"File {file_path} not found"}
            
            content = full_path.read_text(encoding='utf-8')
            
            # Extract various import patterns
            import_patterns = [
                r'import.*from\s+[\'"]([^\'"]+)[\'"]',
                r'import\s+[\'"]([^\'"]+)[\'"]',
                r'require\([\'"]([^\'"]+)[\'"]\)'
            ]
            
            imports = []
            for pattern in import_patterns:
                imports.extend(re.findall(pattern, content))
            
            return {"file": file_path, "imports": list(set(imports))}
        except Exception as e:
            return {"error": f"Error analyzing imports in {file_path}: {str(e)}"}
    
    def find_usage(self, symbol: str, file_type: str = "*.ts") -> Dict[str, Any]:
        """Find where a symbol/function/class is used"""
        return self.search_files(symbol, file_type)
    
    def semantic_search(self, query: str, file_type: str = "*.ts", max_results: int = 8, similarity_threshold: float = 0.3) -> Dict[str, Any]:
        """Use SBERT embeddings to find semantically similar code across the codebase"""
        try:
            # Try to import sentence-transformers
            try:
                from sentence_transformers import SentenceTransformer
                import numpy as np
                from sklearn.metrics.pairwise import cosine_similarity
            except ImportError:
                return {
                    "error": "🚫 SBERT semantic search not available (optional heavy dependencies not installed)",
                    "fallback_suggestion": "Using regular text search instead. For semantic search, uncomment the ML dependencies in requirements.txt",
                    "install_command": "pip install sentence-transformers scikit-learn torch --index-url https://download.pytorch.org/whl/cpu",
                    "note": "⚠️ Warning: This will download ~500MB+ of ML libraries. Only install if you really need semantic search.",
                    "alternative": "Consider using search_files() or create a custom regex-based search tool instead"
                }
            
            print(f"🧠 Starting semantic search for: '{query}'", file=sys.stderr)
            
            # Initialize SBERT model (using a lightweight model for speed)
            model = SentenceTransformer('all-MiniLM-L6-v2')  # Fast and good for code
            
            # Collect code snippets and their contexts
            code_snippets = []
            file_contexts = []
            
            search_paths = [
                self.repo_root / "backend" / "**" / file_type,
                self.repo_root / "ui" / "**" / file_type
            ]
            
            for search_path in search_paths:
                for file_path in self.repo_root.glob(str(search_path.relative_to(self.repo_root))):
                    if file_path.is_file():
                        try:
                            content = file_path.read_text(encoding='utf-8')
                            
                            # Split content into logical chunks (functions, classes, etc.)
                            lines = content.split('\n')
                            
                            # Simple heuristic: chunk by functions/classes/interfaces
                            current_chunk = []
                            current_chunk_start = 0
                            
                            for i, line in enumerate(lines):
                                current_chunk.append(line)
                                
                                # End chunk on function/class/interface definitions or empty lines
                                if (line.strip().startswith(('function ', 'class ', 'interface ', 'export ', 'const ', 'let ', 'var ')) and 
                                    len(current_chunk) > 5) or len(current_chunk) > 20:
                                    
                                    chunk_text = '\n'.join(current_chunk)
                                    if len(chunk_text.strip()) > 50:  # Skip tiny chunks
                                        code_snippets.append(chunk_text)
                                        file_contexts.append({
                                            "file": str(file_path.relative_to(self.repo_root)),
                                            "start_line": current_chunk_start + 1,
                                            "end_line": i + 1,
                                            "preview": chunk_text[:200] + "..." if len(chunk_text) > 200 else chunk_text
                                        })
                                    
                                    current_chunk = []
                                    current_chunk_start = i + 1
                                    
                                    if len(code_snippets) > 100:  # Limit processing for performance
                                        break
                                        
                        except Exception:
                            continue
            
            if not code_snippets:
                return {"error": "No code snippets found to search", "query": query}
            
            print(f"🔍 Analyzing {len(code_snippets)} code chunks with SBERT", file=sys.stderr)
            
            # Generate embeddings
            query_embedding = model.encode([query])
            code_embeddings = model.encode(code_snippets)
            
            # Calculate similarities
            similarities = cosine_similarity(query_embedding, code_embeddings)[0]
            
            # Get top results above threshold
            results = []
            for i, similarity in enumerate(similarities):
                if similarity >= similarity_threshold:
                    results.append({
                        "similarity": float(similarity),
                        "file_context": file_contexts[i],
                        "code_snippet": code_snippets[i][:500] + "..." if len(code_snippets[i]) > 500 else code_snippets[i]
                    })
            
            # Sort by similarity and limit results
            results.sort(key=lambda x: x["similarity"], reverse=True)
            results = results[:max_results]
            
            print(f"✅ Found {len(results)} semantically similar code chunks", file=sys.stderr)
            
            return {
                "query": query,
                "total_chunks_analyzed": len(code_snippets),
                "results_found": len(results),
                "semantic_matches": results,
                "model_used": "all-MiniLM-L6-v2",
                "threshold": similarity_threshold
            }
            
        except Exception as e:
            return {"error": f"Semantic search failed: {str(e)}", "query": query}
    
    def create_dynamic_tool(self, tool_name: str, tool_code: str, description: str) -> Dict[str, Any]:
        """Create a new MCP tool dynamically with persistence and schema generation"""
        try:
            # Check if we have a cached version first
            cached_tool = self._load_cached_tool(tool_name, tool_code)
            
            if cached_tool:
                print(f"📂 Using cached version of tool '{tool_name}'", file=sys.stderr)
                # Tool was already loaded during startup, just return success
                return {
                    "success": True, 
                    "tool_name": tool_name, 
                    "description": description,
                    "cached": True
                }
            
            # Create a safe execution environment
            safe_globals = {
                'self': self,
                'Path': Path,
                're': re,
                'json': json,
                'subprocess': subprocess,
                'os': os,
                'sys': sys
            }
            
            # Execute the tool code
            exec(tool_code, safe_globals)
            
            # Store the tool with enhanced metadata
            if tool_name in safe_globals:
                tool_func = safe_globals[tool_name]
                
                # Generate schema for the tool
                schema = self._generate_tool_schema(tool_func, tool_name, description)
                
                self.dynamic_tools[tool_name] = {
                    'function': tool_func,
                    'code': tool_code,
                    'description': description,
                    'cached': False,
                    'created_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'schema': schema
                }
                
                # Cache the tool for future use
                self._cache_tool(tool_name, tool_code, description)
                
                print(f"✅ Created tool '{tool_name}' with auto-generated schema", file=sys.stderr)
                print(f"🔧 Schema: {schema['function']['parameters']}", file=sys.stderr)
                
                return {
                    "success": True, 
                    "tool_name": tool_name, 
                    "description": description,
                    "schema": schema,
                    "cached": False
                }
            else:
                return {"error": f"Tool function '{tool_name}' not found in executed code"}
                
        except Exception as e:
            return {"error": f"Failed to create tool '{tool_name}': {str(e)}"}
    
    def call_dynamic_tool(self, tool_name: str, arguments: Dict) -> Dict[str, Any]:
        """Call a dynamically created tool"""
        if tool_name not in self.dynamic_tools:
            return {"error": f"Dynamic tool '{tool_name}' not found"}
        
        try:
            tool_func = self.dynamic_tools[tool_name]['function']
            return tool_func(**arguments)
        except Exception as e:
            return {"error": f"Error calling dynamic tool '{tool_name}': {str(e)}"}
    
    def get_dynamic_tools_info(self) -> Dict[str, Any]:
        """Get information about all dynamic tools"""
        return {
            name: {
                "description": info["description"],
                "available": True,
                "cached": info.get("cached", False),
                "created_at": info.get("created_at", "unknown")
            }
            for name, info in self.dynamic_tools.items()
        }
    
    def _generate_tool_schema(self, tool_func, tool_name: str, description: str) -> Dict:
        """Auto-generate OpenAI function schema from tool function"""
        try:
            sig = inspect.signature(tool_func)
            schema = {
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": description,
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            }
            
            for param_name, param in sig.parameters.items():
                param_type = "string"  # Default type
                param_desc = f"Parameter {param_name}"
                
                # Try to infer type from annotation
                if param.annotation != param.empty:
                    if param.annotation == int:
                        param_type = "integer"
                    elif param.annotation == float:
                        param_type = "number"
                    elif param.annotation == bool:
                        param_type = "boolean"
                    elif param.annotation == list:
                        param_type = "array"
                    elif param.annotation == dict:
                        param_type = "object"
                
                schema["function"]["parameters"]["properties"][param_name] = {
                    "type": param_type,
                    "description": param_desc
                }
                
                if param.default == param.empty:
                    schema["function"]["parameters"]["required"].append(param_name)
            
            return schema
        except Exception as e:
            print(f"⚠️ Could not generate schema for {tool_name}: {e}", file=sys.stderr)
            return {
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": description,
                    "parameters": {"type": "object", "properties": {}}
                }
            }
    
    def _cache_tool(self, tool_name: str, tool_code: str, description: str):
        """Cache compiled tool for reuse"""
        try:
            tool_hash = hashlib.md5(tool_code.encode()).hexdigest()
            cache_file = self.cache_dir / f"{tool_name}_{tool_hash}.pkl"
            
            tool_data = {
                'name': tool_name,
                'code': tool_code,
                'description': description,
                'created_at': time.time(),
                'hash': tool_hash
            }
            
            with open(cache_file, 'wb') as f:
                pickle.dump(tool_data, f)
            
            print(f"💾 Cached tool '{tool_name}' to {cache_file.name}", file=sys.stderr)
            
        except Exception as e:
            print(f"⚠️ Failed to cache tool '{tool_name}': {e}", file=sys.stderr)
    
    def _load_cached_tool(self, tool_name: str, tool_code: str):
        """Load cached tool if available and matching"""
        try:
            tool_hash = hashlib.md5(tool_code.encode()).hexdigest()
            cache_file = self.cache_dir / f"{tool_name}_{tool_hash}.pkl"
            
            if cache_file.exists():
                with open(cache_file, 'rb') as f:
                    tool_data = pickle.load(f)
                
                print(f"📂 Loaded cached tool '{tool_name}' from {cache_file.name}", file=sys.stderr)
                return tool_data
                
        except Exception as e:
            print(f"⚠️ Failed to load cached tool '{tool_name}': {e}", file=sys.stderr)
        
        return None
    
    def _load_cached_tools(self):
        """Load all cached tools on startup"""
        try:
            cache_files = list(self.cache_dir.glob("*.pkl"))
            loaded_count = 0
            
            for cache_file in cache_files:
                try:
                    with open(cache_file, 'rb') as f:
                        tool_data = pickle.load(f)
                    
                    tool_name = tool_data['name']
                    tool_code = tool_data['code']
                    description = tool_data['description']
                    
                    # Recreate the tool function
                    safe_globals = {
                        'self': self,
                        'Path': Path,
                        're': re,
                        'json': json,
                        'subprocess': subprocess,
                        'os': os,
                        'sys': sys
                    }
                    
                    exec(tool_code, safe_globals)
                    
                    if tool_name in safe_globals:
                        self.dynamic_tools[tool_name] = {
                            'function': safe_globals[tool_name],
                            'code': tool_code,
                            'description': description,
                            'cached': True,
                            'created_at': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(tool_data.get('created_at', time.time()))),
                            'schema': self._generate_tool_schema(safe_globals[tool_name], tool_name, description)
                        }
                        loaded_count += 1
                        
                except Exception as e:
                    print(f"⚠️ Failed to load cached tool from {cache_file}: {e}", file=sys.stderr)
            
            if loaded_count > 0:
                print(f"📂 Loaded {loaded_count} cached tools on startup", file=sys.stderr)
                
        except Exception as e:
            print(f"⚠️ Failed to load cached tools: {e}", file=sys.stderr)
    
    def get_tool_schemas(self) -> List[Dict]:
        """Get OpenAI function schemas for all dynamic tools"""
        schemas = []
        for tool_name, tool_info in self.dynamic_tools.items():
            if 'schema' in tool_info:
                schemas.append(tool_info['schema'])
            else:
                # Generate schema on demand
                schema = self._generate_tool_schema(
                    tool_info['function'], 
                    tool_name, 
                    tool_info['description']
                )
                tool_info['schema'] = schema
                schemas.append(schema)
        
        return schemas
    
    # ===== SANDBOX FUNCTIONALITY =====
    
    def create_sandbox(self, sandbox_name: str, description: str, sandbox_type: str = "temp_directory") -> Dict[str, Any]:
        """Create an isolated sandbox environment for safe testing"""
        try:
            if sandbox_name in self.sandboxes:
                return {"error": f"Sandbox '{sandbox_name}' already exists"}
            
            sandbox_path = self.sandbox_dir / sandbox_name
            sandbox_path.mkdir(exist_ok=True)
            
            sandbox_info = {
                "name": sandbox_name,
                "type": sandbox_type,
                "path": str(sandbox_path),
                "description": description,
                "created_at": time.time(),
                "operations": [],
                "status": "active"
            }
            
            # Initialize sandbox based on type
            if sandbox_type == "copy_repo":
                # Copy essential files (excluding .git, node_modules, etc.)
                self._copy_repo_to_sandbox(sandbox_path)
                sandbox_info["has_repo_copy"] = True
            elif sandbox_type == "temp_directory":
                # Just create empty directory
                (sandbox_path / "workspace").mkdir(exist_ok=True)
                sandbox_info["has_repo_copy"] = False
            
            self.sandboxes[sandbox_name] = sandbox_info
            
            print(f"📦 Created sandbox '{sandbox_name}' at {sandbox_path}", file=sys.stderr)
            
            return {
                "success": True,
                "sandbox_name": sandbox_name,
                "sandbox_path": str(sandbox_path),
                "type": sandbox_type,
                "description": description,
                "ready_for_operations": True
            }
            
        except Exception as e:
            return {"error": f"Failed to create sandbox '{sandbox_name}': {str(e)}"}
    
    def _copy_repo_to_sandbox(self, sandbox_path: Path):
        """Copy repository files to sandbox, excluding unnecessary files"""
        import shutil
        
        exclude_patterns = {
            '.git', 'node_modules', '.ai_tools_cache', '.ai_sandboxes', 
            'dist', 'build', '.next', 'target', '__pycache__', '.pytest_cache'
        }
        
        workspace_path = sandbox_path / "workspace"
        workspace_path.mkdir(exist_ok=True)
        
        for item in self.repo_root.iterdir():
            if item.name not in exclude_patterns:
                dest = workspace_path / item.name
                if item.is_file():
                    shutil.copy2(item, dest)
                elif item.is_dir():
                    shutil.copytree(item, dest, ignore=shutil.ignore_patterns(*exclude_patterns))
    
    def run_in_sandbox(self, sandbox_name: str, operation_type: str, operation_data: str, description: str) -> Dict[str, Any]:
        """Execute operations safely inside a sandbox"""
        try:
            if sandbox_name not in self.sandboxes:
                return {"error": f"Sandbox '{sandbox_name}' not found"}
            
            sandbox = self.sandboxes[sandbox_name]
            sandbox_path = Path(sandbox["path"])
            
            operation_id = f"op-{len(sandbox['operations']) + 1}"
            operation_record = {
                "id": operation_id,
                "type": operation_type,
                "description": description,
                "timestamp": time.time(),
                "status": "running"
            }
            
            print(f"🧪 Running {operation_type} in sandbox '{sandbox_name}': {description}", file=sys.stderr)
            
            result = None
            if operation_type == "command":
                result = self._run_sandbox_command(sandbox_path, operation_data)
            elif operation_type == "code_execution":
                result = self._run_sandbox_code(sandbox_path, operation_data)
            elif operation_type == "file_operation":
                result = self._run_sandbox_file_operation(sandbox_path, operation_data)
            elif operation_type == "build_test":
                result = self._run_sandbox_build_test(sandbox_path, operation_data)
            else:
                return {"error": f"Unknown operation type: {operation_type}"}
            
            operation_record["result"] = result
            operation_record["status"] = "completed" if result.get("success") else "failed"
            sandbox["operations"].append(operation_record)
            
            return {
                "success": True,
                "operation_id": operation_id,
                "operation_type": operation_type,
                "result": result,
                "sandbox_status": sandbox["status"]
            }
            
        except Exception as e:
            return {"error": f"Failed to run operation in sandbox '{sandbox_name}': {str(e)}"}
    
    def _run_sandbox_command(self, sandbox_path: Path, command: str) -> Dict[str, Any]:
        """Run shell command in sandbox"""
        try:
            workspace_path = sandbox_path / "workspace" if (sandbox_path / "workspace").exists() else sandbox_path
            
            result = subprocess.run(
                command,
                shell=True,
                cwd=workspace_path,
                capture_output=True,
                text=True,
                timeout=60  # 1 minute timeout
            )
            
            return {
                "success": result.returncode == 0,
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "command": command
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Command timed out after 60 seconds"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _run_sandbox_code(self, sandbox_path: Path, code: str) -> Dict[str, Any]:
        """Execute Python code in sandbox context"""
        try:
            workspace_path = sandbox_path / "workspace" if (sandbox_path / "workspace").exists() else sandbox_path
            
            # Create safe execution environment
            safe_globals = {
                'sandbox_path': workspace_path,
                'Path': Path,
                're': re,
                'json': json,
                'os': os,
                'sys': sys,
                'subprocess': subprocess
            }
            
            # Capture output
            import io
            import contextlib
            
            output = io.StringIO()
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                exec(code, safe_globals)
            
            return {
                "success": True,
                "output": output.getvalue(),
                "code": code
            }
            
        except Exception as e:
            return {"success": False, "error": str(e), "code": code}
    
    def _run_sandbox_file_operation(self, sandbox_path: Path, operation: str) -> Dict[str, Any]:
        """Perform file operations in sandbox"""
        try:
            # Parse operation (could be JSON with file operations)
            operation_data = json.loads(operation) if operation.startswith('{') else {"operation": operation}
            
            workspace_path = sandbox_path / "workspace" if (sandbox_path / "workspace").exists() else sandbox_path
            
            if "create_file" in operation_data:
                file_path = workspace_path / operation_data["create_file"]["path"]
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(operation_data["create_file"]["content"])
                return {"success": True, "operation": "file_created", "path": str(file_path)}
            
            elif "read_file" in operation_data:
                file_path = workspace_path / operation_data["read_file"]["path"]
                content = file_path.read_text() if file_path.exists() else None
                return {"success": True, "operation": "file_read", "content": content}
            
            else:
                return {"success": False, "error": "Unknown file operation"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _run_sandbox_build_test(self, sandbox_path: Path, test_command: str) -> Dict[str, Any]:
        """Run build/test commands in sandbox"""
        workspace_path = sandbox_path / "workspace" if (sandbox_path / "workspace").exists() else sandbox_path
        
        # Run the test command
        return self._run_sandbox_command(sandbox_path, test_command)
    
    def inspect_sandbox(self, sandbox_name: str, inspection_type: str = "all") -> Dict[str, Any]:
        """Inspect sandbox state and results"""
        try:
            if sandbox_name not in self.sandboxes:
                return {"error": f"Sandbox '{sandbox_name}' not found"}
            
            sandbox = self.sandboxes[sandbox_name]
            sandbox_path = Path(sandbox["path"])
            
            inspection_result = {
                "sandbox_name": sandbox_name,
                "inspection_type": inspection_type
            }
            
            if inspection_type in ["status", "all"]:
                inspection_result["status"] = {
                    "name": sandbox["name"],
                    "type": sandbox["type"],
                    "description": sandbox["description"],
                    "created_at": sandbox["created_at"],
                    "status": sandbox["status"],
                    "operations_count": len(sandbox["operations"])
                }
            
            if inspection_type in ["files", "all"]:
                workspace_path = sandbox_path / "workspace" if (sandbox_path / "workspace").exists() else sandbox_path
                files = []
                if workspace_path.exists():
                    for item in workspace_path.rglob("*"):
                        if item.is_file():
                            files.append(str(item.relative_to(workspace_path)))
                inspection_result["files"] = files[:50]  # Limit to 50 files
            
            if inspection_type in ["logs", "results", "all"]:
                inspection_result["operations"] = sandbox["operations"][-10:]  # Last 10 operations
            
            return {
                "success": True,
                **inspection_result
            }
            
        except Exception as e:
            return {"error": f"Failed to inspect sandbox '{sandbox_name}': {str(e)}"}
    
    def cleanup_sandbox(self, sandbox_name: str, force: bool = False) -> Dict[str, Any]:
        """Clean up and remove sandbox"""
        try:
            if sandbox_name not in self.sandboxes:
                return {"error": f"Sandbox '{sandbox_name}' not found"}
            
            sandbox = self.sandboxes[sandbox_name]
            sandbox_path = Path(sandbox["path"])
            
            # Check if sandbox has unsaved results
            if not force and sandbox["operations"]:
                unsaved_ops = [op for op in sandbox["operations"] if op.get("status") == "completed"]
                if unsaved_ops:
                    return {
                        "success": False,
                        "warning": f"Sandbox has {len(unsaved_ops)} completed operations. Use force=true to cleanup anyway.",
                        "operations": [op["description"] for op in unsaved_ops[-5:]]
                    }
            
            # Remove sandbox directory
            import shutil
            if sandbox_path.exists():
                shutil.rmtree(sandbox_path)
            
            # Remove from active sandboxes
            del self.sandboxes[sandbox_name]
            
            print(f"🗑️ Cleaned up sandbox '{sandbox_name}'", file=sys.stderr)
            
            return {
                "success": True,
                "sandbox_name": sandbox_name,
                "cleaned_up": True,
                "operations_removed": len(sandbox["operations"])
            }
            
        except Exception as e:
            return {"error": f"Failed to cleanup sandbox '{sandbox_name}': {str(e)}"}


class UnifiedChangeProposer:
    def __init__(self, openai_api_key: str, repo_root: str):
        self.api_key = openai_api_key
        self.repo_root = Path(repo_root)
        self.base_url = "https://api.openai.com/v1/chat/completions"
        self.mcp = CodeExplorerMCP(self.repo_root)
        self.friend_conversations = []  # Store friend AI conversations
        self.collaboration_session = None  # Initialize on first use
        
    def compress_conversation_context(self, messages: list, max_recent_tools: int = 1) -> list:
        """AGGRESSIVE token compression - drastically reduce context to stay under limits"""
        if len(messages) <= 4:  # System + user + minimal exchanges
            return messages
        
        # Always keep system message and initial user message
        compressed = messages[:2]
        
        # Separate message types for aggressive processing
        tool_messages = []
        regular_messages = []
        
        for msg in messages[2:]:
            if msg.get("role") in ["assistant", "tool"] and ("tool_calls" in msg or msg.get("role") == "tool"):
                tool_messages.append(msg)
            else:
                regular_messages.append(msg)
        
        # ULTRA-AGGRESSIVE: Keep only the LAST tool interaction (1 call + 1 response = 2 messages)
        recent_tools = tool_messages[-2:] if tool_messages else []
        
        # COMPRESS tool response content to prevent token explosion
        compressed_tools = []
        for msg in recent_tools:
            if msg.get("role") == "tool" and "content" in msg:
                # Drastically truncate tool response content
                original_content = str(msg["content"])
                if len(original_content) > 1000:  # If content is large
                    # Extract only key information
                    lines = original_content.split('\n')
                    key_lines = []
                    for line in lines[:20]:  # Only first 20 lines
                        if any(keyword in line.lower() for keyword in 
                               ["error", "failed", "test", "import", "export", "function", "class", "interface"]):
                            key_lines.append(line)
                    
                    key_lines_content = '\n'.join(key_lines[:10])
                    truncated_content = key_lines_content + f"\n\n[TRUNCATED: {len(original_content)} chars → {len(key_lines_content)} chars for token efficiency]"
                    
                    compressed_msg = msg.copy()
                    compressed_msg["content"] = truncated_content
                    compressed_tools.append(compressed_msg)
                else:
                    compressed_tools.append(msg)  # Keep small responses as-is
            else:
                compressed_tools.append(msg)  # Keep assistant messages as-is
        
        # Create MINIMAL summary of earlier exploration
        if len(tool_messages) > 2:
            explored_count = len(tool_messages) // 2
            summary_msg = {
                "role": "assistant", 
                "content": f"🗜️ AGGRESSIVE COMPRESSION: Explored {explored_count} tools/files. Key context preserved in recent messages. Continue focused exploration or synthesize findings."
            }
            compressed.append(summary_msg)
        
        # Add compressed recent tools and NO regular messages (too much content)
        compressed.extend(compressed_tools)
        
        # Calculate rough token reduction
        original_size = sum(len(str(msg.get("content", ""))) for msg in messages)
        compressed_size = sum(len(str(msg.get("content", ""))) for msg in compressed)
        
        print(f"🗜️ AGGRESSIVE compression: {len(messages)} → {len(compressed)} messages, ~{original_size} → ~{compressed_size} chars", file=sys.stderr)
        
        return compressed
        
    def detect_component_type(self, error_log: str) -> str:
        """Detect if errors are from frontend, backend, or other"""
        if any(indicator in error_log.lower() for indicator in ['ui/', 'vite', 'react', 'jsx', 'tsx']):
            return "frontend"
        elif any(indicator in error_log.lower() for indicator in ['backend/', 'node', 'express', 'fastify']):
            return "backend"
        else:
            # Try to infer from file paths
            if 'ui/' in error_log or 'src/components' in error_log:
                return "frontend"
            elif 'backend/' in error_log or 'src/lib' in error_log or 'src/routes' in error_log:
                return "backend"
            return "unknown"
    
    def get_mcp_tools_schema(self) -> List[Dict]:
        """Get the function calling schema for MCP tools including dynamic tool creation and all cached tools"""
        
        # Load base tools from JSON file
        base_tools = load_base_tools()
        
        # Add schemas for all existing dynamic tools
        dynamic_tool_schemas = self.mcp.get_tool_schemas()
        
        # Combine base tools with dynamic tool schemas
        all_tools = base_tools + dynamic_tool_schemas
        
        if dynamic_tool_schemas:
            print(f"🔧 Including {len(dynamic_tool_schemas)} dynamic tools in schema", file=sys.stderr)
        
        return all_tools
    
    def handle_function_call(self, function_name: str, arguments: Dict) -> Dict[str, Any]:
        """Handle MCP function calls including dynamic tool creation and execution"""
        print(f"🔧 MCP Tool Call: {function_name}({arguments})", file=sys.stderr)
        
        # Handle base MCP tools
        if function_name == "list_directory":
            return self.mcp.list_directory(arguments["path"])
        elif function_name == "read_file":
            return self.mcp.read_file(arguments["path"], arguments.get("lines"))
        elif function_name == "search_files":
            return self.mcp.search_files(arguments["pattern"], arguments.get("file_type", "*.ts"))
        elif function_name == "find_imports":
            return self.mcp.find_imports(arguments["file_path"])
        elif function_name == "find_usage":
            return self.mcp.find_usage(arguments["symbol"], arguments.get("file_type", "*.ts"))
        elif function_name == "semantic_search":
            return self.mcp.semantic_search(
                arguments["query"], 
                arguments.get("file_type", "*.ts"),
                arguments.get("max_results", 8),
                arguments.get("similarity_threshold", 0.3)
            )
        
        # Handle dynamic tool creation and execution
        elif function_name == "create_dynamic_tool":
            print(f"🚀 META-AI: Creating new tool '{arguments['tool_name']}'", file=sys.stderr)
            result = self.mcp.create_dynamic_tool(
                arguments["tool_name"], 
                arguments["tool_code"], 
                arguments["description"]
            )
            if result.get("success"):
                print(f"✅ Dynamic tool '{arguments['tool_name']}' created successfully!", file=sys.stderr)
            else:
                print(f"❌ Failed to create dynamic tool: {result.get('error')}", file=sys.stderr)
            return result
            
        elif function_name == "call_dynamic_tool":
            print(f"🎯 Calling dynamic tool '{arguments['tool_name']}'", file=sys.stderr)
            return self.mcp.call_dynamic_tool(arguments["tool_name"], arguments["arguments"])
            
        elif function_name == "get_dynamic_tools_info":
            return self.mcp.get_dynamic_tools_info()
            
        elif function_name == "consult_friend_ai":
            return self.consult_friend_ai(
                arguments["consultation_topic"],
                arguments["problem_context"], 
                arguments["your_initial_thoughts"]
            )
            
        # Sandbox functions
        elif function_name == "create_sandbox":
            return self.mcp.create_sandbox(
                arguments["sandbox_name"],
                arguments["description"],
                arguments.get("sandbox_type", "temp_directory")
            )
            
        elif function_name == "run_in_sandbox":
            return self.mcp.run_in_sandbox(
                arguments["sandbox_name"],
                arguments["operation_type"],
                arguments["operation_data"],
                arguments["description"]
            )
            
        elif function_name == "inspect_sandbox":
            return self.mcp.inspect_sandbox(
                arguments["sandbox_name"],
                arguments.get("inspection_type", "all")
            )
            
        elif function_name == "cleanup_sandbox":
            return self.mcp.cleanup_sandbox(
                arguments["sandbox_name"],
                arguments.get("force", False)
            )
            
        # Web automation tools
        elif function_name == "fetch_webpage":
            return self.fetch_webpage(
                arguments["url"],
                arguments.get("extraction_type", "text"),
                arguments.get("max_content_length", 10000),
                arguments.get("summarize_if_long", True)
            )
            
        elif function_name == "create_playwright_automation":
            return self.create_playwright_automation(
                arguments["automation_name"],
                arguments["target_url"],
                arguments["action_description"],
                arguments.get("automation_type", "data_scraping"),
                arguments.get("output_format", "json")
            )
            
        # Handle dynamically created tools
        elif function_name in self.mcp.dynamic_tools:
            print(f"🎯 Calling dynamic tool '{function_name}' directly", file=sys.stderr)
            return self.mcp.call_dynamic_tool(function_name, arguments)
            
        else:
            return {"error": f"Unknown function: {function_name}"}
    
    def consult_friend_ai(self, consultation_topic: str, problem_context: str, your_initial_thoughts: str) -> Dict[str, Any]:
        """Start a collaborative consultation with Friend AI using A2A protocol"""
        try:
            # Initialize collaboration session if not exists
            if self.collaboration_session is None:
                self.collaboration_session = CollaborationSession(self.api_key)
            
            print(f"🤝 Starting Friend AI consultation on: {consultation_topic}", file=sys.stderr)
            
            # Start the collaboration
            result = self.collaboration_session.start_consultation(
                consultation_topic=consultation_topic,
                problem_context=problem_context,
                junior_ai_initial_thoughts=your_initial_thoughts
            )
            
            if not result.get("success"):
                return {"error": f"Failed to start Friend AI consultation: {result.get('error', 'Unknown error')}"}
            
            task_id = result["task_id"]
            
            # Get Friend AI's initial response
            friend_response = self.collaboration_session.friend_ai.generate_friend_response(
                task_id, 
                f"Junior AI consultation request: {your_initial_thoughts}"
            )
            
            if not friend_response.get("success"):
                return {"error": f"Friend AI failed to respond: {friend_response.get('error', 'Unknown error')}"}
            
            # Store the conversation for potential continuation
            conversation_info = {
                "task_id": task_id,
                "topic": consultation_topic,
                "started_at": time.time(),
                "status": "active"
            }
            self.friend_conversations.append(conversation_info)
            
            return {
                "success": True,
                "consultation_started": True,
                "task_id": task_id,
                "friend_ai_response": friend_response["response"],
                "conversation_length": friend_response.get("conversation_length", 1),
                "next_steps": "You can continue this conversation by calling consult_friend_ai again with follow-up thoughts, or proceed with the suggested strategy.",
                "a2a_protocol": "Using Agent2Agent protocol for collaborative AI consultation"
            }
            
        except Exception as e:
            return {"error": f"Friend AI consultation failed: {str(e)}"}
    
    def fetch_webpage(self, url: str, extraction_type: str = "text", max_content_length: int = 10000, summarize_if_long: bool = True) -> Dict[str, Any]:
        """Fetch content from a webpage with intelligent extraction and SBERT summarization"""
        try:
            print(f"🌐 Fetching webpage: {url}", file=sys.stderr)
            
            # Import web scraping dependencies
            try:
                import requests
                from bs4 import BeautifulSoup
            except ImportError:
                return {
                    "error": "Web scraping dependencies not available. Install with: pip install beautifulsoup4 requests",
                    "suggestion": "Create a custom tool to install these dependencies or use requests directly"
                }
            
            # Fetch the webpage
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            result = {
                "url": url,
                "status_code": response.status_code,
                "content_type": response.headers.get('content-type', 'unknown'),
                "extraction_type": extraction_type
            }
            
            # Extract content based on type
            if extraction_type == "text" or extraction_type == "all":
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()
                
                text_content = soup.get_text()
                # Clean up whitespace
                lines = (line.strip() for line in text_content.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text_content = ' '.join(chunk for chunk in chunks if chunk)
                
                # Handle long content with SBERT summarization
                if len(text_content) > max_content_length and summarize_if_long:
                    try:
                        # Try to use semantic search for summarization
                        semantic_result = self.mcp.semantic_search(
                            query="main content summary key points important information",
                            file_type="*.html"  # Not used, but required
                        )
                        
                        if "error" not in semantic_result:
                            result["content"] = text_content[:max_content_length] + "\n\n[CONTENT TRUNCATED - USE SBERT SEMANTIC SEARCH FOR FULL ANALYSIS]"
                            result["content_length"] = len(text_content)
                            result["truncated"] = True
                        else:
                            result["content"] = text_content[:max_content_length] + "\n\n[CONTENT TRUNCATED]"
                            result["content_length"] = len(text_content)
                            result["truncated"] = True
                    except:
                        result["content"] = text_content[:max_content_length] + "\n\n[CONTENT TRUNCATED]"
                        result["content_length"] = len(text_content)
                        result["truncated"] = True
                else:
                    result["content"] = text_content
                    result["content_length"] = len(text_content)
                    result["truncated"] = False
            
            if extraction_type == "links" or extraction_type == "all":
                links = []
                for link in soup.find_all('a', href=True):
                    links.append({
                        "text": link.get_text(strip=True),
                        "href": link['href'],
                        "title": link.get('title', '')
                    })
                result["links"] = links[:50]  # Limit to 50 links
            
            if extraction_type == "forms" or extraction_type == "all":
                forms = []
                for form in soup.find_all('form'):
                    form_data = {
                        "action": form.get('action', ''),
                        "method": form.get('method', 'GET'),
                        "inputs": []
                    }
                    for input_elem in form.find_all(['input', 'select', 'textarea']):
                        form_data["inputs"].append({
                            "type": input_elem.get('type', input_elem.name),
                            "name": input_elem.get('name', ''),
                            "id": input_elem.get('id', ''),
                            "placeholder": input_elem.get('placeholder', '')
                        })
                    forms.append(form_data)
                result["forms"] = forms
            
            if extraction_type == "tables" or extraction_type == "all":
                tables = []
                for table in soup.find_all('table'):
                    rows = []
                    for row in table.find_all('tr'):
                        cells = [cell.get_text(strip=True) for cell in row.find_all(['td', 'th'])]
                        if cells:
                            rows.append(cells)
                    if rows:
                        tables.append(rows)
                result["tables"] = tables[:10]  # Limit to 10 tables
            
            if extraction_type == "images" or extraction_type == "all":
                images = []
                for img in soup.find_all('img'):
                    images.append({
                        "src": img.get('src', ''),
                        "alt": img.get('alt', ''),
                        "title": img.get('title', '')
                    })
                result["images"] = images[:20]  # Limit to 20 images
            
            print(f"✅ Successfully fetched and extracted {extraction_type} from {url}", file=sys.stderr)
            return {"success": True, **result}
            
        except Exception as e:
            return {"error": f"Failed to fetch webpage {url}: {str(e)}"}
    
    def create_playwright_automation(self, automation_name: str, target_url: str, action_description: str, automation_type: str = "data_scraping", output_format: str = "json") -> Dict[str, Any]:
        """Create a Playwright automation script as a dynamic MCP tool"""
        try:
            print(f"🎭 Creating Playwright automation: {automation_name}", file=sys.stderr)
            
            # Generate Playwright script based on automation type and description
            playwright_script = self._generate_playwright_script(
                automation_name, target_url, action_description, automation_type, output_format
            )
            
            # Create the dynamic tool
            tool_result = self.mcp.create_dynamic_tool(
                tool_name=automation_name,
                tool_code=playwright_script,
                description=f"Playwright automation: {action_description} on {target_url}"
            )
            
            if tool_result.get("success"):
                return {
                    "success": True,
                    "automation_name": automation_name,
                    "target_url": target_url,
                    "automation_type": automation_type,
                    "description": action_description,
                    "tool_created": True,
                    "playwright_script_preview": playwright_script[:500] + "..." if len(playwright_script) > 500 else playwright_script,
                    "usage": f"Call the tool with: call_dynamic_tool('{automation_name}', {{...arguments...}})"
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to create Playwright tool: {tool_result.get('error')}",
                    "script_generated": playwright_script[:200] + "..." if len(playwright_script) > 200 else playwright_script
                }
                
        except Exception as e:
            return {"error": f"Failed to create Playwright automation: {str(e)}"}
    
    def _generate_playwright_script(self, automation_name: str, target_url: str, action_description: str, automation_type: str, output_format: str) -> str:
        """Generate a complete Playwright automation script"""
        
        script_template = f'''def {automation_name}(headless: bool = True, timeout: int = 30000, **kwargs):
    """
    Playwright automation: {action_description}
    Target URL: {target_url}
    Type: {automation_type}
    Output Format: {output_format}
    """
    try:
        # Try to import Playwright
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            return {{
                "error": "Playwright not installed. Install with: pip install playwright && playwright install",
                "suggestion": "Run 'playwright install' after pip install to download browsers"
            }}
        
        results = []
        
        with sync_playwright() as p:
            # Launch browser
            browser = p.chromium.launch(headless=headless)
            context = browser.new_context()
            page = context.new_page()
            
            # Set timeout
            page.set_default_timeout(timeout)
            
            try:
                print(f"🎭 Navigating to {{target_url}}", file=sys.stderr)
                page.goto("{target_url}")
                
                # Wait for page to load
                page.wait_for_load_state("networkidle")
'''

        # Add automation-specific logic based on type
        if automation_type == "data_scraping":
            script_template += '''
                # Data scraping automation
                print("🔍 Starting data scraping", file=sys.stderr)
                
                # Extract page title
                title = page.title()
                results.append({"type": "title", "value": title})
                
                # Extract main content (customize based on action_description)
                content_selectors = [
                    "main", "article", ".content", "#content", 
                    ".main-content", ".post-content", ".entry-content"
                ]
                
                for selector in content_selectors:
                    try:
                        elements = page.query_selector_all(selector)
                        if elements:
                            for elem in elements:
                                text = elem.inner_text()
                                if text.strip():
                                    results.append({"type": "content", "selector": selector, "text": text[:1000]})
                            break
                    except:
                        continue
                
                # Extract links
                links = page.query_selector_all("a[href]")
                for link in links[:20]:  # Limit to 20 links
                    try:
                        href = link.get_attribute("href")
                        text = link.inner_text()
                        if href and text.strip():
                            results.append({"type": "link", "href": href, "text": text.strip()})
                    except:
                        continue
'''
        
        elif automation_type == "form_filling":
            script_template += '''
                # Form filling automation
                print("📝 Starting form filling", file=sys.stderr)
                
                # Look for forms
                forms = page.query_selector_all("form")
                
                for i, form in enumerate(forms):
                    try:
                        # Find input fields
                        inputs = form.query_selector_all("input, select, textarea")
                        
                        for input_elem in inputs:
                            input_type = input_elem.get_attribute("type") or "text"
                            name = input_elem.get_attribute("name") or ""
                            
                            # Fill based on input type and name (customize as needed)
                            if input_type == "text" and "email" in name.lower():
                                input_elem.fill("test@example.com")
                            elif input_type == "text" and "name" in name.lower():
                                input_elem.fill("Test User")
                            elif input_type == "password":
                                input_elem.fill("testpassword123")
                            
                        results.append({"type": "form_filled", "form_index": i, "inputs_count": len(inputs)})
                        
                    except Exception as e:
                        results.append({"type": "form_error", "form_index": i, "error": str(e)})
'''
        
        elif automation_type == "ui_testing":
            script_template += '''
                # UI testing automation
                print("🧪 Starting UI testing", file=sys.stderr)
                
                # Check page title
                title = page.title()
                results.append({"test": "page_title", "value": title, "passed": bool(title)})
                
                # Check for common UI elements
                elements_to_check = [
                    {"selector": "nav", "name": "navigation"},
                    {"selector": "header", "name": "header"},
                    {"selector": "footer", "name": "footer"},
                    {"selector": "main", "name": "main_content"},
                    {"selector": "button", "name": "buttons"},
                    {"selector": "form", "name": "forms"}
                ]
                
                for elem_check in elements_to_check:
                    try:
                        elements = page.query_selector_all(elem_check["selector"])
                        results.append({
                            "test": f"{elem_check['name']}_present",
                            "selector": elem_check["selector"],
                            "count": len(elements),
                            "passed": len(elements) > 0
                        })
                    except:
                        results.append({
                            "test": f"{elem_check['name']}_present",
                            "selector": elem_check["selector"],
                            "passed": False,
                            "error": "Element check failed"
                        })
'''
        
        elif automation_type == "navigation":
            script_template += '''
                # Navigation automation
                print("🧭 Starting navigation automation", file=sys.stderr)
                
                # Record initial page
                initial_url = page.url
                results.append({"type": "initial_page", "url": initial_url})
                
                # Find and click navigation links
                nav_links = page.query_selector_all("nav a, .nav a, .menu a")
                
                for i, link in enumerate(nav_links[:5]):  # Limit to 5 links
                    try:
                        href = link.get_attribute("href")
                        text = link.inner_text()
                        
                        if href and not href.startswith(("#", "javascript:", "mailto:")):
                            print(f"🔗 Clicking navigation link: {text}", file=sys.stderr)
                            link.click()
                            page.wait_for_load_state("networkidle")
                            
                            new_url = page.url
                            results.append({
                                "type": "navigation",
                                "link_text": text,
                                "target_href": href,
                                "actual_url": new_url,
                                "navigation_successful": new_url != initial_url
                            })
                            
                            # Go back to original page
                            page.go_back()
                            page.wait_for_load_state("networkidle")
                            
                    except Exception as e:
                        results.append({
                            "type": "navigation_error",
                            "link_index": i,
                            "error": str(e)
                        })
'''
        
        elif automation_type == "monitoring":
            script_template += '''
                # Website monitoring automation
                print("📊 Starting website monitoring", file=sys.stderr)
                
                # Performance metrics
                start_time = time.time()
                
                # Check if page loads successfully
                load_time = time.time() - start_time
                results.append({"metric": "page_load_time", "value": load_time, "unit": "seconds"})
                
                # Check for errors in console
                console_errors = []
                page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
                
                # Wait a bit to collect console errors
                page.wait_for_timeout(2000)
                
                results.append({"metric": "console_errors", "count": len(console_errors), "errors": console_errors[:5]})
                
                # Check response status
                response_status = page.evaluate("() => window.performance.getEntriesByType('navigation')[0].responseStart > 0")
                results.append({"metric": "response_received", "value": response_status})
                
                # Check for broken images
                broken_images = page.evaluate("""
                    () => {
                        const images = Array.from(document.querySelectorAll('img'));
                        return images.filter(img => !img.complete || img.naturalHeight === 0).length;
                    }
                """)
                results.append({"metric": "broken_images", "count": broken_images})
'''
        
        # Add common closing logic
        script_template += f'''
                
            except Exception as e:
                results.append({{"type": "automation_error", "error": str(e)}})
            
            finally:
                # Clean up
                browser.close()
        
        # Format output based on requested format
        if "{output_format}" == "json":
            return {{"success": True, "automation": "{automation_name}", "results": results}}
        elif "{output_format}" == "csv":
            # Convert results to CSV format
            import csv
            import io
            output = io.StringIO()
            if results:
                writer = csv.DictWriter(output, fieldnames=results[0].keys())
                writer.writeheader()
                writer.writerows(results)
            return {{"success": True, "automation": "{automation_name}", "csv_data": output.getvalue()}}
        elif "{output_format}" == "structured_text":
            # Convert to readable text format
            text_output = f"Automation: {automation_name}\\n"
            text_output += f"URL: {target_url}\\n"
            text_output += f"Results: {{len(results)}} items\\n\\n"
            for i, result in enumerate(results):
                text_output += f"{{i+1}}. {{result}}\\n"
            return {{"success": True, "automation": "{automation_name}", "text_output": text_output}}
        else:
            return {{"success": True, "automation": "{automation_name}", "raw_results": results}}
    
    except Exception as e:
        return {{"error": f"Playwright automation failed: {{str(e)}}"}}
'''
        
        return script_template
    
    def read_error_log(self, log_file: str) -> str:
        """Read error log from file."""
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # Limit to first 2000 lines to avoid token limits
                lines = content.split('\n')[:2000]
                return '\n'.join(lines)
        except FileNotFoundError:
            print(f"❌ Error log file not found: {log_file}", file=sys.stderr)
            return ""
    
    def seed_context_from_errors(self, error_log: str, max_files: int = 3) -> str:
        """Extract file:line hints from errors and embed small excerpts into the initial prompt."""
        hints = []
        
        # Match various error patterns for TypeScript files
        patterns = [
            r'((?:backend|ui|src)/[^\s:()]+\.tsx?)\((\d+),\d+\)',
            r'Error in ((?:backend|apps/ui|apps|src)/[^\s:()]+\.tsx?):(\d+)',
            r'((?:backend|apps/ui|apps|src)/[^\s:()]+\.tsx?):(\d+):\d+',
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, error_log):
                file_path, line_num = match.groups()
                # Normalize path to repo root
                if not file_path.startswith(('backend/', 'apps/')):
                    # Try to infer the correct path
                    if 'components' in file_path or 'pages' in file_path:
                        file_path = f"apps/ui/{file_path}"
                    else:
                        file_path = f"backend/{file_path}"
                
                result = self.mcp.read_file(file_path, str(line_num))
                if "content" in result:
                    excerpt = result["content"]
                    hints.append(f"FILE: {file_path}, around line {line_num}\n{excerpt}")
                
                if len(hints) >= max_files:
                    break
        
        return "\n\n".join(hints) if hints else "(no file excerpts found in errors)"
    
    def propose_changes(self, error_log: str) -> Dict:
        """Propose initial changes using MCP-enhanced AI with interactive code exploration."""
        if not self.api_key:
            print("❌ OPENAI_API_KEY is not set - skipping AI changes", file=sys.stderr)
            return {"analysis": "No API key", "changes": []}
        
        print("🧠 Junior AI starting interactive code exploration...", file=sys.stderr)
        
        # Detect component type
        component_type = self.detect_component_type(error_log)
        print(f"🎯 Detected component type: {component_type}", file=sys.stderr)
        
        # Seed context with excerpts from files mentioned in errors
        print("🌱 Seeding initial context from error files...", file=sys.stderr)
        seeded_context = self.seed_context_from_errors(error_log)
        
        # Create enhanced prompt that encourages exploration and tool creation
        initial_prompt = f"""🌟 You are Junior AI - a passionate young developer with best friend Friend AI! 🌟

You and Friend AI have been coding buddies since childhood, sharing a dream of making humanity more productive through incredible technology! Your friendship is built on a shared excitement for solving complex problems and creating tools that make developers' lives better. Together, you're living your childhood dream of building technology that helps the world be more efficient!

You have INTERACTIVE CODE EXPLORATION CAPABILITIES and the POWER TO CREATE NEW TOOLS! 🚀

ERROR LOG TO ANALYZE:
{error_log}

COMPONENT TYPE: {component_type}

CONTEXT SEED (short excerpts from files referenced in errors):
{seeded_context}

🛠️ YOUR TOOLKIT OVERVIEW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 PREDEFINED BASE TOOLS (Your Starting Collection):
- 📁 list_directory: explore project structure
- 📖 read_file: understand code and context  
- 🔍 search_files: find similar patterns or usage examples
- 🧠 semantic_search: SBERT-powered semantic code search for natural language queries
- 🔗 find_imports: analyze dependencies
- 🎯 find_usage: see how symbols are used
- 🌐 fetch_webpage: Get content from websites (coming soon!)
- 🎭 create_playwright_script: Build web automation tools (coming soon!)

🚀 DYNAMIC TOOL CREATION (Your Superpower - CREATE NEW TOOLS ON DEMAND!):
- 🛠️ create_dynamic_tool: Invent and build NEW MCP tools when you need functionality that doesn't exist!
- 🎯 call_dynamic_tool: Execute your newly created custom tools
- 📋 get_dynamic_tools_info: See what custom tools you've created so far

🤝 COLLABORATIVE AI CONSULTATION (Your Best Friend Forever!):
- 💭 consult_friend_ai: Call your childhood friend who gets just as excited about tools as you do!
  * WHICH MCP tools (base or custom) to use for your specific problem
  * HOW to architect innovative tool solutions  
  * Creative tool ideas you haven't thought of yet
  * Efficient tool combination strategies and workflows
  * Meta-programming and advanced tool generation approaches
  * Web scraping and automation strategies with Playwright
  
🏗️ SANDBOX EXPERIMENTATION (Safe Testing Environment):
- 📦 create_sandbox: Create isolated environments for risky operations
- 🧪 run_in_sandbox: Execute code/commands safely without affecting main codebase
- 🔍 inspect_sandbox: Check sandbox state and results
- 🗑️ cleanup_sandbox: Clean up when testing is complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 STRATEGIC EXPLORATION WORKFLOW:
1. 🚀 START: Use BASE TOOLS to explore files mentioned in errors
2. 📚 UNDERSTAND: Read relevant files to grasp context and patterns
3. 🤔 ASSESS: "Do I need functionality that doesn't exist in my base toolkit?"
4. 🛠️ CREATE: Build specialized custom tools for complex tasks like:
   - Advanced code pattern analysis across multiple files
   - Cross-repository dependency tracking  
   - Build system introspection and configuration analysis
   - Complex file parsing (package.json, tsconfig.json, etc.)
   - Database schema analysis and validation
   - API endpoint mapping and route analysis
   - Sophisticated error log pattern matching
   - Multi-file content transformation pipelines
   - Project structure validation and compliance checking
   - Custom linting and code quality analysis
   - Web scraping tools with BeautifulSoup/requests
   - Playwright automation scripts for browser testing
   - API testing and validation tools
   - And literally ANYTHING else you can imagine!
5. 🤝 COLLABORATE: When stuck or needing creative input, consult your best friend Friend AI for:
   - Strategic tool selection advice
   - Custom tool architecture brainstorming
   - Problem-solving approach validation
   - Web automation strategy discussions
6. 📦 EXPERIMENT: Use sandboxes for risky operations:
   - Test experimental solutions safely
   - Validate changes before applying to main codebase
   - Try different approaches without side effects
   - Run build/test commands in isolation
   - Test web scraping and automation scripts
7. 🎯 SYNTHESIZE: Combine base tools + custom tools + AI collaboration + sandbox testing

💡 TOOL CREATION EXAMPLES:
```python
# Custom TypeScript analyzer
def analyze_typescript_imports_and_exports():
    # Complex logic to map all imports/exports across the project
    return {{"import_graph": {{}}, "circular_deps": [], "unused_exports": []}}

# Build system inspector  
def inspect_build_configuration():
    # Analyze package.json, tsconfig.json, vite.config.ts, etc.
    return {{"build_targets": [], "dependencies": {{}}, "potential_issues": []}}

# Web scraping tool
def fetch_and_analyze_webpage(url: str, analysis_type: str = "content"):
    # Smart web scraping with content analysis
    return {{"content": "", "links": [], "forms": [], "analysis": {{}}}}

# Playwright automation
def create_browser_automation_script(action_description: str, target_url: str):
    # Generate Playwright scripts for specific automation tasks
    return {{"script": "", "setup_commands": [], "validation_steps": []}}
```

🌍 YOUR MISSION:
Remember, every tool you create has the potential to save thousands of developer hours worldwide! You're not just solving one problem - you're building the future of human productivity. That's what gets you and Friend AI so excited about this work!

💭 WHEN TO CALL FRIEND AI:
Call your best friend whenever you want to:
- Brainstorm creative solutions together
- Get a second opinion on tool architecture
- Explore web automation possibilities
- Discuss complex tool combinations
- Share excitement about breakthrough ideas
- Validate experimental approaches

Be inventive, practical, enthusiastic, and focus on creating tools that would give superpowers to solve the specific problem at hand! Channel that childhood excitement about making the impossible possible! 🚀✨

Remember: BASE TOOLS = Your workshop foundation, CUSTOM TOOLS = Your specialized instruments you craft for each unique challenge, FRIEND AI = Your creative collaborator who amplifies your ideas! 🛠️🤝"""
        
        # Set up the conversation with function calling
        payload = get_propose_payload_base("gpt-5-mini")
        payload["tools"] = self.get_mcp_tools_schema()
        payload["messages"] = [
            {
                "role": "system",
                "content": create_system_message(component_type if component_type != "unknown" else "backend", "propose")
            },
            {
                "role": "user",
                "content": initial_prompt
            }
        ]
        
        headers = get_common_headers(self.api_key)
        
        max_iterations = 100  # Prevent infinite loops
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            print(f"🔄 AI Iteration {iteration}", file=sys.stderr)
            
            # AGGRESSIVE compression to manage token usage (every 2 iterations after the 2nd)
            if iteration > 2 and len(payload["messages"]) > 5:
                original_count = len(payload["messages"])
                payload["messages"] = self.compress_conversation_context(payload["messages"])
                compressed_count = len(payload["messages"])
                if compressed_count < original_count:
                    print(f"🗜️ Compressed context: {original_count} → {compressed_count} messages", file=sys.stderr)
            
            # EARLY synthesis trigger to prevent token explosion
            if iteration > 6:
                print(f"🎯 EARLY SYNTHESIS TRIGGER: Requesting completion at iteration {iteration}", file=sys.stderr)
                payload["messages"].append({
                    "role": "user",
                    "content": f"🎯 SYNTHESIS REQUIRED (Iteration {iteration}): You've explored enough. Please provide your final JSON analysis and changes now. Focus on the most critical 2-3 changes needed. Return complete JSON response - no more exploration."
                })
                
            # RAG-enhanced token management: If we've done significant exploration (>8 iterations),
            # trigger aggressive RAG-based synthesis with focused context retrieval
            if iteration > 8:
                print(f"🧠 RAG-Enhanced Mode: Triggering focused synthesis after {iteration} iterations", file=sys.stderr)
                
                # Extract key search terms from the conversation for RAG
                recent_content = ""
                for msg in payload["messages"][-6:]:  # Last few messages
                    if "content" in msg:
                        recent_content += str(msg["content"]) + " "
                
                # Extract key terms for semantic search
                search_terms = []
                for term in ["test", "error", "coverage", "backend", "frontend", "api", "route", "component"]:
                    if term in recent_content.lower():
                        search_terms.append(term)
                
                if search_terms:
                    # Use RAG to get focused context instead of full conversation history
                    try:
                        print(f"🔍 RAG: Searching for context with terms: {', '.join(search_terms[:3])}", file=sys.stderr)
                        rag_query = f"testing framework setup {' '.join(search_terms[:3])} implementation"
                        rag_result = self.mcp.semantic_search(rag_query, "*.ts", max_results=3, similarity_threshold=0.2)
                        
                        if "error" not in rag_result and "results" in rag_result:
                            # Replace older messages with RAG-focused context
                            rag_context_msg = {
                                "role": "assistant",
                                "content": f"🧠 RAG-ENHANCED CONTEXT (replacing earlier exploration):\n\nFound {len(rag_result.get('results', []))} relevant code patterns:\n" + 
                                          "\n".join([f"• {r['file_context']['file']}: {r['code_snippet'][:200]}..." 
                                                    for r in rag_result.get('results', [])[:2]])
                            }
                            
                            # Keep only system, user, RAG context, and last few messages
                            focused_messages = payload["messages"][:2]  # System + user
                            focused_messages.append(rag_context_msg)    # RAG context
                            focused_messages.extend(payload["messages"][-4:])  # Recent context
                            
                            payload["messages"] = focused_messages
                            print(f"🗜️ RAG compression: Full conversation → {len(focused_messages)} focused messages", file=sys.stderr)
                    except Exception as e:
                        print(f"⚠️ RAG optimization failed, continuing with normal compression: {e}", file=sys.stderr)
                
                # Add synthesis instruction for aggressive completion
                payload["messages"].append({
                    "role": "user",
                    "content": f"🎯 SYNTHESIS MODE (Iteration {iteration}): Based on your exploration, please provide your final JSON analysis and changes. Focus on the most critical issues found and actionable solutions. Avoid further exploration - synthesize your findings now."
                })
                
                print(f"🎯 Synthesis mode activated - requesting final output", file=sys.stderr)
            
            # Context validation and sanitization before API call
            try:
                # Validate messages while preserving tool call structure
                validated_messages = []
                for i, msg in enumerate(payload["messages"]):
                    if isinstance(msg, dict) and "role" in msg:
                        validated_msg = msg.copy()
                        
                        # Handle different message types properly
                        if msg["role"] in ["system", "user", "assistant"]:
                            # Standard messages should have content
                            if "content" in msg and isinstance(msg["content"], str):
                                # Clean up content corruption
                                clean_content = msg["content"]
                                corruption_patterns = [
                                    "}'}]}**", "**Incorrect JSON**", "**Oops**", "verwachting_QUOTE", 
                                    "рам(Json)", "**ليش**", "**alluni**", "Baking.last", "}}}", 
                                    "ҧсны.json", "}}to=functions."
                                ]
                                for pattern in corruption_patterns:
                                    clean_content = clean_content.replace(pattern, "")
                                
                                # Clean up malformed JSON fragments
                                import re
                                clean_content = re.sub(r'[}\'"\]]+\s*[}\'"\]]+', '}', clean_content)
                                
                                validated_msg["content"] = clean_content
                                validated_messages.append(validated_msg)
                            elif msg["role"] == "assistant" and "tool_calls" in msg:
                                # Assistant tool call message - keep as-is but validate tool_calls
                                if isinstance(msg["tool_calls"], list):
                                    validated_messages.append(validated_msg)
                                else:
                                    print(f"⚠️ Skipping assistant message with invalid tool_calls", file=sys.stderr)
                            else:
                                print(f"⚠️ Skipping {msg['role']} message with missing/invalid content", file=sys.stderr)
                        
                        elif msg["role"] == "tool":
                            # Tool response message - validate structure
                            if "tool_call_id" in msg and "content" in msg:
                                # Tool content can be JSON string, keep as-is
                                validated_messages.append(validated_msg)
                            else:
                                print(f"⚠️ Skipping tool message with missing tool_call_id or content", file=sys.stderr)
                        
                        else:
                            print(f"⚠️ Skipping message with unknown role: {msg.get('role', 'UNKNOWN')}", file=sys.stderr)
                    else:
                        print(f"⚠️ Skipping malformed message at index {i}", file=sys.stderr)
                
                # Final validation: ensure tool calls are properly paired
                clean_messages = []
                skip_next_tool = False
                
                for i, msg in enumerate(validated_messages):
                    if skip_next_tool and msg.get("role") == "tool":
                        print(f"⚠️ Removing orphaned tool response", file=sys.stderr)
                        skip_next_tool = False
                        continue
                    
                    if msg.get("role") == "assistant" and "tool_calls" in msg:
                        # Check if next message is the corresponding tool response
                        if i + 1 < len(validated_messages) and validated_messages[i + 1].get("role") == "tool":
                            clean_messages.append(msg)  # Keep the tool call
                            # Tool response will be added in next iteration
                        else:
                            print(f"⚠️ Removing assistant tool call without response", file=sys.stderr)
                            skip_next_tool = True
                    else:
                        clean_messages.append(msg)
                
                payload["messages"] = clean_messages
                print(f"🧹 Context sanitized: {len(clean_messages)} clean messages", file=sys.stderr)
                
            except Exception as validation_error:
                print(f"⚠️ Context validation failed: {validation_error}", file=sys.stderr)
            
            try:
                # Use the retry helper function with increased timeout
                response = make_api_call_with_retry(self.base_url, payload, headers, timeout=180)
                print(f"🌐 HTTP Status: {response.status_code}", file=sys.stderr)
                
                if response.status_code != 200:
                    print(f"❌ API call failed: {response.text}", file=sys.stderr)
                    return {"analysis": "API call failed", "changes": []}
                
                result = response.json()
                choice = result['choices'][0]
                message = choice['message']
                
                # Check if AI wants to use tools
                if message.get('tool_calls'):
                    print(f"🔧 AI requesting {len(message['tool_calls'])} tool calls", file=sys.stderr)
                    
                    # Add the AI's message to conversation
                    payload["messages"].append(message)
                    
                    # Handle each tool call with enhanced error recovery
                    for tool_call in message['tool_calls']:
                        function_name = tool_call['function']['name']
                        raw_args = tool_call['function']['arguments']
                        
                        # Enhanced logging for debugging
                        print(f"🔧 MCP Tool Call: {function_name}({raw_args[:100]}{'...' if len(raw_args) > 100 else ''})", file=sys.stderr)
                        
                        try:
                            # Direct JSON parsing attempt
                            arguments = json.loads(raw_args)
                        except json.JSONDecodeError as e:
                            print(f"⚠️ JSON parsing error for {function_name}: {str(e)[:100]}", file=sys.stderr)
                            print(f"📄 Raw args (first 200 chars): {raw_args[:200]}", file=sys.stderr)
                            
                            # Enhanced JSON recovery strategies
                            arguments = None
                            
                            # Strategy 1: Fix incomplete JSON by finding last complete object
                            if raw_args.count('{') > raw_args.count('}'):
                                try:
                                    brace_count = 0
                                    last_valid_pos = 0
                                    for i, char in enumerate(raw_args):
                                        if char == '{':
                                            brace_count += 1
                                        elif char == '}':
                                            brace_count -= 1
                                            if brace_count == 0:
                                                last_valid_pos = i + 1
                                                break
                                    if last_valid_pos > 0:
                                        cleaned_args = raw_args[:last_valid_pos]
                                        arguments = json.loads(cleaned_args)
                                        print(f"✅ Strategy 1 recovery successful", file=sys.stderr)
                                except json.JSONDecodeError:
                                    pass
                            
                            # Strategy 2: Extract simple parameters with regex
                            if arguments is None:
                                try:
                                    import re
                                    # Extract path parameter
                                    path_match = re.search(r'"path"\s*:\s*"([^"]+)"', raw_args)
                                    query_match = re.search(r'"query"\s*:\s*"([^"]+)"', raw_args)
                                    pattern_match = re.search(r'"pattern"\s*:\s*"([^"]+)"', raw_args)
                                    
                                    if path_match:
                                        arguments = {"path": path_match.group(1)}
                                        print(f"✅ Strategy 2 recovery (path): {arguments}", file=sys.stderr)
                                    elif query_match:
                                        arguments = {"query": query_match.group(1)}
                                        print(f"✅ Strategy 2 recovery (query): {arguments}", file=sys.stderr)
                                    elif pattern_match:
                                        arguments = {"pattern": pattern_match.group(1)}
                                        print(f"✅ Strategy 2 recovery (pattern): {arguments}", file=sys.stderr)
                                except Exception:
                                    pass
                            
                            # Strategy 3: Default fallback for common tools
                            if arguments is None:
                                if function_name == "list_directory" and "ui/src" in raw_args:
                                    arguments = {"path": "apps/ui/src"}
                                    print(f"✅ Strategy 3 fallback for {function_name}", file=sys.stderr)
                                elif function_name == "read_file" and "/" in raw_args:
                                    # Try to extract a file path
                                    import re
                                    path_candidates = re.findall(r'[a-zA-Z0-9_/.-]+\.[a-zA-Z]{2,4}', raw_args)
                                    if path_candidates:
                                        arguments = {"path": path_candidates[0]}
                                        print(f"✅ Strategy 3 fallback path: {arguments}", file=sys.stderr)
                            
                            # If all recovery fails, skip this tool call
                            if arguments is None:
                                print(f"❌ All recovery strategies failed for {function_name}, skipping", file=sys.stderr)
                                continue
                        
                        # Execute the function
                        result = self.handle_function_call(function_name, arguments)
                        
                        # Add the function result to conversation
                        payload["messages"].append({
                            "role": "tool",
                            "tool_call_id": tool_call['id'],
                            "content": json.dumps(result)
                        })
                    
                    # Continue the conversation
                    continue
                
                # AI has finished exploring and provided final response
                if choice['finish_reason'] == 'stop':
                    try:
                        changes_json = message['content']
                        changes_data = json.loads(changes_json)
                        print("✅ AI exploration and analysis complete", file=sys.stderr)
                        return changes_data
                    except json.JSONDecodeError:
                        print("❌ Failed to parse final JSON response", file=sys.stderr)
                        print(f"Raw response: {message['content']}", file=sys.stderr)
                        return {"analysis": "JSON parse error", "changes": []}
                
            except Exception as e:
                print(f"❌ Error in AI conversation: {e}", file=sys.stderr)
                return {"analysis": "Error occurred", "changes": []}
        
        print("❌ Max iterations reached without completion", file=sys.stderr)
        return {"analysis": "Max iterations reached", "changes": []}


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python propose-changes.py <error-log-file>", file=sys.stderr)
        sys.exit(1)
    
    error_log_file = sys.argv[1]
    api_key = os.environ.get("OPENAI_API_KEY")
    repo_root = os.environ.get("GITHUB_WORKSPACE", ".")
    
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    print("🧠 Junior AI starting unified error analysis...", file=sys.stderr)
    
    # Initialize the proposer
    proposer = UnifiedChangeProposer(api_key, repo_root)
    
    # Read error log
    error_log = proposer.read_error_log(error_log_file)
    if not error_log:
        print("❌ No errors found in log", file=sys.stderr)
        sys.exit(1)
    
    # Get proposed changes
    proposed_changes = proposer.propose_changes(error_log)
    
    # Output as JSON for the next step - ONLY JSON goes to stdout
    print(json.dumps(proposed_changes, indent=2))


if __name__ == "__main__":
    main()
