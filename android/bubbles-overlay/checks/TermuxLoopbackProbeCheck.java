package org.quantaphi.bubbles;

import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.io.OutputStream;

public final class TermuxLoopbackProbeCheck {
    public static void main(String[] args) throws Exception {
        try (ServerSocket server = new ServerSocket(18767, 1, InetAddress.getByName("127.0.0.1"))) {
            Thread sender = new Thread(() -> {
                try (Socket peer = server.accept()) {
                    peer.setSoTimeout(1200);
                    while (peer.getInputStream().read() != -1) {
                        if (peer.getInputStream().available() == 0) break;
                    }
                    byte[] wire = ("HTTP/1.0 200 OK\r\nContent-Type: application/json\r\n\r\n"+
                        "{\"ok\":true,\"service\":\"bubbles-termux-loopback\",\"transport\":\"loopback\"}\n")
                        .getBytes(StandardCharsets.US_ASCII);
                    OutputStream out=peer.getOutputStream();out.write(wire);out.flush();
                } catch (Exception error) { throw new RuntimeException(error); }
            });
            sender.start();
            String found=TermuxLoopbackProbe.check();
            if(!found.equals(TermuxLoopbackProbe.REACHABLE))
                throw new AssertionError("Expected bound 127.0.0.1 server: "+found);
            sender.join(2500);
        }
        if(!TermuxLoopbackProbe.check().equals(TermuxLoopbackProbe.UNAVAILABLE))
            throw new AssertionError("Closed Termux server must be unavailable");
        System.out.println("PASS: Native Bubbles sees same-device Termux loopback, rejects stopped server");
    }
}
