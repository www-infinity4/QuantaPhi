package org.quantaphi.bubbles;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Local, open-source ChatGPT plan-use OAuth client. No shared Bubbles server
 * ever receives an OpenAI access, refresh or ID token. PKCE + loopback OAuth
 * must be started by a deliberate user tap; never infer consent from a session.
 */
final class ChatGPTSignIn {
    interface Listener { void result(String message); }
    private static final String AUTH = "https://auth.openai.com";
    private static final String TOKEN = AUTH + "/api/accounts/oauth/token";
    private static final String RESOURCE = "https://api.openai.com/v1";
    private static final String SCOPE = "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
    private static final String PREF = "bubbles-siwc";
    private static final String ALIAS = "bubbles-chatgpt-aes";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Handler UI = new Handler(Looper.getMainLooper());
    private static final Object SESSION_LOCK = new Object();

    private ChatGPTSignIn() {}

    static void start(Activity activity, Listener listener) {
        new Thread(() -> {
            String outcome;
            try { outcome = authorize(activity); }
            catch (Exception ex) { outcome = "ChatGPT sign-in failed: " + safeError(ex); }
            final String message = outcome;
            UI.post(() -> listener.result(message));
        }, "bubbles-chatgpt-oauth").start();
    }

    static String status(Context ctx) {
        try {
            JSONObject session = read(ctx);
            if (session == null) return "ChatGPT not connected · Oracle available";
            String email = session.optString("email", "ChatGPT account");
            return hasPlan(session)
                    ? "ChatGPT connected: " + email + " · model " + session.optString("model", "selecting")
                    : "ChatGPT signed in: " + email + " · plan permission not granted";
        } catch (Exception e) { return "ChatGPT credential storage unavailable"; }
    }

    static boolean hasPlan(Context ctx) {
        try { return hasPlan(read(ctx)); } catch (Exception e) { return false; }
    }

    private static boolean hasPlan(JSONObject session) {
        if (session == null) return false;
        String scopes = " " + session.optString("scope", "").trim() + " ";
        return scopes.contains(" chatgpt.tokens.use.direct ")
                && scopes.contains(" resource.invoke ")
                && session.optString("access_token", "").length() > 12;
    }

    static void signOut(Context context, Listener listener) {
        new Thread(() -> {
            String result = "Signed out of ChatGPT on this phone.";
            try {
                JSONObject s = read(context);
                if (s != null && !s.optString("refresh_token", "").isEmpty()) {
                    try {
                        form(TOKEN.replace("/oauth/token", "/oauth/revoke"), new String[][]{
                                {"token", s.getString("refresh_token")}, {"token_type_hint", "refresh_token"},
                                {"client_id", s.getString("client_id")}
                        });
                    } catch (Exception ignored) {
                        result = "Signed out locally. Remote revocation not confirmed; disconnect Bubbles in ChatGPT settings if needed.";
                    }
                }
            } catch (Exception ignored) { result = "Local sign-out completed."; }
            clear(context);
            final String message = result;
            UI.post(() -> listener.result(message));
        }, "bubbles-chatgpt-signout").start();
    }

    private static String authorize(Activity activity) throws Exception {
        // The same device installation keeps a stable host ID, never shared with other users.
        SharedPreferences prefs = activity.getSharedPreferences(PREF, Context.MODE_PRIVATE);
        String host = prefs.getString("host", "");
        if (host.isEmpty()) {
            host = "urn:uuid:" + UUID.randomUUID();
            if (!prefs.edit().putString("host", host).commit()) throw new Exception("host storage failed");
        }
        JSONObject previous = read(activity);
        final String issued = previous == null ? "" : previous.optString("client_id", "");
        final String client = issued.isEmpty() ? "dynamic_agent_client" : issued;
        final String state = random(), nonce = random(), verifier = random();
        try (ServerSocket server = new ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"))) {
            server.setSoTimeout(180000);
            String redirect = "http://127.0.0.1:" + server.getLocalPort() + "/auth/callback";
            Uri.Builder url = Uri.parse(AUTH + "/api/accounts/authorize").buildUpon()
                    .appendQueryParameter("client_id", client)
                    .appendQueryParameter("ext_agent_host_id", host)
                    .appendQueryParameter("response_type", "code")
                    .appendQueryParameter("redirect_uri", redirect)
                    .appendQueryParameter("scope", SCOPE)
                    .appendQueryParameter("resource", RESOURCE)
                    .appendQueryParameter("state", state)
                    .appendQueryParameter("nonce", nonce)
                    .appendQueryParameter("code_challenge_method", "S256")
                    .appendQueryParameter("code_challenge", sha256(verifier));
            if (issued.isEmpty()) {
                url.appendQueryParameter("agent_name_hint", "Bubbles AI");
            } else {
                String hint = previous.optString("id_token", "");
                if (!hint.isEmpty()) url.appendQueryParameter("id_token_hint", hint);
                String email = previous.optString("email", "");
                if (!email.isEmpty()) url.appendQueryParameter("login_hint", email);
            }
            activity.runOnUiThread(() -> activity.startActivity(
                    new Intent(Intent.ACTION_VIEW, url.build())
                            .addCategory(Intent.CATEGORY_BROWSABLE)));
            Uri callback;
            try (Socket socket = server.accept()) {
                socket.setSoTimeout(12000);
                // A loopback listener may receive unrelated requests: only the exact
                // callback path, matching state and issued client proceed to exchange.
                BufferedReader in = new BufferedReader(new InputStreamReader(
                        socket.getInputStream(), StandardCharsets.US_ASCII));
                String line = in.readLine();
                if (line == null || line.length() > 8192 || !line.startsWith("GET "))
                    throw new Exception("invalid callback request");
                String requestPath = line.split(" ", 3)[1];
                callback = Uri.parse("http://127.0.0.1:" + server.getLocalPort() + requestPath);
                boolean valid = "/auth/callback".equals(callback.getPath())
                        && state.equals(callback.getQueryParameter("state"));
                String html = valid ? "<h2>Return to Bubbles AI</h2><p>You may close this tab.</p>"
                        : "<h2>Invalid Bubbles sign-in callback</h2>";
                byte[] payload = ("<!doctype html><meta name=viewport content='width=device-width'>"
                        + html).getBytes(StandardCharsets.UTF_8);
                OutputStream output = socket.getOutputStream();
                output.write(("HTTP/1.1 " + (valid ? "200 OK" : "400 Bad Request")
                        + "\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store"
                        + "\r\nContent-Length: " + payload.length + "\r\nConnection: close\r\n\r\n")
                        .getBytes(StandardCharsets.US_ASCII));
                output.write(payload);
                output.flush();
                if (!valid) throw new Exception("state or callback path rejected");
            }
            if (!callback.getQueryParameterNames().contains("code")) {
                throw new Exception("authorization denied or no code returned");
            }
            String callbackClient = callback.getQueryParameter("client_id");
            String actualClient;
            if (issued.isEmpty()) {
                if (callbackClient == null || !callbackClient.startsWith("oaiapp_"))
                    throw new Exception("client registration incomplete");
                actualClient = callbackClient;
            } else {
                if (callbackClient != null && !callbackClient.equals(issued))
                    throw new Exception("client mismatch");
                actualClient = issued;
            }
            JSONObject tokens = form(TOKEN, new String[][]{
                    {"grant_type", "authorization_code"}, {"client_id", actualClient},
                    {"code", callback.getQueryParameter("code")},
                    {"code_verifier", verifier}, {"redirect_uri", redirect},
                    {"resource", RESOURCE}
            });
            String id = tokens.optString("id_token", "");
            JSONObject identity = verifyIdentity(id, actualClient, nonce);
            if (previous != null && !previous.optString("sub", "").equals(identity.getString("sub")))
                throw new Exception("ChatGPT account mismatch; sign out before changing accounts");
            JSONObject session = new JSONObject();
            session.put("client_id", actualClient);
            session.put("sub", identity.getString("sub"));
            session.put("email", identity.optString("email", "ChatGPT account"));
            session.put("id_token", id);
            session.put("access_token", tokens.getString("access_token"));
            session.put("refresh_token", tokens.optString("refresh_token", ""));
            session.put("scope", tokens.optString("scope", ""));
            session.put("expires_at", System.currentTimeMillis() + 1000L * tokens.optLong("expires_in", 3600));
            session.put("model", ""); 
            if (hasPlan(session)) session.put("model", firstModel(session.getString("access_token")));
            persist(activity, session);
            return hasPlan(session) ? "ChatGPT connected. Bubbles now uses your permitted ChatGPT plan."
                    : "ChatGPT identity connected, but plan usage was not approved. Oracle remains active.";
        }
    }

    static String ask(Context context, String prompt) throws Exception {
        synchronized (SESSION_LOCK) {
            JSONObject session = read(context);
            if (!hasPlan(session)) throw new Exception("ChatGPT plan permission unavailable");
            if (session.optLong("expires_at", 0) - System.currentTimeMillis() < 120000) {
                JSONObject refreshed = form(TOKEN, new String[][]{
                        {"grant_type", "refresh_token"},
                        {"client_id", session.getString("client_id")},
                        {"refresh_token", session.getString("refresh_token")},
                        {"resource", RESOURCE}
                });
                session.put("access_token", refreshed.getString("access_token"));
                if (refreshed.has("refresh_token"))
                    session.put("refresh_token", refreshed.getString("refresh_token"));
                if (refreshed.has("scope")) session.put("scope", refreshed.getString("scope"));
                session.put("expires_at", System.currentTimeMillis()
                        + refreshed.optLong("expires_in", 3600) * 1000L);
                persist(context, session);
            }
            if (!hasPlan(session)) throw new Exception("ChatGPT plan scope not granted");
            String model = session.optString("model", "");
            if (model.isEmpty()) {
                model = firstModel(session.getString("access_token"));
                session.put("model", model);
                persist(context, session);
            }
            JSONObject request = new JSONObject()
                    .put("model", model)
                    .put("input", new JSONArray().put(new JSONObject()
                            .put("role", "user").put("content", prompt)))
                    .put("store", false)
                    .put("stream", true);
            HttpURLConnection connection = (HttpURLConnection)
                    new URL(RESOURCE + "/responses").openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(12000);
            connection.setReadTimeout(90000);
            connection.setRequestProperty("Authorization", "Bearer " + session.getString("access_token"));
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "text/event-stream");
            connection.setDoOutput(true);
            try {
                byte[] bytes = request.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream out = connection.getOutputStream()) { out.write(bytes); }
                if (connection.getResponseCode() != 200)
                    throw new Exception("ChatGPT request returned HTTP " + connection.getResponseCode());
                StringBuilder result = new StringBuilder();
                boolean completed = false;
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                        connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (!line.startsWith("data: ")) continue;
                        String data = line.substring(6);
                        if ("[DONE]".equals(data)) break;
                        JSONObject event;
                        try { event = new JSONObject(data); } catch (Exception ignored) { continue; }
                        String type = event.optString("type", "");
                        if ("response.output_text.delta".equals(type)) {
                            result.append(event.optString("delta", ""));
                            if (result.length() > 10000) throw new Exception("ChatGPT reply too long");
                        } else if ("response.completed".equals(type)) {
                            completed = true;
                        } else if ("response.failed".equals(type) || "response.incomplete".equals(type)
                                || "error".equals(type)) {
                            throw new Exception("ChatGPT could not complete this response");
                        }
                    }
                }
                if (!completed || result.toString().trim().isEmpty())
                    throw new Exception("ChatGPT stream incomplete");
                return result.toString().trim();
            } finally { connection.disconnect(); }
        }
    }

    private static String firstModel(String token) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(RESOURCE + "/models").openConnection();
        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(10000);
        c.setReadTimeout(15000);
        c.setRequestProperty("Authorization", "Bearer " + token);
        try {
            if (c.getResponseCode() != 200) throw new Exception("ChatGPT model list unavailable");
            JSONObject list = new JSONObject(readBounded(c.getInputStream(), 1000000));
            JSONArray models = list.optJSONArray("models");
            if (models == null) throw new Exception("ChatGPT model catalog missing");
            String first = "";
            for (int i = 0; i < models.length(); i++) {
                JSONObject m = models.optJSONObject(i);
                if (m == null || !"list".equals(m.optString("visibility"))) continue;
                String slug = m.optString("slug", "");
                if (slug.isEmpty()) continue;
                if ("gpt-6.1-sol".equals(slug)) return slug;
                if (first.isEmpty()) first = slug;
            }
            if (first.isEmpty()) throw new Exception("No eligible ChatGPT models returned");
            return first;
        } finally { c.disconnect(); }
    }

    private static JSONObject verifyIdentity(String jwt, String audience, String nonce) throws Exception {
        String[] parts = jwt.split("\\.");
        if (parts.length != 3) throw new Exception("Invalid ChatGPT ID token");
        JSONObject header = new JSONObject(new String(decode(parts[0]), StandardCharsets.UTF_8));
        JSONObject body = new JSONObject(new String(decode(parts[1]), StandardCharsets.UTF_8));
        if (!"RS256".equals(header.optString("alg"))) throw new Exception("Unexpected JWT algorithm");
        String kid = header.optString("kid", "");
        if (kid.isEmpty()) throw new Exception("Missing JWT key identifier");
        JSONObject config = getJson(AUTH + "/.well-known/openid-configuration");
        if (!AUTH.equals(config.optString("issuer"))) throw new Exception("Unexpected token issuer");
        String jwksUri = config.optString("jwks_uri", "");
        if (!jwksUri.startsWith(AUTH + "/")) throw new Exception("Invalid JWKS endpoint");
        JSONArray keys = getJson(jwksUri).getJSONArray("keys");
        boolean verified = false;
        for (int i = 0; i < keys.length(); i++) {
            JSONObject jwk = keys.getJSONObject(i);
            if (!kid.equals(jwk.optString("kid")) || !"RSA".equals(jwk.optString("kty"))
                    || (jwk.has("use") && !"sig".equals(jwk.optString("use")))) continue;
            RSAPublicKeySpec spec = new RSAPublicKeySpec(
                    new BigInteger(1, decode(jwk.getString("n"))),
                    new BigInteger(1, decode(jwk.getString("e"))));
            RSAPublicKey pub = (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(spec);
            if (pub.getModulus().bitLength() < 2048) throw new Exception("Weak identity key");
            Signature check = Signature.getInstance("SHA256withRSA");
            check.initVerify(pub);
            check.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
            verified = check.verify(decode(parts[2]));
            if (verified) break;
        }
        if (!verified) throw new Exception("ChatGPT ID token signature rejected");
        if (!AUTH.equals(body.optString("iss")) || !nonce.equals(body.optString("nonce")))
            throw new Exception("ChatGPT identity claim mismatch");
        Object aud = body.get("aud");
        boolean audienceOK = audience.equals(aud);
        if (aud instanceof JSONArray) {
            JSONArray arr = (JSONArray) aud;
            for (int i = 0; i < arr.length(); i++)
                if (audience.equals(arr.optString(i))) audienceOK = true;
        }
        long now = System.currentTimeMillis() / 1000L;
        if (!audienceOK || body.optLong("exp", 0) <= now
                || body.optLong("iat", 0) > now + 120
                || body.optLong("nbf", 0) > now + 120
                || body.optString("sub", "").isEmpty())
            throw new Exception("Expired or mismatched ChatGPT identity");
        return body;
    }

    private static JSONObject getJson(String uri) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(uri).openConnection();
        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(10000);
        c.setReadTimeout(15000);
        try {
            if (c.getResponseCode() != 200) throw new Exception("OpenAI identity metadata unavailable");
            return new JSONObject(readBounded(c.getInputStream(), 1000000));
        } finally { c.disconnect(); }
    }

    private static JSONObject form(String endpoint, String[][] fields) throws Exception {
        // All token endpoints are hardcoded OpenAI HTTPS destinations.
        if (!endpoint.startsWith(AUTH + "/api/accounts/oauth/"))
            throw new Exception("Unauthorized OAuth endpoint");
        HttpURLConnection c = (HttpURLConnection) new URL(endpoint).openConnection();
        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(12000);
        c.setReadTimeout(20000);
        c.setRequestMethod("POST");
        c.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        c.setDoOutput(true);
        StringBuilder body = new StringBuilder();
        for (String[] entry : fields) {
            if (body.length() > 0) body.append('&');
            body.append(Uri.encode(entry[0])).append('=').append(Uri.encode(entry[1]));
        }
        try {
            try (OutputStream out = c.getOutputStream()) {
                out.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            if (c.getResponseCode() != 200) throw new Exception("OpenAI authorization HTTP " + c.getResponseCode());
            String text = readBounded(c.getInputStream(), 40000);
            return text.trim().isEmpty() ? new JSONObject() : new JSONObject(text);
        } finally { c.disconnect(); }
    }

    private static String readBounded(InputStream stream, int cap) throws Exception {
        try (InputStream in = stream; ByteArrayOutputStream b = new ByteArrayOutputStream()) {
            byte[] tmp = new byte[4096];
            int n, total = 0;
            while ((n = in.read(tmp)) != -1) {
                total += n;
                if (total > cap) throw new Exception("Oversized response");
                b.write(tmp, 0, n);
            }
            return b.toString("UTF-8");
        }
    }
    private static byte[] decode(String v) { return Base64.decode(v, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP); }
    private static String random() {
        byte[] b = new byte[32]; RANDOM.nextBytes(b);
        return Base64.encodeToString(b, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
    }
    private static String sha256(String value) throws Exception {
        return Base64.encodeToString(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.US_ASCII)),
                Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
    }

    private static SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(ALIAS))
            return (SecretKey) store.getKey(ALIAS, null);
        KeyGenerator gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        gen.init(new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return gen.generateKey();
    }
    private static JSONObject read(Context c) throws Exception {
        String encrypted = c.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString("session", "");
        if (encrypted.isEmpty()) return null;
        byte[] b = Base64.decode(encrypted, Base64.NO_WRAP);
        if (b.length < 30) throw new Exception("Invalid encrypted session");
        byte[] iv = new byte[12], ciphertext = new byte[b.length - 12];
        System.arraycopy(b, 0, iv, 0, iv.length);
        System.arraycopy(b, iv.length, ciphertext, 0, ciphertext.length);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
        return new JSONObject(new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8));
    }
    private static void persist(Context c, JSONObject session) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        byte[] iv = cipher.getIV();
        byte[] payload = cipher.doFinal(session.toString().getBytes(StandardCharsets.UTF_8));
        byte[] bytes = new byte[iv.length + payload.length];
        System.arraycopy(iv, 0, bytes, 0, iv.length);
        System.arraycopy(payload, 0, bytes, iv.length, payload.length);
        if (!c.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit()
                .putString("session", Base64.encodeToString(bytes, Base64.NO_WRAP)).commit())
            throw new Exception("Could not save ChatGPT connection");
    }
    private static void clear(Context c) {
        c.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit().remove("session").commit();
    }
    private static String safeError(Exception ex) {
        // Never expose raw tokens or upstream OAuth URLs in a visible error.
        String m = ex.getMessage();
        if (m == null) return ex.getClass().getSimpleName();
        String safe = m.replaceAll("(?i)(access_token|refresh_token|id_token)=[^\\\\s&]+", "$1=[redacted]");
        return safe.substring(0, Math.min(160, safe.length()));
    }
}
