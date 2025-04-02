export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
  
        if (pathParts.length === 0) {
            return new Response(homePage(), { headers: { 'Content-Type': 'text/html' } });
        }
  
        const sessionId = pathParts[0];
  
        if (!/^[0-9A-Fa-f]{8}$/.test(sessionId)) {
            return new Response("Invalid session ID.", { status: 400 });
        }
  
        if (pathParts.length === 1) {
            return new Response(await renderSession(sessionId), { headers: { 'Content-Type': 'text/html' } });
        }
  
        if (pathParts[1] === 'test') {
            let body = '';
            const contentType = request.headers.get("content-type") || "";
            const queryParams = Object.fromEntries(url.searchParams);
  
            // Handle body parsing based on content type
            if (contentType.includes("application/json")) {
                body = JSON.stringify(await request.json(), null, 2);
            } else if (contentType.includes("application/x-www-form-urlencoded")) {
                body = new URLSearchParams(await request.text()).toString();
            } else {
                body = await request.text();
            }
  
            // Store session data with a timestamp
            sessionStore[sessionId] = {
                method: request.method,
                headers: Object.fromEntries(request.headers),
                body,
                queryParams,
                timestamp: Date.now() // Store timestamp of when the session was created
            };
  
            // Automatically clear out old session data after 10 minutes
            setTimeout(() => {
                clearExpiredSessions();
            }, 600000); // 10 minutes = 600,000 ms
  
            return new Response("Captured request.", { status: 200 });
        }
  
        return new Response("Not found", { status: 404 });
    }
  };
  
  const sessionStore = {};
  
  // Homepage that generates a random session link
  function homePage() {
    const randomSession = Math.random().toString(16).slice(2, 10).toUpperCase();
    return `
    <html>
    <head><title>API Debugger</title></head>
    <body>
        <h1>Welcome to the API Debugger</h1>
        <p>To test an API, send requests to <code>/YOUR_SESSION/test</code>.</p>
        <p>View request details at <code>/YOUR_SESSION</code>.</p>
        <a href="/${randomSession}">Start Debugging</a>
    </body>
    </html>
    `;
  }
  
  // Render session data including query parameters
  async function renderSession(sessionId) {
    const data = sessionStore[sessionId];
    if (!data) {
        return `<html><body><h1>No data captured yet for ${sessionId}</h1></body></html>`;
    }
    return `
    <html>
    <head><title>Session ${sessionId}</title></head>
    <body>
        <h1>Session ${sessionId}</h1>
        <p><strong>Method:</strong> ${data.method}</p>
        <p><strong>Headers:</strong></p>
        <pre>${JSON.stringify(data.headers, null, 2)}</pre>
        <p><strong>Body:</strong></p>
        <pre>${data.body}</pre>
        <p><strong>Query Parameters:</strong></p>
        <pre>${JSON.stringify(data.queryParams, null, 2)}</pre>
    </body>
    </html>
    `;
  }
  
  // Function to clear sessions that are older than 10 minutes
  function clearExpiredSessions() {
    const now = Date.now();
    for (const sessionId in sessionStore) {
        const session = sessionStore[sessionId];
        // Check if session data is older than 10 minutes (600000 ms)
        if (now - session.timestamp > 600000) {
            delete sessionStore[sessionId]; // Clear the session data
        }
    }
  }
  