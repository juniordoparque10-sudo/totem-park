const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...CORS_HEADERS },
  });
}

function base64UrlDecode(value) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(value)));
}

async function verifyFirebaseToken(token, env) {
  const [headerPart, payloadPart, signaturePart] = token.split(".");

  if (!headerPart || !payloadPart || !signaturePart) {
    throw new Error("Token inválido.");
  }

  const header = decodeJwtPart(headerPart);
  const payload = decodeJwtPart(payloadPart);
  const projectId = env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID não configurado.");
  }

  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Token não pertence ao projeto Firebase esperado.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) {
    throw new Error("Token expirado.");
  }

  const jwksResponse = await fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
    { cf: { cacheTtl: 300, cacheEverything: true } },
  );
  const jwks = await jwksResponse.json();
  const jwk = jwks.keys?.find((key) => key.kid === header.kid);

  if (!jwk) {
    throw new Error("Chave pública do Firebase não encontrada.");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    base64UrlDecode(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  );

  if (!verified) {
    throw new Error("Assinatura do token inválida.");
  }

  return payload;
}

function getBearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function getClientIdFromPath(path) {
  const match = String(path || "").match(/^clients\/([^/]+)\//);
  return match?.[1] || "";
}

function canAccessClient(tokenPayload, clientId, env) {
  const masterEmails = String(env.MASTER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const email = String(tokenPayload.email || "").toLowerCase();
  const tokenClientId = tokenPayload.clientId || tokenPayload.client_id;
  const tokenClientIds = Array.isArray(tokenPayload.clientIds) ? tokenPayload.clientIds : [];

  return (
    masterEmails.includes(email) ||
    tokenClientId === clientId ||
    tokenClientIds.includes(clientId)
  );
}

function validateStoragePath(path) {
  if (!path || typeof path !== "string") {
    throw new Error("Caminho do arquivo não informado.");
  }

  if (!/^clients\/[^/]+\/(media|marketing|templates|profile)\//.test(path)) {
    throw new Error("Caminho do arquivo fora do padrão permitido.");
  }

  if (path.includes("..") || path.includes("//")) {
    throw new Error("Caminho do arquivo inválido.");
  }
}

async function ensureAuthorized(request, env, storagePath) {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error("Token Firebase ausente.");
  }

  const payload = await verifyFirebaseToken(token, env);
  const clientId = getClientIdFromPath(storagePath);

  if (!clientId || !canAccessClient(payload, clientId, env)) {
    throw new Error("Usuário sem permissão para este cliente.");
  }

  return payload;
}

async function handleUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get("file");
  const path = String(formData.get("path") || "");
  const contentType = String(formData.get("contentType") || file?.type || "application/octet-stream");
  const metadata = String(formData.get("metadata") || "{}");

  validateStoragePath(path);
  await ensureAuthorized(request, env, path);

  if (!file || typeof file.arrayBuffer !== "function") {
    return jsonResponse({ error: "Arquivo não informado." }, 400);
  }

  await env.MEDIA_BUCKET.put(path, file.stream(), {
    httpMetadata: { contentType },
    customMetadata: JSON.parse(metadata),
  });

  const publicBaseUrl = String(env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const publicUrl = publicBaseUrl ? `${publicBaseUrl}/${encodeURI(path)}` : "";

  return jsonResponse({
    storageProvider: "r2",
    storagePath: path,
    storageKey: path,
    publicUrl,
    url: publicUrl,
  });
}

async function handleDelete(request, env) {
  const body = await request.json().catch(() => ({}));
  const path = String(body.storagePath || body.storageKey || "");

  validateStoragePath(path);
  await ensureAuthorized(request, env, path);
  await env.MEDIA_BUCKET.delete(path);

  return jsonResponse({ ok: true, storageProvider: "r2", storagePath: path });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Método não permitido." }, 405);
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/upload") {
        return await handleUpload(request, env);
      }

      if (url.pathname === "/delete") {
        return await handleDelete(request, env);
      }

      return jsonResponse({ error: "Rota não encontrada." }, 404);
    } catch (error) {
      return jsonResponse({ error: error.message || "Erro no Worker de storage." }, 400);
    }
  },
};
