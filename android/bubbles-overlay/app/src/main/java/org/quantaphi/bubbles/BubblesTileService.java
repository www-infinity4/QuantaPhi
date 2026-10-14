package org.quantaphi.bubbles;

import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

/** Quick Settings entrypoint. Microphone startup remains in a visible Activity. */
public final class BubblesTileService extends TileService {
    public static final String EXTRA_START = "org.quantaphi.bubbles.START_FROM_TILE";

    @Override public void onStartListening() {
        super.onStartListening();
        Tile tile = getQsTile();
        if (tile == null) return;
        tile.setLabel("Bubbles");
        tile.setContentDescription("Open Bubbles voice controls");
        // This tile launches controls; it does not claim the microphone is recording.
        tile.setState(Tile.STATE_INACTIVE);
        if (Build.VERSION.SDK_INT >= 29) tile.setSubtitle("Voice controls");
        tile.updateTile();
    }

    @Override public void onClick() {
        super.onClick();
        if (isLocked()) unlockAndRun(this::openAssistant);
        else openAssistant();
    }

    @SuppressWarnings("deprecation")
    private void openAssistant() {
        String request = java.util.UUID.randomUUID().toString();
        getSharedPreferences("bubbles-tile", MODE_PRIVATE).edit()
                .putString("pending-start", request).commit();
        Intent intent = new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra(EXTRA_START, request);
        if (Build.VERSION.SDK_INT >= 34) {
            PendingIntent launch = PendingIntent.getActivity(this, 511, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            startActivityAndCollapse(launch);
        } else {
            startActivityAndCollapse(intent);
        }
    }
}
