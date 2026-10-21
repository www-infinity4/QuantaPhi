package org.quantaphi.bubblesone;

import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

final class CloudChat {
    private static final String ENDPOINT = "https://bubbles-tools.marvaseater.workers.dev/v1/assist";
    private CloudChat() {}
    static String ask(String request, String context) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(ENDPOINT).openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(35000);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        connection.setRequestProperty("Origin", "https://quantaphi.org");
        connection.setDoOutput(true);
        JSONObject body = new JSONObject();
        body.put("request", request);
        body.put("input", context + "\nCurrent user request: " + request);
        body.put("mcp", true);
        try {
            byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
            if (bytes.length > 30000) throw new IllegalArgumentException("Conversation too long");
            try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
            int code = connection.getResponseCode();
            if (code < 200 || code >= 300) throw new IllegalStateException("AI service unavailable (HTTP " + code + ")");
            try (InputStream input = connection.getInputStream()) {
                byte[] response = readBounded(input, 100000);
                JSONObject result = new JSONObject(new String(response, StandardCharsets.UTF_8));
                if (!result.optBoolean("ok", false)) throw new IllegalStateException("AI did not complete this request");
                String answer = result.optString("output", result.optString("output_text", "")).trim();
                if (answer.isEmpty()) throw new IllegalStateException("AI returned no answer");
                return answer.substring(0, Math.min(answer.length(), 7000));
            }
        } finally { connection.disconnect(); }
    }
    private static byte[] readBounded(InputStream input, int limit) throws Exception {
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        byte[] buf = new byte[8192]; int n;
        while ((n = input.read(buf)) != -1) {
            if (out.size() + n > limit) throw new IllegalStateException("AI response too large");
            out.write(buf, 0, n);
        }
        return out.toByteArray();
    }
}
