# API Debugger

A lightweight API debugging tool built with **Cloudflare Workers** and **D1**. This tool allows you to inspect HTTP requests, including methods, headers, body, and query parameters, without requiring external storage.

## Features
- **Ephemeral Sessions**: Each session lasts **10 minutes** before being automatically deleted.
- **Supports All HTTP Methods**: GET, POST, PATCH, DELETE, etc.
- **Captures Request Data**:
  - HTTP Method
  - Headers
  - Request Body (JSON/Form-Encoded/Text)
  - Query Parameters
- **Stateless & Serverless**: Runs entirely on Cloudflare Workers and D1.

## Usage
1. **Start a Session**  
   Open the base URL in your browser:  
   ```
   https://api-test.worker.dev/
   ```
   You'll be redirected to a unique session URL (e.g., `/DEADBEEF`).

2. **Send API Requests**  
   Send requests to:  
   ```
   https://api-test.worker.dev/DEADBEEF/test
   ```
   - Example (cURL):
     ```sh
     curl -X POST "https://api-test.worker.dev/DEADBEEF/test" \
     -H "Content-Type: application/json" \
     -d '{"message":"Hello, world!"}'
     ```

3. **View Captured Data**  
   Open the session URL (`/DEADBEEF`) in your browser to inspect the request details.

## Deployment
### 1. Create Cloudflare D1 Database
```sh
wrangler d1 create api-debugger
```

### 2. Update `wrangler.toml`
```toml
[[d1_databases]]
binding = "DB"
database_name = "api-debugger"
```

### 3. Initialize Database Schema
```sh
wrangler d1 execute api-debugger --file=init.sql
```
**`init.sql` file:**
```sql
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    method TEXT,
    headers TEXT,
    body TEXT,
    query_params TEXT,
    timestamp INTEGER
);
```

### 4. Deploy the Worker
```sh
wrangler publish
```

## How It Works
1. When a request is made to `/SESSION_ID/test`, the request data is stored in **Cloudflare D1**.
2. Accessing `/SESSION_ID` displays the captured request details.
3. Sessions automatically expire after **10 minutes**.

## License
This project is licensed under the MIT License.

---

**Contributors:**  
theHastyOne

Happy Debugging! 🚀

