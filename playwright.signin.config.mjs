export default {
 testDir:'./test',testMatch:'bubbles-signin-browser.spec.mjs',
 use:{browserName:'chromium',viewport:{width:360,height:800},trace:'retain-on-failure'},
 workers:1,retries:0,
 webServer:{command:'python3 -m http.server 8798 --bind 127.0.0.1',url:'http://127.0.0.1:8798/',reuseExistingServer:false,timeout:15000}
};
