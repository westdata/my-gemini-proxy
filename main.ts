import { serve } from "https://deno.land/std/http/server.ts";

// 从 Deno Deploy 的环境变量中读取你的 Gemini API Key
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GOOGLE_API_BASE_URL = "https://generativelanguage.googleapis.com";

// 跨域预检请求的响应头
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // 允许任何来源访问
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-goog-api-key",
};

async function handler(req: Request): Promise<Response> {
  // 处理浏览器的 OPTIONS 预检请求
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // 检查 API Key 是否已配置
  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY is not set on the server." }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }

  // 构造要转发到 Google API 的 URL
  const url = new URL(req.url);
  const targetUrl = `${GOOGLE_API_BASE_URL}${url.pathname}${url.search}`;

  // 复制客户端的请求头，并添加我们的 API Key
  const headers = new Headers(req.headers);
  headers.set("x-goog-api-key", GEMINI_API_KEY);
  headers.delete("host");

  try {
    // 发起真正的请求到 Google API
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.body,
    });

    // 将 Google 的响应原样返回给客户端，并附加上 CORS 头
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", CORS_HEADERS["Access-Control-Allow-Origin"]);
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to forward request to Google API.", details: error.message }),
      { status: 502, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
}

// 启动 Deno 服务
serve(handler);
