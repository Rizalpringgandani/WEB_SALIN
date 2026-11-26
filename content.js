(() => {
  // Prevent duplicate injections
  if (document.getElementById('psc-floating-container')) return;

  // Storage key
  const STORAGE_KEY = 'psc_saved_prompt_data';
  const POS_KEY = 'psc_widget_pos';

  // Inject HTML structure
  const container = document.createElement('div');
  container.id = 'psc-floating-container';
  container.innerHTML = `
    <div class="psc-header" id="psc-drag-handle">
      <div class="psc-title-area">
        <span class="psc-title">🎬 Prompt Copier</span>
        <span class="psc-counter-badge" id="psc-counter">0/0</span>
      </div>
      <div class="psc-header-controls">
        <button class="psc-ctrl-btn" id="psc-btn-min" title="Minimalkan">−</button>
        <button class="psc-ctrl-btn" id="psc-btn-close" title="Tutup">×</button>
      </div>
    </div>
    <div class="psc-body" id="psc-body-area">
      <div class="psc-input-box">
        <textarea class="psc-textarea" id="psc-raw-text" placeholder="tempel teks prompt dari Gemini di sini..."></textarea>
        <div class="psc-input-actions">
          <label class="psc-upload-label" title="Pilih file teks (.txt)">
            📁 Buka File .txt
            <input type="file" id="psc-file-input" accept=".txt,.text,.md" style="display:none;" />
          </label>
          <button class="psc-btn-load" id="psc-btn-parse">Muat Scene</button>
        </div>
      </div>

      <div class="psc-toolbar">
        <span style="font-size:11px; color:#475569;">Otomatis buang label scene saat salin</span>
        <div class="psc-tool-links">
          <button class="psc-link-btn" id="psc-btn-reset-colors" title="Kembalikan semua tombol jadi hijau">Reset Warna</button>
          <button class="psc-link-btn psc-danger" id="psc-btn-clear" title="Hapus semua daftar">Bersihkan</button>
        </div>
      </div>

      <div class="psc-list" id="psc-scene-list">
        <div class="psc-empty-note">Belum ada adegan. Tempel teks di atas atau unggah file .txt lalu klik "Muat Scene".</div>
      </div>
    </div>
  `;

  // Launcher Pill (appears when minimized)
  const launcher = document.createElement('div');
  launcher.id = 'psc-launcher-pill';
  launcher.innerHTML = `📋 <span>Prompt Copier</span> <span id="psc-pill-counter" style="font-size:11px; opacity:0.8;">(0/0)</span>`;

  document.body.appendChild(container);
  document.body.appendChild(launcher);

  // References
  const rawTextarea = document.getElementById('psc-raw-text');
  const fileInput = document.getElementById('psc-file-input');
  const parseBtn = document.getElementById('psc-btn-parse');
  const sceneList = document.getElementById('psc-scene-list');
  const counterBadge = document.getElementById('psc-counter');
  const pillCounter = document.getElementById('psc-pill-counter');
  const resetColorsBtn = document.getElementById('psc-btn-reset-colors');
  const clearBtn = document.getElementById('psc-btn-clear');
  const minBtn = document.getElementById('psc-btn-min');
  const closeBtn = document.getElementById('psc-btn-close');
  const dragHandle = document.getElementById('psc-drag-handle');

  // State
  let scenes = []; // Array of { id, displayLabel, fullPrompt, copied }

  // Load Saved Position
  const savedPos = localStorage.getItem(POS_KEY);
  if (savedPos) {
    try {
      const pos = JSON.parse(savedPos);
      container.style.top = pos.top;
      container.style.left = pos.left;
      container.style.right = 'auto';
    } catch (e) {}
  }

  // Load Saved Data
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      scenes = JSON.parse(savedData);
      renderList();
    } catch (e) {}
  }

  // Save State
  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
    updateCounters();
  }

  // Update Counters
  function updateCounters() {
    const total = scenes.length;
    const copiedCount = scenes.filter(s => s.copied).length;
    const text = `${copiedCount}/${total}`;
    counterBadge.textContent = text;
    pillCounter.textContent = `(${text})`;
  }

  // Parser Logic
  function parseText(raw) {
    if (!raw || !raw.trim()) return [];

    const lines = raw.split(/\r?\n/);
    const parsed = [];
    let currentLabel = '';
    let currentBuffer = [];

    // Regex to match "scene 010", "scene 1", "Scene 2:", "Adegan 1", or "1."
    const sceneHeaderRegex = /^\s*(?:scene|adegan)\s*(\d+)[:\s\-]*/i;
    const numberedRegex = /^\s*(\d+)\.\s+/;

    let sceneCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matchScene = line.match(sceneHeaderRegex);
      const matchNum = line.match(numberedRegex);

      if (matchScene || matchNum) {
        // Save previous block
        if (currentBuffer.length > 0) {
          const content = currentBuffer.join('\n').trim();
          if (content) {
            sceneCount++;
            parsed.push({
              id: sceneCount,
              displayLabel: currentLabel || `Scene ${sceneCount}`,
              fullPrompt: content,
              copied: false
            });
          }
        }

        // Start new block
        if (matchScene) {
          const num = parseInt(matchScene[1], 10);
          currentLabel = `Scene ${num}`;
          // Check if there is prompt content remaining on the same line
          const restOfLine = line.replace(sceneHeaderRegex, '').trim();
          currentBuffer = restOfLine ? [restOfLine] : [];
        } else if (matchNum) {
          const num = parseInt(matchNum[1], 10);
          currentLabel = `Scene ${num}`;
          const restOfLine = line.replace(numberedRegex, '').trim();
          currentBuffer = restOfLine ? [restOfLine] : [];
        }
      } else {
        currentBuffer.push(line);
      }
    }

    // Flush last buffer
    if (currentBuffer.length > 0) {
      const content = currentBuffer.join('\n').trim();
      if (content) {
        sceneCount++;
        parsed.push({
          id: sceneCount,
          displayLabel: currentLabel || `Scene ${sceneCount}`,
          fullPrompt: content,
          copied: false
        });
      }
    }

    // Fallback: If no "scene X" found at all, split by blank lines
    if (parsed.length === 0) {
      const blocks = raw.split(/\n\s*\n+/).map(b => b.trim()).filter(b => b.length > 0);
      blocks.forEach((block, idx) => {
        parsed.push({
          id: idx + 1,
          displayLabel: `Scene ${idx + 1}`,
          fullPrompt: block,
          copied: false
        });
      });
    }

    return parsed;
  }

  // Render Scene List
  function renderList() {
    sceneList.innerHTML = '';

    if (scenes.length === 0) {
      sceneList.innerHTML = `<div class="psc-empty-note">Belum ada adegan. Tempel teks di atas atau unggah file .txt lalu klik "Muat Scene".</div>`;
      updateCounters();
      return;
    }

    scenes.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'psc-row';

      const label = document.createElement('div');
      label.className = 'psc-scene-label';
      label.textContent = item.displayLabel;

      const btn = document.createElement('button');
      btn.className = `psc-btn-copy ${item.copied ? 'psc-copied' : ''}`;
      btn.textContent = 'salin';
      btn.title = 'Klik untuk menyalin prompt lengkap adegan ini';

      btn.addEventListener('click', () => {
        copyPrompt(item.fullPrompt, btn, index);
      });

      row.appendChild(label);
      row.appendChild(btn);
      sceneList.appendChild(row);
    });

    updateCounters();
  }

  // Copy Action
  function copyPrompt(text, btnElement, index) {
    // Write to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        onCopySuccess(btnElement, index);
      }).catch(() => {
        fallbackCopy(text, btnElement, index);
      });
    } else {
      fallbackCopy(text, btnElement, index);
    }
  }

  function fallbackCopy(text, btnElement, index) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    tempInput.style.position = 'fixed';
    tempInput.style.opacity = '0';
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      onCopySuccess(btnElement, index);
    } catch (err) {
      alert('Gagal menyalin otomatis. Izin clipboard dibatasi browser.');
    }
    document.body.removeChild(tempInput);
  }

  function onCopySuccess(btnElement, index) {
    // Turn red and update state
    btnElement.classList.add('psc-copied');
    scenes[index].copied = true;
    saveData();

    // Brief animation feedback
    btnElement.textContent = 'tersalin!';
    setTimeout(() => {
      btnElement.textContent = 'salin';
    }, 700);
  }

  // Load / Parse Handler
  parseBtn.addEventListener('click', () => {
    const raw = rawTextarea.value;
    if (!raw || !raw.trim()) {
      alert('Silakan tempel teks prompt terlebih dahulu di kotak input.');
      return;
    }
    scenes = parseText(raw);
    saveData();
    renderList();
  });

  // File Upload Handler (.txt)
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      rawTextarea.value = content;
      scenes = parseText(content);
      saveData();
      renderList();
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  // Reset Colors Handler (All back to green)
  resetColorsBtn.addEventListener('click', () => {
    scenes.forEach(s => s.copied = false);
    saveData();
    renderList();
  });

  // Clear Handler
  clearBtn.addEventListener('click', () => {
    if (confirm('Yakin ingin menghapus semua daftar scene dan teks?')) {
      scenes = [];
      rawTextarea.value = '';
      saveData();
      renderList();
    }
  });

  // Dragging Implementation
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  dragHandle.addEventListener('mousedown', (e) => {
    if (e.target.closest('.psc-header-controls')) return;
    isDragging = true;
    const rect = container.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let newLeft = e.clientX - dragOffsetX;
    let newTop = e.clientY - dragOffsetY;

    // Boundaries
    const maxLeft = window.innerWidth - container.offsetWidth - 10;
    const maxTop = window.innerHeight - container.offsetHeight - 10;
    newLeft = Math.max(10, Math.min(newLeft, maxLeft));
    newTop = Math.max(10, Math.min(newTop, maxTop));

    container.style.left = `${newLeft}px`;
    container.style.top = `${newTop}px`;
    container.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      localStorage.setItem(POS_KEY, JSON.stringify({
        top: container.style.top,
        left: container.style.left
      }));
    }
  });

  // Minimize & Restore
  function minimizeWidget() {
    container.style.display = 'none';
    launcher.style.display = 'flex';
  }

  function restoreWidget() {
    container.style.display = 'flex';
    launcher.style.display = 'none';
  }

  minBtn.addEventListener('click', minimizeWidget);
  closeBtn.addEventListener('click', minimizeWidget);
  launcher.addEventListener('click', restoreWidget);

  // Message listener from background.js
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'toggle_widget') {
      if (container.style.display === 'none') {
        restoreWidget();
      } else {
        minimizeWidget();
      }
    }
  });

})();
