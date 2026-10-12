package org.quantaphi.bubbles;

import android.accessibilityservice.AccessibilityService;
import android.os.Handler;
import android.os.Looper;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

/** Read-only learning from explicitly selected app windows, never typed drafts. */
public final class BrainLearningService extends AccessibilityService {
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
    @Override public void onDestroy() {main.removeCallbacks(capture);super.onDestroy();}
}
