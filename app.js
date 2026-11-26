(() => {
  // DOM Elements
  const rawInput = document.getElementById('raw-prompt-input');
  const fileInput = document.getElementById('file-input');
  const btnParse = document.getElementById('btn-parse');
  const btnClearInput = document.getElementById('btn-clear-input');
  const btnResetColors = document.getElementById('btn-reset-colors');
  const btnClearAll = document.getElementById('btn-clear-all');
  const btnPopupMode = document.getElementById('btn-popup-mode');
  const optStripHeader = document.getElementById('opt-strip-header');
  
  const scenesContainer = document.getElementById('scenes-container');
  const emptyState = document.getElementById('empty-state');
  const counterText = document.getElementById('counter-text');
  const listSummary = document.getElementById('list-summary');
  const toast = document.getElementById('toast');

  // Storage Keys
  const STORAGE_KEY = 'prompt_flow_scenes_v1';
  const RAW_TEXT_KEY = 'prompt_flow_raw_v1';

  // State
  let scenes = []; // Array of { id, displayLabel, fullPrompt, cleanPrompt, copied }

  // Initialize
  init();

  function init() {
    loadSavedData();
    bindEvents();
    updateStats();
  }

  function bindEvents() {
    btnParse.addEventListener('click', handleParse);
    btnResetColors.addEventListener('click', handleResetColors);
    btnClearAll.addEventListener('click', handleClearAll);
    btnClearInput.addEventListener('click', () => {
      rawInput.value = '';
      localStorage.removeItem(RAW_TEXT_KEY);
    });

    // File input (.txt)
    fileInput.addEventListener('change', handleFileUpload);

    // Save raw text on typing
    rawInput.addEventListener('input', () => {
      localStorage.setItem(RAW_TEXT_KEY, rawInput.value);
    });

    // Pop-out Mini Window button
    btnPopupMode.addEventListener('click', () => {
      const w = 400;
      const h = 720;
      const left = window.screen.width - w - 20;
      const top = 60;
      window.open(
        window.location.href,
        'SceneCopierMini',
        `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,resizable=yes`
      );
    });
  }

  // Load from LocalStorage
  function loadSavedData() {
    const savedRaw = localStorage.getItem(RAW_TEXT_KEY);
    if (savedRaw) {
      rawInput.value = savedRaw;
    }

    const savedScenes = localStorage.getItem(STORAGE_KEY);
    if (savedScenes) {
      try {
        scenes = JSON.parse(savedScenes);
        renderScenes();
      } catch (e) {
        scenes = [];
      }
    }
  }

  // Save to LocalStorage
  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
    updateStats();
  }

  // Parser: splits text by "scene 010", "Scene 1", "Adegan 1", or "1."
  function parseText(raw) {
    if (!raw || !raw.trim()) return [];

    const lines = raw.split(/\r?\n/);
    const parsed = [];
    let currentLabel = '';
    let currentBuffer = [];

    const sceneHeaderRegex = /^\s*(?:scene|adegan)\s*(\d+)[:\s\-]*/i;
    const numberedRegex = /^\s*(\d+)\.\s+/;

    let sceneCounter = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matchScene = line.match(sceneHeaderRegex);
      const matchNum = line.match(numberedRegex);

      if (matchScene || matchNum) {
        // Save previous block
        if (currentBuffer.length > 0) {
          const content = currentBuffer.join('\n').trim();
          if (content) {
            sceneCounter++;
            parsed.push(createSceneObject(sceneCounter, currentLabel, content));
          }
        }

        // Start new block
        if (matchScene) {
          const num = parseInt(matchScene[1], 10);
          currentLabel = `Scene ${num}`;
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

    // Flush last block
    if (currentBuffer.length > 0) {
      const content = currentBuffer.join('\n').trim();
      if (content) {
        sceneCounter++;
        parsed.push(createSceneObject(sceneCounter, currentLabel, content));
      }
    }

    // Fallback: If no "scene X" found, split by double newlines
    if (parsed.length === 0) {
      const blocks = raw.split(/\n\s*\n+/).map(b => b.trim()).filter(b => b.length > 0);
      blocks.forEach((block, idx) => {
        parsed.push(createSceneObject(idx + 1, `Scene ${idx + 1}`, block));
      });
    }

    return parsed;
  }

  function createSceneObject(id, label, content) {
    return {
      id: id,
      displayLabel: label || `Scene ${id}`,
      fullPrompt: content,
      copied: false
    };
  }

  // Handle Parse Button
  function handleParse() {
    const raw = rawInput.value;
    if (!raw || !raw.trim()) {
      showToast('⚠️ Tempel teks prompt terlebih dahulu!');
      rawInput.focus();
      return;
    }

    scenes = parseText(raw);
    saveData();
    renderScenes();
    showToast(`✅ Berhasil memuat ${scenes.length} adegan!`);
  }

  // Handle File Upload (.txt)
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      rawInput.value = content;
      localStorage.setItem(RAW_TEXT_KEY, content);
      scenes = parseText(content);
      saveData();
      renderScenes();
      showToast(`📁 Berhasil memuat file: ${file.name} (${scenes.length} adegan)`);
    };
    reader.readAsText(file);
    fileInput.value = '';
  }

  // Render Scenes matching user's drawing:
  // Scene 1 [ salin ] (green, turns red on click)
  function renderScenes() {
    scenesContainer.innerHTML = '';

    if (scenes.length === 0) {
      scenesContainer.appendChild(emptyState);
      updateStats();
      return;
    }

    scenes.forEach((scene, index) => {
      const rowWrapper = document.createElement('div');

      const row = document.createElement('div');
      row.className = 'scene-row';

      const info = document.createElement('div');
      info.className = 'scene-info';

      const label = document.createElement('span');
      label.className = 'scene-label';
      label.textContent = scene.displayLabel;

      const previewToggle = document.createElement('button');
      previewToggle.className = 'scene-preview-toggle';
      previewToggle.textContent = 'lihat teks';
      previewToggle.type = 'button';

      info.appendChild(label);
      info.appendChild(previewToggle);

      // The Salin Button
      const btnSalin = document.createElement('button');
      btnSalin.className = `btn-salin ${scene.copied ? 'is-copied' : ''}`;
      btnSalin.textContent = 'salin';
      btnSalin.title = `Salin isi prompt ${scene.displayLabel}`;
      btnSalin.type = 'button';

      // Detail preview box
      const detailBox = document.createElement('div');
      detailBox.className = 'scene-details';
      detailBox.textContent = scene.fullPrompt;

      // Toggle preview
      previewToggle.addEventListener('click', () => {
        const isShown = detailBox.classList.toggle('show');
        previewToggle.textContent = isShown ? 'tutup teks' : 'lihat teks';
      });

      // Click to Copy Action
      btnSalin.addEventListener('click', () => {
        copyToClipboard(scene.fullPrompt, scene.displayLabel, btnSalin, index);
      });

      row.appendChild(info);
      row.appendChild(btnSalin);

      rowWrapper.appendChild(row);
      rowWrapper.appendChild(detailBox);
      scenesContainer.appendChild(rowWrapper);
    });

    updateStats();
  }

  // Copy to Clipboard
  function copyToClipboard(text, label, btnElement, index) {
    let textToCopy = text;

    // Check if user wants to strip "scene X" (enabled by default)
    if (optStripHeader.checked) {
      textToCopy = text.replace(/^\s*(?:scene|adegan)\s*\d+[:\s\-]*/i, '').trim();
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => onCopySuccess(label, btnElement, index))
        .catch(() => fallbackCopy(textToCopy, label, btnElement, index));
    } else {
      fallbackCopy(textToCopy, label, btnElement, index);
    }
  }

  function fallbackCopy(text, label, btnElement, index) {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'fixed';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();
    try {
      document.execCommand('copy');
      onCopySuccess(label, btnElement, index);
    } catch (e) {
      showToast('❌ Gagal menyalin, periksa izin clipboard browser');
    }
    document.body.removeChild(temp);
  }

  function onCopySuccess(label, btnElement, index) {
    // Turn button red
    btnElement.classList.add('is-copied');
    scenes[index].copied = true;
    saveData();

    // Brief visual feedback text
    btnElement.textContent = 'tersalin!';
    setTimeout(() => {
      btnElement.textContent = 'salin';
    }, 600);

    showToast(`📋 ${label} berhasil disalin!`);
  }

  // Reset Colors Handler (All back to green)
  function handleResetColors() {
    if (scenes.length === 0) return;
    scenes.forEach(s => s.copied = false);
    saveData();
    renderScenes();
    showToast('🔄 Semua tombol kembali berwarna HIJAU');
  }

  // Clear All Handler
  function handleClearAll() {
    if (scenes.length === 0) return;
    if (confirm('Yakin ingin menghapus semua daftar adegan?')) {
      scenes = [];
      saveData();
      renderScenes();
      showToast('🗑️ Daftar adegan dibersihkan');
    }
  }

  // Update Stats
  function updateStats() {
    const total = scenes.length;
    const copiedCount = scenes.filter(s => s.copied).length;
    counterText.textContent = `${copiedCount} / ${total} Selesai`;
    listSummary.textContent = `${total} adegan (${copiedCount} sudah disalin)`;
  }

  // Toast Function
  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }
})();
