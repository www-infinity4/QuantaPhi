package org.quantaphi.bubbles;

/** First-party loopback OAuth return screen; never displays an OAuth code or token. */
final class BubblesAuthReturnPage {
    private BubblesAuthReturnPage() {}

    static String render(boolean callbackValid, String packageName) {
        // Only a package identifier from our own Android Context enters this link.
        String app = packageName != null && packageName.matches("[A-Za-z][A-Za-z0-9_.]{3,90}")
                ? packageName : "org.quantaphi.bubbles";
        String appLink = "intent://return#Intent;scheme=quantaphi-bubbles;package=" + app + ";end";
        String label = callbackValid ? "SIGN-IN RETURN RECEIVED" : "SIGN-IN NEEDS ATTENTION";
        String title = callbackValid ? "Head back to Bubbles" : "Let's head back to Bubbles";
        String detail = callbackValid
                ? "Your browser returned the sign-in information. Bubbles is finishing the secure connection on your phone. Check the app for the confirmed ChatGPT status."
                : "Bubbles could not verify this sign-in return. No connection was confirmed. Go back to the app to review the status and try again if needed.";
        return """
                <!doctype html>
                <html lang="en">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
                  <meta name="referrer" content="no-referrer">
                  <meta name="theme-color" content="#f7f4fb">
                  <title>Return to Bubbles AI | QuantaPhi</title>
                  <style>
                    :root{font-family:system-ui,-apple-system,Roboto,"Segoe UI",sans-serif;color-scheme:light}
                    *{box-sizing:border-box}
                    body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:20px;
                      background:radial-gradient(circle at 10% 5%,#e7ddfb,transparent 45%),
                      linear-gradient(145deg,#f8f6fc,#faf8f4);color:#2f2446}
                    main{width:100%;max-width:480px;padding:32px 28px;border:1px solid #e4dbee;
                      border-radius:26px;background:#fff;box-shadow:0 20px 64px #392b5b18}
                    .brand{display:flex;align-items:center;gap:14px;color:#54338b;font-weight:800;letter-spacing:.025em}
                    .orb{width:45px;height:45px;flex:none;border-radius:50%;
                      background:radial-gradient(circle at 27% 24%,white 0 7%,#8fdbf5 19%,#9166d4 67%,#5c3aa8);
                      box-shadow:0 0 0 5px #ebe5fa}
                    .eyebrow{margin:38px 0 10px;font-size:11px;font-weight:800;letter-spacing:.13em;color:#7352a5}
                    h1{font-size:clamp(28px,6vw,38px);line-height:1.12;letter-spacing:-.035em;margin:0 0 16px}
                    p{font-size:16px;line-height:1.65;color:#54496a;margin:0 0 22px}
                    .button{display:block;min-height:52px;padding:15px 13px;text-align:center;
                      border-radius:15px;text-decoration:none;font-weight:750;font-size:16px}
                    .primary{background:#693bb2;color:#fff;box-shadow:0 8px 22px #693bb232}
                    .secondary{background:#f3eefb;border:1px solid #e1d6ef;color:#54358c;margin-top:12px}
                    .hint{font-size:13px;color:#706982;margin:24px 0 0}
                    .foot{border-top:1px solid #eee7f3;margin-top:23px;padding-top:20px;
                      font-size:12px;color:#736c81;line-height:1.55}
                    @media(max-width:420px){main{padding:27px 21px;border-radius:22px}}
                  </style>
                </head>
                <body><main>
                  <div class="brand"><span class="orb" aria-hidden="true"></span><span>Bubbles AI · QuantaPhi</span></div>
                  <div class="eyebrow">{{LABEL}}</div>
                  <h1>{{TITLE}}</h1>
                  <p>{{DETAIL}}</p>
                  <a class="button primary" href="{{APP_LINK}}">Return to Bubbles app &#8594;</a>
                  <a class="button secondary" href="https://quantaphi.org/bubbles.html" rel="noreferrer">Open QuantaPhi Bubbles</a>
                  <p class="hint">If the app doesn't open, switch back to Bubbles on your phone. Sign in again only if the app reports that your connection failed or expired.</p>
                  <div class="foot">Bubbles keeps account credentials on your phone. This page never displays a sign-in code, session token or password.</div>
                </main></body></html>
                """
                .replace("{{LABEL}}", label).replace("{{TITLE}}", title)
                .replace("{{DETAIL}}", detail).replace("{{APP_LINK}}", appLink);
    }
}
