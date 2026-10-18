(function () {
  // Ensure localStorage exists (Node tests will provide a mock)
  const storage = typeof localStorage !== 'undefined' ? localStorage : {
    _data: {},
    getItem(key) { return this._data[key] ?? null; },
    setItem(key, value) { this._data[key] = String(value); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
  };

  function getDesigns() {
    const json = storage.getItem('physicsCardDesigns');
    return json ? JSON.parse(json) : [];
  }

  function saveDesigns(designs) {
    storage.setItem('physicsCardDesigns', JSON.stringify(designs));
  }

  function incrementBuyerCount() {
    const current = Number(storage.getItem('physicsCardBuyerCount') || 0);
    storage.setItem('physicsCardBuyerCount', current + 1);
  }

  function getPhysicsCardBuyerCount() {
    return Number(storage.getItem('physicsCardBuyerCount') || 0);
  }

  function submitPhysicsCardDesign(data) {
    if (!data.title || !data.description || !data.imageUrl) {
      throw new Error('All fields are required');
    }
    const designs = getDesigns();
    designs.push(data);
    saveDesigns(designs);
    incrementBuyerCount();
    updateBuyerCountUI();
  }

  function updateBuyerCountUI() {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('buyer-count');
      if (el) {
        el.textContent = `Verified buyers: ${getPhysicsCardBuyerCount()}`;
      }
    }
  }

  // Browser form handling
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const form = document.getElementById('physics-card-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const data = {
            title: formData.get('title'),
            description: formData.get('description'),
            imageUrl: formData.get('imageUrl')
          };
          try {
            submitPhysicsCardDesign(data);
            form.reset();
          } catch (err) {
            alert(err.message);
          }
        });
        updateBuyerCountUI();
      }
    });
  }

  // Export for Node tests
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      submitPhysicsCardDesign,
      getPhysicsCardBuyerCount,
      // expose storage for test reset
      _mockStorage: storage
    };
  } else {
    // expose globally for browser
    window.submitPhysicsCardDesign = submitPhysicsCardDesign;
    window.getPhysicsCardBuyerCount = getPhysicsCardBuyerCount;
  }
})();