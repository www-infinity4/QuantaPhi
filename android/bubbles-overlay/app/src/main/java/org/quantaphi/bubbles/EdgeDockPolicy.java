package org.quantaphi.bubbles;

/** Pure coordinate policy for the single floating orb, independent of Android UI. */
final class EdgeDockPolicy {
    private EdgeDockPolicy() {}
    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
    /** Keep at least 75% of the orb's hit surface visible along the screen edge. */
    static int edgeX(boolean right, int screenWidth, int orbSize) {
        int peek = Math.max(0, orbSize / 4);
        return right ? Math.max(0, screenWidth - orbSize + peek) : -peek;
    }
    static int dragX(int x, int screenWidth, int orbSize) {
        return clamp(x, edgeX(false, screenWidth, orbSize), edgeX(true, screenWidth, orbSize));
    }
    static int y(int wanted, int screenHeight, int orbSize) {
        return clamp(wanted, 0, Math.max(0, screenHeight - orbSize));
    }
    static boolean dockRight(int currentX, int screenWidth, int orbSize) {
        return currentX + orbSize / 2 >= screenWidth / 2;
    }
}
