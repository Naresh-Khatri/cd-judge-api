# Submissions API Documentation

The Submissions API allows you to execute code in various programming languages and retrieve the results.

## Authentication

All requests to the Submissions API require a `Bearer` token in the `Authorization` header.

```http
Authorization: Bearer <your_api_key_or_session_token>
```

- **API Key**: Use the secret API key provided in your dashboard.
- **Session Token**: Internal usage for the playground (requires an active session).

---

## 1. Submit Code for Execution

Submit code to be executed by the worker. This operation is asynchronous and returns a Job ID.

### Endpoint
`POST /api/v1/submissions`

### Request Body
The request body must be a JSON object with the following fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `code` | `string` | The source code to be executed. |
| `lang` | `string` | The programming language. Supported: `py`, `js`, `java`, `cpp`. |

**Example Request:**
```json
{
  "code": "print('Hello, World!')",
  "lang": "py"
}
```

### Success Response
- **Status Code**: `200 OK`
- **Body**:
  - `id`: `string` - The unique identifier for the execution job.

**Example Response:**
```json
{
  "id": "12345"
}
```

### Error Responses
- **401 Unauthorized**: Invalid or missing authentication token.
- **400 Bad Request**: Invalid request body (e.g., missing fields).
- **500 Internal Server Error**: An error occurred on the server.

---

## 2. Get Execution Status and Result

Retrieve the status and output of a previously submitted execution job.

### Endpoint
`GET /api/v1/submissions/[id]`

### Path Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | The Job ID returned from the POST request. |

### Success Response
- **Status Code**: `200 OK`
- **Body**:
  - `id`: `string` - The Job ID.
  - `status`: `string` - The current status of the job (e.g., `waiting`, `active`, `completed`, `failed`).
  - `result`: `object | null` - The output of the execution (only available if status is `completed`).
  - `submittedAt`: `number` - Timestamp when the job was submitted.
  - `processedAt`: `number | null` - Timestamp when the job started processing.
  - `finishedAt`: `number | null` - Timestamp when the job finished.

The `result` object contains:
- `verdict`: `"OK" | "CE" | "RE" | "SG" | "TO" | "XX"`
- `time`: Execution time in milliseconds.
- `memory`: Peak memory usage in bytes.
- `stdout`: Standard output string.
- `stderr`: Standard error string.
- `exitCode`: Process exit code.
- `exitSignal`: Process exit signal.
- `lineNumber`: Line number where the error occurred (if applicable).
- `errorType`: Type of runtime error (if applicable).

**Example Response:**
```json
{
  "id": "12345",
  "status": "completed",
  "result": {
    "verdict": "OK",
    "stdout": "Hello, World!\n",
    "stderr": "",
    "exitCode": 0,
    "time": 50,
    "memory": 1048576,
    "exitSignal": 0
  },
  "submittedAt": 1703259281000,
  "processedAt": 1703259281100,
  "finishedAt": 1703259281200
}
```

### Error Responses
- **401 Unauthorized**: Invalid or missing authentication token.
- **404 Not Found**: Job with the specified ID was not found.
