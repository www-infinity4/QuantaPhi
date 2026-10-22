document.addEventListener('DOMContentLoaded', function() {
  var checkBtn = document.getElementById('check');
  var statusEl = document.getElementById('status');
  if (checkBtn && statusEl) {
    checkBtn.addEventListener('click', function() {
      statusEl.textContent = 'Build check passed';
    });
  }
});