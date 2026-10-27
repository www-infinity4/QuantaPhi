package org.quantaphi.bubbles;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

/** Owner-requested read-only probe of the local Termux companion.
 * No permissions, tokens, shell commands or arbitrary URLs are passed.
 * Call off the Android main thread. Not an LLM response measurement.
 */
final class TermuxLoopbackProbe {
    static final String REACHABLE = "Termux local companion is online. It is a fast local transport, not a second GPT model.";
    static final String UNAVAILABLE = "Termux local companion is unavailable. Start the reviewed Termux service and check Android background permissions.";
    private TermuxLoopbackProbe() {}

    static String check() {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 18767), 900);
            socket.setSoTimeout(900);
            OutputStream out = socket.getOutputStream();
            out.write(("GET /health HTTP/1.0\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")
                    .getBytes(StandardCharsets.US_ASCII));
            out.flush();
            BufferedReader in = new BufferedReader(new InputStreamReader(
                    socket.getInputStream(), StandardCharsets.US_ASCII));
            String status = in.readLine();
            if (status == null || !status.matches("HTTP/1\\.[01] 200(?: .*)?"))
                return UNAVAILABLE;
            String header;
            int scanned = 0;
            while ((header = in.readLine()) != null && !header.isEmpty()) {
                if (++scanned > 30 || header.length() > 300) return UNAVAILABLE;
            }
            if (header == null) return UNAVAILABLE;
            String body = in.readLine();
            if (body != null && body.length() < 512
                    && body.contains("\"service\":\"bubbles-termux-loopback\"")
                    && body.contains("\"transport\":\"loopback\"")
                    && body.contains("\"ok\":true"))
                return REACHABLE;
        } catch (Exception ignored) {
            // No network URL, authentication, remote fallback or unsafe debug log.
        }
        return UNAVAILABLE;
    }
}
