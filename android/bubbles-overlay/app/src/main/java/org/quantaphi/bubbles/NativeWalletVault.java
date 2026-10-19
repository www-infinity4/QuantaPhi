package org.quantaphi.bubbles;

import android.content.Context;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Locale;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Holds a verified StarQuest device credential outside Chrome and WebView DOM
 * storage, encrypted under an app-owned AndroidKeyStore key.
 *
 * A physical SIM, model name, carrier, or Android ID is not a login credential.
 * This vault never creates accounts, assigns balances or approves Robot Brain.
 *
 * The app must have successfully accessed an existing wallet in its own trusted
 * WebView at least once before this vault can recover from a subsequent storage
 * reset. Uninstalling the APK can also remove the AndroidKeyStore key.
 */
public final class NativeWalletVault {
    private static final String PREF = "bubbles_native_wallet_v1";
    private static final String ALIAS = "org.quantaphi.bubbles.wallet.aes.v1";
    private static final String ENDPOINT = "https://starquest-ledger.marvaseater.workers.dev/v1/state";
    private static final String PREFIX = "starquest_ledger_device_v1:";
    private static final String SITE = "quantaphi.org";

    private NativeWalletVault() {}

    private static boolean validUsername(String name) {
        return name != null && name.matches("[a-z0-9][a-z0-9._-]{2,47}");
    }
    private static boolean validToken(String token) {
        return token != null && token.matches("sq_[A-Za-z0-9_-]{32,160}");
    }
    private static boolean trusted(WebView view) {
        if (view == null) return false;
        Uri u = Uri.parse(String.valueOf(view.getUrl()));
        return "https".equals(u.getScheme()) && SITE.equals(u.getHost())
                && "/bubbles.html".equals(u.getPath());
    }

    private static SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(ALIAS)) return (SecretKey) store.getKey(ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }

    private static JSONObject saved(Context context) {
        try {
            String encoded = context.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString("record", "");
            if (encoded.isEmpty()) return null;
            byte[] value = Base64.decode(encoded, Base64.NO_WRAP);
            if (value.length < 30) return null;
            byte[] iv = new byte[12], cipherText = new byte[value.length - iv.length];
            System.arraycopy(value, 0, iv, 0, iv.length);
            System.arraycopy(value, iv.length, cipherText, 0, cipherText.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
            JSONObject record = new JSONObject(new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8));
            return validUsername(record.optString("username"))
                    && validToken(record.optString("token")) ? record : null;
        } catch (Exception error) {
            // Never silently create a new identity on decryption failure.
            return null;
        }
    }

    private static void persist(Context context, String username, String token) throws Exception {
        if (!validUsername(username) || !validToken(token)) throw new IllegalArgumentException("Invalid wallet");
        JSONObject existing = saved(context);
        // A signed-in but different browser profile cannot silently overwrite
        // the APK's previously verified wallet.
        if (existing != null && !username.equals(existing.optString("username")))
            return;
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        byte[] iv = cipher.getIV();
        byte[] ciphertext = cipher.doFinal(new JSONObject().put("username", username)
                .put("token", token).toString().getBytes(StandardCharsets.UTF_8));
        byte[] wrapped = new byte[iv.length + ciphertext.length];
        System.arraycopy(iv, 0, wrapped, 0, iv.length);
        System.arraycopy(ciphertext, 0, wrapped, iv.length, ciphertext.length);
        if (!context.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit()
                .putString("record", Base64.encodeToString(wrapped, Base64.NO_WRAP)).commit())
            throw new IllegalStateException("Encrypted wallet could not be persisted");
    }

    /** Verify remotely before trusting or restoring any existing device token. */
    private static String verify(String token) {
        if (!validToken(token)) return "";
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(ENDPOINT).openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Authorization", "Bearer " + token);
            connection.setRequestProperty("Accept", "application/json");
            connection.setConnectTimeout(6000);
            connection.setReadTimeout(7000);
            if (connection.getResponseCode() != 200) return "";
            StringBuilder body = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                    connection.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null && body.length() < 16000) body.append(line);
            }
            JSONObject response = new JSONObject(body.toString());
            if (!response.optBoolean("ok")) return "";
            String name = response.optJSONObject("state") == null ? "" :
                    response.getJSONObject("state").optString("username", "").toLowerCase(Locale.ROOT);
            return validUsername(name) ? name : "";
        } catch (Exception ignored) {
            return ""; // Offline is not evidence that ownership changed.
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    // Read only the first-party WebView's existing wallet credential. If a
    // different account is selected, do not probe or override it.
    private static final String SNAPSHOT =
            "(function(){try{const p='starquest_ledger_device_v1:';"
            + "const s=JSON.parse(localStorage.getItem('starquest_session')||'null');"
            + "const name=String(s?.key||s?.username||'').toLowerCase();"
            + "const valid=t=>/^sq_[A-Za-z0-9_-]{32,160}$/.test(t||'');"
            + "let token=name?localStorage.getItem(p+name)||'':'';"
            + "if(!name){const a=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';"
            + "if(k.startsWith(p)&&valid(localStorage.getItem(k)))a.push([k.slice(p.length),localStorage.getItem(k)]);}"
            + "if(a.length===1){token=a[0][1];return JSON.stringify({name:a[0][0],token,selected:false});}}"
            + "return JSON.stringify({name,token:valid(token)?token:'',selected:!!name});"
            + "}catch(e){return '{}';}})()";

    public static void synchronize(Context context, WebView view) {
        if (!trusted(view)) return;
        final String loadedUrl = String.valueOf(view.getUrl());
        view.evaluateJavascript(SNAPSHOT, result -> {
            if (!trusted(view) || !loadedUrl.equals(String.valueOf(view.getUrl()))) return;
            JSONObject snapshot;
            try {
                String text = new org.json.JSONArray("[" + result + "]").optString(0, "{}");
                snapshot = new JSONObject(text);
            } catch (Exception error) { return; }
            String siteName = snapshot.optString("name", "").toLowerCase(Locale.ROOT);
            String siteToken = snapshot.optString("token", "");
            if (validToken(siteToken)) {
                new Thread(() -> {
                    String verified = verify(siteToken);
                    if (!verified.isEmpty() && verified.equals(siteName)) {
                        try { persist(context, verified, siteToken); } catch (Exception ignored) {}
                    }
                }, "BubblesWalletVerify").start();
                return;
            }
            // A website account has been selected: never replace it with
            // credentials from a different native account.
            if (snapshot.optBoolean("selected")) return;
            JSONObject backup = saved(context);
            if (backup == null) return;
            final String token = backup.optString("token");
            final String username = backup.optString("username");
            new Thread(() -> {
                if (!username.equals(verify(token))) return;
                view.post(() -> {
                    if (!trusted(view) || !loadedUrl.equals(String.valueOf(view.getUrl()))) return;
                    String script = "(function(){try{"
                            + "if(localStorage.getItem('starquest_session'))return false;"
                            + "for(let i=0;i<localStorage.length;i++)if((localStorage.key(i)||'').startsWith("
                            + JSONObject.quote(PREFIX) + "))return false;"
                            + "localStorage.setItem(" + JSONObject.quote(PREFIX + username) + ","
                            + JSONObject.quote(token) + ");return true;}catch(e){return false}})()";
                    view.evaluateJavascript(script, restored -> {
                        if ("true".equals(restored) && trusted(view)) view.reload();
                    });
                });
            }, "BubblesWalletRestore").start();
        });
    }
}
