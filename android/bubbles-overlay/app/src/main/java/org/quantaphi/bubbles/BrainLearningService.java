package org.quantaphi.bubbles;

import android.accessibilityservice.AccessibilityService;
import android.os.Handler;
import android.os.Looper;
import java.lang.ref.WeakReference;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

/** Read-only learning from explicitly selected app windows, never typed drafts. */
public final class BrainLearningService extends AccessibilityService {
    private static WeakReference<BrainLearningService> active = new WeakReference<>(null);
    @Override protected void onServiceConnected() {
        super.onServiceConnected();
        active=new WeakReference<>(this);
    }
    /**
     * An explicit spoken "read this screen" request only. Accessibility can
     * supply visible text, NOT invisible page content or screenshot pixels.
     * Never collect input fields, passwords or unseen application windows.
     */
    static String currentVisibleText() {
        BrainLearningService service=active.get();
        if(service==null)return "";
        AccessibilityNodeInfo root=service.getRootInActiveWindow();
        if(root==null)return "";
        try {
            String app=String.valueOf(root.getPackageName());
            if(app.startsWith("org.quantaphi.bubbles") ||
              app.equals("com.android.systemui") || app.equals("com.android.settings"))return "";
            StringBuilder result=new StringBuilder();
            service.collect(root,result,new int[]{0},0);
            return result.toString().trim();
        }catch(RuntimeException ignored){return "";}
        finally{root.recycle();}
    }
    private final Handler main = new Handler(Looper.getMainLooper());
    private String pendingApp = "";
    private final Runnable capture = () -> {
        String key = LearningPolicy.key(pendingApp);
        if (key==null || !BrainNotes.prefs(this).getBoolean(key,false)) return;
        AccessibilityNodeInfo root=getRootInActiveWindow();
        if(root==null) return;
        try {
            if (!pendingApp.equals(String.valueOf(root.getPackageName()))) return;
            StringBuilder text=new StringBuilder();
            collect(root,text,new int[]{0},0);
            BrainNotes.add(this,pendingApp,text.toString());
        } finally { root.recycle(); }
    };
    @Override public void onAccessibilityEvent(AccessibilityEvent event) {
        main.removeCallbacks(capture);
        String app=String.valueOf(event.getPackageName());
        String key=LearningPolicy.key(app);
        if(key==null || !BrainNotes.prefs(this).getBoolean(key,false)) return;
        pendingApp=app;
        main.postDelayed(capture,1200);
    }
    private void collect(AccessibilityNodeInfo node,StringBuilder out,int[] count,int depth) {
        if(node==null || depth>30 || count[0]++>180 || out.length()>=LearningPolicy.MAX_TEXT) return;
        if(!node.isVisibleToUser() || node.isPassword() || node.isEditable()) return;
        CharSequence value=node.getText();
        if(value!=null) out.append(LearningPolicy.clean(value.toString())).append('\n');
        for(int i=0;i<node.getChildCount() && out.length()<LearningPolicy.MAX_TEXT;i++) {
            AccessibilityNodeInfo child=node.getChild(i);
            if(child!=null) {try {collect(child,out,count,depth+1);} finally {child.recycle();}}
        }
    }
    @Override public void onInterrupt() {main.removeCallbacks(capture);}
    @Override public void onDestroy() {
        main.removeCallbacks(capture);
        if(active.get()==this)active.clear();
        super.onDestroy();
    }
}
