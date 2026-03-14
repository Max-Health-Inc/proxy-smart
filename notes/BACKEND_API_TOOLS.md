# Backend API Tool Integration

This document explains how the MCP server integrates backend APIs as callable functions for the AI assistant using OpenAI function calling.

## Overview

The MCP server now exposes backend API endpoints as tools/functions that the AI can call during conversations. This allows the AI to:

- Retrieve data from the backend (users, apps, servers, roles, etc.)
- Perform actions on behalf of users
- Provide real-time information from the system

## Architecture

```
─────────────────┐
│   Frontend UI   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Backend API    │◄─────┤  MCP Server      │
│  (Elysia)       │      │  (FastAPI)       │
└─────────────────┘      └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  OpenAI API      │
                         │  (with tools)    │
                         └──────────────────┘
```

## Components

### 1. Python OpenAPI Client

Generated from the backend's OpenAPI spec:

- **Location**: `mcp-server/src/api_client/`
- **Generation**: Run `python scripts/generate_backend_python_client.py`
- **APIs**: HealthcareUsersApi, SmartAppsApi, ServersApi, RolesApi, etc.

### 2. Backend API Tools Wrapper

**File**: `mcp-server/src/services/backend_tools.py`

Wraps the generated Python client and exposes functions in OpenAI tool format:

```python
class BackendAPITools:
    def get_function_definitions(self) -> List[Dict[str, Any]]:
        """Returns OpenAI function definitions"""
      
    async def execute_function(self, function_name: str, arguments: Dict[str, Any]) -> Any:
        """Executes backend API calls"""
```

### 3. AI Assistant Integration

**File**: `mcp-server/src/services/ai_assistant.py`

The AI assistant now:

1. Initializes `BackendAPITools` on startup
2. Passes tool definitions to OpenAI in the `tools` parameter
3. Handles function call events during streaming
4. Executes backend API calls when requested by AI
5. Returns results to OpenAI for natural language response

## Available Functions

The AI can now call these backend API functions:

### User Management

- `list_healthcare_users` - Get all users
- `get_healthcare_user(user_id)` - Get user details
- `create_healthcare_user(username, email, firstName, lastName, password, roles)` - Create new user

### Application Management

- `list_smart_apps` - Get all registered SMART apps

### Server Management

- `list_fhir_servers` - Get all FHIR servers

### Role Management

- `list_roles` - Get all available roles

## Configuration

Add to `mcp-server/.env`:

```env
# Backend API Configuration
BACKEND_API_URL=http://localhost:3001
BACKEND_API_TOKEN=  # Optional JWT token for authenticated calls
```

## Example Usage

**User asks**: "Show me all the users in the system"

1. **OpenAI decides** to call the `list_healthcare_users` function
2. **MCP server** receives the function call event
3. **Backend API** is called via the Python client
4. **Result** is sent back to OpenAI
5. **AI formats** the data in a user-friendly response

### Streaming Events

During streaming responses, the frontend receives these event types:

```typescript
// Regular text content
{ type: 'content', content: '...' }

// Function call initiated
{ type: 'function_call', function: 'list_healthcare_users', arguments: {} }

// Function result received
{ type: 'function_result', function: 'list_healthcare_users', result: {...} }

// Function execution error
{ type: 'function_error', function: '...', error: '...' }

// Standard completion
{ type: 'done', mode: 'openai', confidence: 0.9 }
```

## Regenerating the Client

When backend APIs change:

1. **Export OpenAPI spec**: `cd backend && bun run export-openapi`
2. **Generate Python client**: `python scripts/generate_backend_python_client.py`
3. **Restart MCP server**: The new APIs will be automatically registered

## Security Considerations

1. **Authentication**: Pass JWT tokens via `BACKEND_API_TOKEN` for authenticated calls
2. **Validation**: All function arguments are validated by Pydantic
3. **Error Handling**: API errors are caught and returned as function_error events
4. **Rate Limiting**: OpenAI's function calling respects backend rate limits

## Extending with New Functions

To add new backend API functions:

1. **Add to `get_function_definitions()`**:

```python
{
    "type": "function",
    "function": {
        "name": "your_function_name",
        "description": "When to use this function",
        "parameters": {
            "type": "object",
            "properties": {
                "param_name": {
                    "type": "string",
                    "description": "Parameter description"
                }
            },
            "required": ["param_name"]
        }
    }
}
```

2. **Add to `execute_function()`**:

```python
elif function_name == "your_function_name":
    result = self.some_api.some_method(arguments.get("param_name"))
    return {"result": result.to_dict()}
```

## Testing

Test function calling manually:

```bash
# Start MCP server
cd mcp-server
uv run python -m src.main

# In another terminal, test via API
curl -X POST http://localhost:8081/ai/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "List all healthcare users",
    "conversation_id": "test-123"
  }'
```

Watch the logs for function call events.

## Future Enhancements

- [ ] Add more backend APIs (identity providers, launch contexts)
- [ ] Support complex multi-step workflows
- [ ] Add function call caching
- [ ] Implement permission-aware function calling
- [ ] Add function call analytics
