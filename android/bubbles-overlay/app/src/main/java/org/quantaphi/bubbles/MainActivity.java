package org.quantaphi.bubbles;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.EditText;
import android.widget.CheckBox;
import android.widget.ScrollView;
import android.app.AlertDialog;

public final class MainActivity extends Activity {
    private static final int OVERLAY_REQUEST = 61;
    private static final int PERMISSIONS_REQUEST = 62;
    private TextView state;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(38, 48, 38, 28);
        layout.setBackgroundColor(Color.rgb(248, 243, 252));

        TextView title = new TextView(this);
        title.setText("Bubbles AI");
        title.setTextColor(Color.rgb(48, 36, 62));
        title.setTypeface(null, Typeface.BOLD);
        title.setTextSize(31);
        layout.addView(title);

        TextView copy = new TextView(this);
        copy.setText("A floating voice companion, available while other apps are open.\n\nAllow the microphone and Android overlay permission once, then enable Bubbles. The microphone stays open during your session; speech is recognized offline. Drag the orb to move it over other apps.\n\nYou will see an ongoing microphone notification. Say “Bubbles go quiet” or long-press the orb to mute. Tap it to resume, or use Stop to release the microphone. While Bubbles speaks, audio still reaches the local microphone meter but transcripts are discarded to avoid speaker echo.");
        copy.setTextColor(Color.rgb(101, 83, 111));
        copy.setTextSize(16);
        copy.setPadding(0, 25, 0, 25);
        layout.addView(copy);

        EditText name = new EditText(this);
        name.setTextColor(Color.rgb(48, 36, 62));
        name.setHint("Bubble name");
        name.setText(BrainNotes.prefs(this).getString("name","Brain"));
        layout.addView(name);
        EditText job = new EditText(this);
        job.setTextColor(Color.rgb(48, 36, 62));
        job.setHint("What should Brain learn and help build?");
        job.setText(BrainNotes.prefs(this).getString("instructions","Learn my Infinity build workflow from my notes. Suggest the next concrete fix, update or build; explain the evidence."));
        layout.addView(job);
        Button save = new Button(this);
        save.setText("Save Brain name and job");
        save.setOnClickListener(v -> {
            String alias=LearningPolicy.clean(name.getText().toString());
            if(alias.isEmpty())alias="Brain";
            BrainNotes.prefs(this).edit().putString("name",alias.substring(0,Math.min(38,alias.length())))
                .putString("instructions",LearningPolicy.clean(job.getText().toString())).apply();
            state.setText("Brain job saved. The running companion uses these settings on its next request.");
        });
        layout.addView(save);
        TextView learning=new TextView(this);
        learning.setTextColor(Color.rgb(48, 36, 62));
        learning.setText("Optional workflow learning: select apps, then enable Brain in Android Accessibility Settings. It saves visible text locally while you use those apps. It does not read hidden history or browser tabs. Uncheck an app to pause it.");
        layout.addView(learning);
        for(String[] app:new String[][]{{"ChatGPT","learn_chatgpt"},{"X / Twitter","learn_x"},{"Gemini","learn_gemini"}}) {
            CheckBox choice=new CheckBox(this);
            choice.setTextColor(Color.rgb(48, 36, 62));choice.setText("Learn from "+app[0]);
            choice.setChecked(BrainNotes.prefs(this).getBoolean(app[1],false));
            choice.setOnCheckedChangeListener((button,checked)->BrainNotes.prefs(this).edit().putBoolean(app[1],checked).apply());
            layout.addView(choice);
        }
        Button access=new Button(this);access.setText("Open Android learning permission");
        access.setOnClickListener(v->startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)));
        layout.addView(access);
        CheckBox useNotes=new CheckBox(this);useNotes.setTextColor(Color.rgb(48, 36, 62));
        useNotes.setText("Include my recent notes in requests to Oracle Cloudflare AI when I talk to Brain");
        useNotes.setChecked(BrainNotes.prefs(this).getBoolean("use_notes",false));
        useNotes.setOnCheckedChangeListener((button,checked)->BrainNotes.prefs(this).edit().putBoolean("use_notes",checked).apply());
        layout.addView(useNotes);
        Button review=new Button(this);review.setText("Review local learning notes");
        review.setOnClickListener(v->new AlertDialog.Builder(this).setTitle("Brain local notes")
            .setMessage(BrainNotes.recent(this).isEmpty()?"No notes captured yet.":BrainNotes.recent(this))
            .setPositiveButton("Close",null).setNeutralButton("Clear notes",(dialog,which)->
                BrainNotes.prefs(this).edit().remove("notes").apply()).show());
        layout.addView(review);

        Button connect = new Button(this);
        connect.setText("Enable the floating Bubbles assistant");
        connect.setOnClickListener(view -> checkAndStart());
        layout.addView(connect);

        Button stop = new Button(this);
        stop.setText("Stop Bubbles and release the microphone");
        stop.setOnClickListener(view -> {
            Intent intent = new Intent(this, BubblesService.class);
            intent.setAction(BubblesService.ACTION_STOP);
            startService(intent);
            state.setText("Bubbles stopped; no microphone session is active.");
        });
        layout.addView(stop);

        state = new TextView(this);
        state.setTextColor(Color.rgb(48, 36, 62));
        state.setTextSize(14);
        state.setGravity(Gravity.START);
        state.setPadding(0, 20, 0, 0);
        state.setText("Not connected. Permissions are never bypassed.");
        layout.addView(state);

        ScrollView scroll=new ScrollView(this);scroll.addView(layout);setContentView(scroll);
    }

    @Override protected void onResume() {
        super.onResume();
        // Only a user tap on our Quick Settings tile requests startup.
        // Consume the request so returning from Settings cannot trigger a second session.
        if (getIntent().getBooleanExtra(BubblesTileService.EXTRA_START, false)) {
            getIntent().removeExtra(BubblesTileService.EXTRA_START);
            checkAndStart();
        }
    }

    private void checkAndStart() {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) {
            state.setText("Approve 'Display over other apps' in Android Settings.");
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
            startActivityForResult(intent, OVERLAY_REQUEST);
            return;
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, PERMISSIONS_REQUEST);
            return;
        }
        // Notifications are requested independently on Android 13+; a service
        // remains user-visible through the Android foreground task manager.
        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSIONS_REQUEST);
            return;
        }
        try {
            Intent intent = new Intent(this, BubblesService.class);
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent);
            else startService(intent);
            state.setText("Bubbles started. Say “Bubbles” and your request. The bubble remains visible above other apps.");
        } catch (Exception error) {
            state.setText("Android could not start the microphone service: " + error.getClass().getSimpleName());
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OVERLAY_REQUEST) {
            if (Build.VERSION.SDK_INT >= 23 && Settings.canDrawOverlays(this)) checkAndStart();
            else state.setText("Overlay permission was not granted. No assistant was started.");
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != PERMISSIONS_REQUEST) return;
        for (int result : results) {
            if (result != PackageManager.PERMISSION_GRANTED) {
                state.setText("Permission not granted. Bubbles did not begin microphone capture.");
                return;
            }
        }
        checkAndStart();
    }
}


