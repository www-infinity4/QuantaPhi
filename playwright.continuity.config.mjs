export default {
 testDir:'./test',testMatch:'continuity-owner-browser.spec.mjs',
 use:{browserName:'chromium',trace:'retain-on-failure'},workers:1,retries:0,
 webServer:{command:'python3 -m http.server 8799 --bind 127.0.0.1',url:'http://127.0.0.1:8799/continuity/',reuseExistingServer:true,timeout:15000}
};
