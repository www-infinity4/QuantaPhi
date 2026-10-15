package org.quantaphi.platinum;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.role.RoleManager;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.webkit.PermissionRequest;
import android.content.pm.PackageManager;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import android.webkit.URLUtil;
import android.app.DownloadManager;
import android.content.Context;
import android.os.Environment;
import android.webkit.CookieManager;
import android.net.http.SslError;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.util.ArrayList;

/**
 * Infinity Platinum Android 12 browser preview.
 *
 * Third-party pages are WebView content, not privileged JavaScript. NO
 * addJavascriptInterface(), login interception, stolen cookies or invisible
 * syncing. Collect only calls first-party QuantaPhi after verifying HTTPS host
 * and path, and only after the owner taps Collect/Build.
 */
public final class PlatinumActivity extends Activity {
 private static final int FILE_PICKER=301;
 private static final int PHONE_MEDIA_PERMISSION=302;
 private PermissionRequest pendingPhoneMedia;
 private static final String PREFS="platinum-device";
 private static final int MAX_TABS=3;
 private static final int SILVER=Color.rgb(237,239,243),INK=Color.rgb(44,53,69),STEEL=Color.rgb(76,91,116);
 private final ArrayList<WebView> tabs=new ArrayList<>();
 private FrameLayout frame;
 private EditText address;
 private TextView status,tabCount;
 private int current=-1;
 private ValueCallback<Uri[]> pendingFiles;
 private String collectUrl="",collectTitle="";
 private boolean collectAndBuild=false;

 @Override public void onCreate(Bundle savedState){
  super.onCreate(savedState);
  LinearLayout shell=new LinearLayout(this);
  shell.setOrientation(LinearLayout.VERTICAL);
  shell.setBackgroundColor(SILVER);
  shell.setPadding(px(6),px(9),px(6),px(6));

  LinearLayout first=row();
  TextView name=new TextView(this);name.setText("Pt  INFINITY PLATINUM");
  name.setTextColor(INK);name.setTextSize(17);name.setTypeface(null,1);
  name.setPadding(px(9),px(8),px(6),px(8));
  first.addView(name,new LinearLayout.LayoutParams(0,-2,1));
  Button options=button("⋮");
  options.setContentDescription("Platinum browser options");
  options.setOnClickListener(v->options());
  first.addView(options);shell.addView(first);

  LinearLayout navigation=row();
  Button back=button("‹");back.setContentDescription("Back");back.setOnClickListener(v->{WebView w=active();if(w!=null&&w.canGoBack())w.goBack();else home();});
  Button forward=button("›");forward.setContentDescription("Forward");forward.setOnClickListener(v->{WebView w=active();if(w!=null&&w.canGoForward())w.goForward();});
  Button home=button("⌂");home.setContentDescription("Platinum start page");home.setOnClickListener(v->home());
  navigation.addView(back);navigation.addView(forward);navigation.addView(home);

  address=new EditText(this);address.setSingleLine(true);
  address.setTextSize(14);address.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);
  address.setImeOptions(EditorInfo.IME_ACTION_GO);address.setHint("Website or search…");address.setSelectAllOnFocus(true);
  address.setBackgroundTintList(android.content.res.ColorStateList.valueOf(STEEL));
  address.setOnEditorActionListener((v,action,event)->{if(action==EditorInfo.IME_ACTION_GO){navigate(address.getText().toString());return true;}return false;});
  navigation.addView(address,new LinearLayout.LayoutParams(0,px(45),1));
  Button go=button("Go");go.setOnClickListener(v->navigate(address.getText().toString()));navigation.addView(go);
  shell.addView(navigation);

  LinearLayout actions=row();
  Button collect=button("Collect");collect.setOnClickListener(v->collect(false));actions.addView(collect);
  Button build=button("Build in Code Phi");build.setOnClickListener(v->collect(true));actions.addView(build,new LinearLayout.LayoutParams(0,px(48),1));
  Button tab=button("＋");tab.setContentDescription("New browser tab");tab.setOnClickListener(v->newTab(PlatinumNavigation.START));actions.addView(tab);
  Button switchTab=button("Tabs");switchTab.setOnClickListener(v->switchNext());actions.addView(switchTab);
  tabCount=new TextView(this);tabCount.setTextColor(INK);tabCount.setGravity(Gravity.CENTER);tabCount.setTextSize(12);actions.addView(tabCount);
  shell.addView(actions);

  status=new TextView(this);status.setTextColor(STEEL);status.setTextSize(11);
  status.setMaxLines(2);status.setPadding(px(8),px(4),px(8),px(5));
  status.setText("Infinity Platinum · Safe Browsing on · Local collections");
  shell.addView(status);
  frame=new FrameLayout(this);shell.addView(frame,new LinearLayout.LayoutParams(-1,0,1));
  setContentView(shell);

  String entry=PlatinumNavigation.START;
  Intent launched=getIntent();
  if(launched!=null&&Intent.ACTION_VIEW.equals(launched.getAction())&&launched.getData()!=null){
   String candidate=PlatinumNavigation.web(launched.getData().toString());
   if(!candidate.isEmpty())entry=candidate;
  }
  newTab(entry);
 }
 private int px(int size){return Math.round(size*getResources().getDisplayMetrics().density);}
 private LinearLayout row(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.HORIZONTAL);l.setGravity(Gravity.CENTER_VERTICAL);return l;}
 private Button button(String title){
  Button b=new Button(this);b.setText(title);b.setAllCaps(false);
  b.setTextSize(12);b.setTextColor(Color.WHITE);
  b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(STEEL));
  b.setMinWidth(0);b.setMinimumWidth(0);b.setMinHeight(0);b.setMinimumHeight(0);
  b.setPadding(px(9),px(4),px(9),px(4));
  return b;
 }
 private WebView active(){return current>=0&&current<tabs.size()?tabs.get(current):null;}
 private WebView newWebView(){
  WebView web=new WebView(this);
  WebSettings settings=web.getSettings();
  settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
  settings.setAllowFileAccessFromFileURLs(false);
  settings.setAllowUniversalAccessFromFileURLs(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setSafeBrowsingEnabled(true);
  settings.setSupportMultipleWindows(false);
  settings.setJavaScriptCanOpenWindowsAutomatically(false);
  settings.setMediaPlaybackRequiresUserGesture(true);
  settings.setBuiltInZoomControls(true);settings.setDisplayZoomControls(false);
  // Only an identifiable user-agent suffix, never a login or owner token.
  settings.setUserAgentString(settings.getUserAgentString()+" InfinityPlatinumMobile/0.1");
  CookieManager.getInstance().setAcceptCookie(true);
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    String incoming=request.getUrl().toString();
    if(!PlatinumNavigation.web(incoming).isEmpty())return false;
    note("Unsupported link blocked. Only HTTP(S) websites can open.");
    return true;
   }
   @Override public void onPageFinished(WebView view,String url){
    if(view==active()){
     address.setText(url);
     note(("https://".equalsIgnoreCase(Uri.parse(url).getScheme()+"://")?"🔒 ":"⚠ ")+"Viewing "+Uri.parse(url).getHost());
    }
    if(PlatinumNavigation.isPlatinum(url)&&view==active())deliverPendingCollection(view);
    // Never save OAuth redirect codes or login pages as resume data.
    if(view==active()&&!url.matches("(?i).*(?:[?&](?:code|access_token|id_token|state)=|/oauth/|/login|/signin).*")){
     String valid=PlatinumNavigation.web(url);
     if(!valid.isEmpty())getSharedPreferences(PREFS,MODE_PRIVATE).edit().putString("last_url",valid).apply();
    }
   }
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){
    if(request.isForMainFrame()&&view==active())note("Page could not load. Check the website or internet connection.");
   }
   @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error){
    handler.cancel();note("Blocked an unsafe website certificate. The page was not opened.");
   }
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public void onReceivedTitle(WebView view,String title){
    if(view==active()&&title!=null)status.setContentDescription(title);
   }
   @Override public void onPermissionRequest(PermissionRequest request){
    runOnUiThread(()->{
     Uri origin=request.getOrigin();
     Uri page=Uri.parse(web.getUrl()==null?"":web.getUrl());
     // Only this user's foreground Infinity Phone page may ask for call media.
     if(web!=active()||!"https".equals(origin.getScheme())||
       !"quantaphi.org".equalsIgnoreCase(origin.getHost())||
       !"quantaphi.org".equalsIgnoreCase(page.getHost())||
       page.getPath()==null||!page.getPath().startsWith("/phone/")){
      request.deny();return;
     }
     java.util.ArrayList<String> grants=new java.util.ArrayList<>();
     java.util.ArrayList<String> missing=new java.util.ArrayList<>();
     for(String resource:request.getResources()){
      String permission=null;
      if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource))permission="android.permission.RECORD_AUDIO";
      else if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource))permission="android.permission.CAMERA";
      else{request.deny();note("Unsupported media permission blocked.");return;}
      grants.add(resource);
      if(checkSelfPermission(permission)!=PackageManager.PERMISSION_GRANTED)missing.add(permission);
     }
     if(grants.isEmpty()){request.deny();return;}
     if(!missing.isEmpty()){
      if(pendingPhoneMedia!=null)pendingPhoneMedia.deny();
      pendingPhoneMedia=request;
      requestPermissions(missing.toArray(new String[0]),PHONE_MEDIA_PERMISSION);
     }else request.grant(grants.toArray(new String[0]));
    });
   }
   @Override public void onPermissionRequestCanceled(PermissionRequest request){
    runOnUiThread(()->{if(pendingPhoneMedia==request)pendingPhoneMedia=null;});
   }
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
    if(pendingFiles!=null)pendingFiles.onReceiveValue(null);
    pendingFiles=callback;
    try{startActivityForResult(params.createIntent(),FILE_PICKER);return true;}
    catch(Exception ex){pendingFiles=null;note("No photo picker available.");callback.onReceiveValue(null);return false;}
   }
  });
  web.setDownloadListener((url,userAgent,contentDisposition,mimeType,size)->{
   String safe=PlatinumNavigation.web(url);
   if(safe.isEmpty()){note("Download URL blocked.");return;}
   new AlertDialog.Builder(this).setTitle("Download this file?")
    .setMessage(URLUtil.guessFileName(safe,contentDisposition,mimeType))
    .setNegativeButton("Cancel",null)
    .setPositiveButton("Download",(dialog,which)->{
     try{
      DownloadManager.Request req=new DownloadManager.Request(Uri.parse(safe));
      req.setTitle("Infinity Platinum download");
      req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
      req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,URLUtil.guessFileName(safe,contentDisposition,mimeType));
      ((DownloadManager)getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(req);
      note("Download requested through Android Download Manager.");
     }catch(Exception ex){note("Download could not start. Android storage or source denied the request.");}
    }).show();
  });
  return web;
 }
 private void newTab(String url){
  if(tabs.size()>=MAX_TABS){note("Platinum preview supports three tabs. Close one from the menu first.");return;}
  WebView w=newWebView();tabs.add(w);current=tabs.size()-1;showTab();
  w.loadUrl(url);
 }
 private void showTab(){
  frame.removeAllViews();
  WebView w=active();if(w!=null){
   if(w.getParent()!=null)((android.view.ViewGroup)w.getParent()).removeView(w);
   frame.addView(w,new FrameLayout.LayoutParams(-1,-1));
   String u=w.getUrl();address.setText(u==null?"":u);
  }
  tabCount.setText((current+1)+"/"+tabs.size());
 }
 private void switchNext(){if(tabs.size()>1){current=(current+1)%tabs.size();showTab();}else note("Only one tab open. Tap + to add a tab.");}
 private void closeTab(){
  if(tabs.size()==1){home();return;}
  WebView closing=tabs.remove(current);frame.removeView(closing);closing.stopLoading();closing.destroy();
  current=Math.max(0,Math.min(current,tabs.size()-1));showTab();
 }
 private void home(){WebView w=active();if(w!=null)w.loadUrl(PlatinumNavigation.START);}
 private void navigate(String input){
  String url=PlatinumNavigation.openOrSearch(input);
  if(url.isEmpty()){note("Unsupported address. Enter an HTTP(S) site or a search topic.");return;}
  WebView w=active();if(w!=null)w.loadUrl(url);
 }
 private void collect(boolean build){
  WebView w=active();if(w==null)return;
  String raw=w.getUrl(),valid=PlatinumNavigation.web(raw);
  if(valid.isEmpty()||PlatinumNavigation.isPlatinum(valid)){note("Open a real source page before Collect or Build.");return;}
  collectUrl=valid;collectTitle=w.getTitle()==null?Uri.parse(valid).getHost():w.getTitle();
  collectAndBuild=build;
  note(build?"Collecting this source, then opening Code Phi…":"Saving this source to your local project…");
  w.loadUrl(PlatinumNavigation.START);
 }
 private void deliverPendingCollection(WebView w){
  if(collectUrl.isEmpty())return;
  String url=collectUrl,title=collectTitle;
  boolean build=collectAndBuild;
  collectUrl="";collectTitle="";collectAndBuild=false;
  String script="JSON.stringify(window.InfinityPlatinumApp && window.InfinityPlatinumApp.collectFromNative("
   +JSONObject.quote(url)+","+JSONObject.quote(title)+","+(build?"true":"false")+"))";
  w.evaluateJavascript(script,result->{
   try{
    Object wrapper=new JSONTokener(result).nextValue();
    JSONObject receipt=new JSONObject(String.valueOf(wrapper));
    if(receipt.optBoolean("ok"))note(build?"Collected and opened Code Phi project.":"Source collected in your local Phi project.");
    else note("Collect was not confirmed: "+receipt.optString("reason","Project adapter unavailable."));
   }catch(Exception e){note("Collect result could not be verified; no success is claimed.");}
  });
 }
 private void note(String message){status.setText(message);}
 private void options(){
  new AlertDialog.Builder(this).setTitle("Infinity Platinum")
    .setItems(new String[]{"Close current tab","Resume last website","Choose Platinum as default browser","Privacy and limitations"},
     (dialog,which)->{
      if(which==0)closeTab();
      if(which==1){
       String url=getSharedPreferences(PREFS,MODE_PRIVATE).getString("last_url","");
       if(!PlatinumNavigation.web(url).isEmpty())active().loadUrl(url);
       else note("No saved website to resume.");
      }
      if(which==2){
       if(Build.VERSION.SDK_INT>=29){
        RoleManager rm=(RoleManager)getSystemService(ROLE_SERVICE);
        if(rm!=null&&rm.isRoleAvailable(RoleManager.ROLE_BROWSER)){
         if(rm.isRoleHeld(RoleManager.ROLE_BROWSER))note("Platinum is already the selected browser.");
         else startActivity(rm.createRequestRoleIntent(RoleManager.ROLE_BROWSER));
        }else note("This Android device does not offer a browser role picker.");
       }else note("Choose Platinum using Android Settings → Default apps.");
      }
      if(which==3)new AlertDialog.Builder(this).setTitle("Private by design")
       .setMessage("Platinum uses the Android System WebView engine, not an independent Chromium build. Your web cookies belong to this app, not Chrome. Website tiles and Phi projects stay in this app's local WebView storage, unless you explicitly use an authenticated QuantaPhi sync. The app does not import Chrome passwords or copy another app's login. Some sites block embedded browser logins or unsupported popups.").setPositiveButton("OK",null).show();
     }).show();
 }
 @Override protected void onNewIntent(Intent intent){
  super.onNewIntent(intent);setIntent(intent);
  if(intent!=null&&Intent.ACTION_VIEW.equals(intent.getAction())&&intent.getData()!=null){
   String safe=PlatinumNavigation.web(intent.getData().toString());
   if(!safe.isEmpty())navigate(safe);
  }
 }
 @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
  super.onActivityResult(requestCode,resultCode,data);
  if(requestCode==FILE_PICKER&&pendingFiles!=null){
   pendingFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode,data));pendingFiles=null;
  }
 }
 @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults){
  super.onRequestPermissionsResult(requestCode,permissions,grantResults);
  if(requestCode!=PHONE_MEDIA_PERMISSION||pendingPhoneMedia==null)return;
  PermissionRequest request=pendingPhoneMedia;pendingPhoneMedia=null;
  boolean permitted=grantResults.length>0;
  for(int result:grantResults)if(result!=PackageManager.PERMISSION_GRANTED)permitted=false;
  if(permitted){
   WebView view=active();
   Uri page=Uri.parse(view==null?"":view.getUrl());
   if(!"quantaphi.org".equalsIgnoreCase(page.getHost())||page.getPath()==null||!page.getPath().startsWith("/phone/"))permitted=false;
  }
  if(permitted)request.grant(request.getResources());
  else{request.deny();note("Microphone/camera permission denied. No call media was captured.");}
 }
 @Override public void onBackPressed(){
  WebView w=active();
  if(w!=null&&w.canGoBack()){w.goBack();return;}
  if(tabs.size()>1){closeTab();return;}
  home();
 }
 @Override protected void onDestroy(){
  if(pendingPhoneMedia!=null){pendingPhoneMedia.deny();pendingPhoneMedia=null;}
  if(pendingFiles!=null){pendingFiles.onReceiveValue(null);pendingFiles=null;}
  for(WebView w:tabs){w.stopLoading();if(w.getParent()!=null)((android.view.ViewGroup)w.getParent()).removeView(w);w.destroy();}
  tabs.clear();super.onDestroy();
 }
}
