const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const java = path.join(__dirname, '../android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles');
const panel = fs.readFileSync(path.join(java, 'FloatingOracleWindow.java'),'utf8');
const service = fs.readFileSync(path.join(java, 'BubblesService.java'),'utf8');
test('tap opens focusable floating conversation directly without a blocked activity launch', () => {
 assert.match(service,/if \(speaking\) silenceReply\(\)/);
 assert.match(service,/oracleWindow\.show\(\)/);
 assert.match(panel,/WindowManager\.LayoutParams\.TYPE_APPLICATION_OVERLAY/);
 assert.match(panel,/FLAG_NOT_TOUCH_MODAL/);
 assert.doesNotMatch(panel,/FLAG_NOT_FOCUSABLE/);
 assert.doesNotMatch(service.slice(service.indexOf('case MotionEvent.ACTION_UP:')),/startActivity\(conversation\)/);
});
test('voice input continues; both live partials and full conversation refresh on screen', () => {
 assert.match(panel,/getString\("last_partial"/);
 assert.match(panel,/getString\("last_heard"/);
 assert.match(panel,/OracleChatActivity\.renderHistory\(service\)/);
 assert.match(panel,/ui\.postDelayed\(this, 400\)/);
 assert.match(panel,/ACTION_STOP_SPEAKING/);
 assert.match(panel,/ACTION_RESUME/);
 assert.match(panel,/ACTION_TEXT/);
});
test('overlay detaches and stops refresh when service is destroyed', () => {
 assert.match(service,/oracleWindow\.close\(\)/);
 assert.match(panel,/ui\.removeCallbacks\(update\)/);
 assert.match(panel,/manager\.removeView\(root\)/);
});
