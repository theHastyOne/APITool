export default {
    async fetch(request, env) {
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
            return new Response(await renderSession(sessionId, env), { headers: { 'Content-Type': 'text/html' } });
        }

        if (pathParts[1] === 'test') {
            let body = '';
            const contentType = request.headers.get("content-type") || "";
            const queryParams = Object.fromEntries(url.searchParams);

            if (contentType.includes("application/json")) {
                body = JSON.stringify(await request.json(), null, 2);
            } else if (contentType.includes("application/x-www-form-urlencoded")) {
                body = new URLSearchParams(await request.text()).toString();
            } else {
                body = await request.text();
            }

            const timestamp = Date.now();

            await env.DB.prepare(`
                INSERT INTO session (id, method, headers, body, query_params, timestamp) 
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET 
                    method = excluded.method, 
                    headers = excluded.headers, 
                    body = excluded.body, 
                    query_params = excluded.query_params, 
                    timestamp = excluded.timestamp
            `).bind(sessionId, request.method, JSON.stringify(Object.fromEntries(request.headers)), body, JSON.stringify(queryParams), timestamp).run();

            return new Response("Captured request.", { status: 200 });
        }

        return new Response("Not found", { status: 404 });
    }
};

async function renderSession(sessionId, env) {
    await cleanupOldSessions(env); // Auto-delete expired sessions

    const { results } = await env.DB.prepare("SELECT * FROM session WHERE id = ?").bind(sessionId).all();
    if (!results.length) {
        return `<html><body><h1>No data captured yet for ${sessionId}</h1></body></html>`;
    }
    const session = results[0];

    return `
    <html>
    <head><title>Session ${sessionId}</title></head>
    <body>
        <h1>Session ${sessionId}</h1>
        <p><strong>Method:</strong> ${session.method}</p>
        <p><strong>Headers:</strong></p>
        <pre>${JSON.stringify(JSON.parse(session.headers), null, 2)}</pre>
        <p><strong>Body:</strong></p>
        <pre>${session.body}</pre>
        <p><strong>Query Parameters:</strong></p>
        <pre>${JSON.stringify(JSON.parse(session.query_params), null, 2)}</pre>
    </body>
    </html>
    `;
}

async function cleanupOldSessions(env) {
    const expiryTime = Date.now() - 600000; // 10 minutes ago
    await env.DB.prepare("DELETE FROM session WHERE timestamp < ?").bind(expiryTime).run();
}

function homePage() {
    const randomSession = Math.random().toString(16).slice(2, 10).toUpperCase();
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Debugger</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            padding: 20px;
            background: white;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            text-align: center;
        }
        h1 {
            color: #333;
        }
        p {
            color: #666;
        }
        a {
            display: inline-block;
            margin-top: 10px;
            padding: 10px 15px;
            background-color: #007BFF;
            color: white;
            text-decoration: none;
            border-radius: 5px;
        }
        a:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to the API Debugger</h1>
        <p>To test an API, send requests to <code>/YOUR_SESSION/test</code>.</p>
        <p>View request details at <code>/YOUR_SESSION</code>.</p>
        <a href="/${randomSession}">Start Debugging</a>
    </div>
</body>
</html>

    `;
}
