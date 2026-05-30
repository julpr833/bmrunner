(function () {
  const state = {
    aliases: [],
    dialog: null,
  };

  // I ask the background worker to open a URL in a new tab
  function openUrl(url) {
    chrome.runtime.sendMessage({ action: "open-url", url });
  }

  // I fetch aliases from chrome.storage.sync
  async function loadAliases() {
    const res = await chrome.storage.sync.get("aliases");
    state.aliases = res.aliases || [];
  }

  // I persist aliases to chrome.storage.sync
  async function saveAliases() {
    await chrome.storage.sync.set({ aliases: state.aliases });
  }

  // I filter aliases by user query (name or value)
  function filterAliases(query) {
    if (!query) return state.aliases;
    const q = query.toLowerCase();
    return state.aliases.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.value.toLowerCase().includes(q),
    );
  }

  // I rebuild the results list from the current query
  function renderResults(query) {
    const container = document.getElementById("bmr-results");
    const filtered = filterAliases(query);

    if (state.aliases.length === 0) {
      container.innerHTML =
        '<div class="bmr-empty">No aliases yet. Click "+ Add Alias" to create one.</div>';
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div class="bmr-empty">No matching aliases</div>';
      return;
    }

    container.innerHTML = filtered
      .map(
        (alias) => `
      <div class="bmr-result" data-name="${escapeHtml(alias.name)}">
        <div class="bmr-result-main">
          <span class="bmr-result-name">${escapeHtml(alias.name)}</span>
          <span class="bmr-result-value">${escapeHtml(alias.value)}</span>
        </div>
        <button class="bmr-delete" data-name="${escapeHtml(alias.name)}" title="Delete alias">&times;</button>
      </div>`,
      )
      .join("");
  }

  // I escape HTML entities so user values can't inject markup
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // I show/hide the inline form for adding a new alias
  function showAddForm() {
    const existing = document.querySelector(".bmr-add-form");
    if (existing) return existing.remove();

    const form = document.createElement("div");
    form.className = "bmr-add-form";
    form.innerHTML = `
      <input type="text" class="bmr-add-name" placeholder="Alias name (e.g. gg)" />
      <input type="text" class="bmr-add-value" placeholder="Alias value (e.g. https://google.com)" />
      <div class="bmr-add-actions">
        <button class="bmr-add-save">Save</button>
        <button class="bmr-add-cancel">Cancel</button>
      </div>
    `;

    const footer = document.getElementById("bmr-footer");
    footer.parentNode.insertBefore(form, footer);

    form
      .querySelector(".bmr-add-cancel")
      .addEventListener("click", () => form.remove());
    form.querySelector(".bmr-add-save").addEventListener("click", () => {
      const name = form.querySelector(".bmr-add-name").value.trim();
      const value = form.querySelector(".bmr-add-value").value.trim();
      if (!name || !value) return;
      if (state.aliases.some((a) => a.name === name)) {
        alert("An alias with this name already exists.");
        return;
      }
      state.aliases.push({ name, value });
      saveAliases();
      form.remove();
      renderResults(document.getElementById("bmr-input").value);
    });

    form.querySelector(".bmr-add-name").focus();
  }

  // I build the dialog DOM and wire up all event listeners
  function createDialog() {
    const dialog = document.createElement("dialog");
    dialog.id = "bmr-dialog";

    dialog.innerHTML = `
      <div class="bmr-runner">
        <input type="text" id="bmr-input" class="bmr-input" placeholder="Type to search aliases…" autofocus />
        <div id="bmr-results" class="bmr-results"></div>
        <div id="bmr-footer" class="bmr-footer">
          <button id="bmr-add-btn" class="bmr-add-btn">+ Add Alias</button>
          <span class="bmr-hint">Esc to close</span>
        </div>
      </div>`;

    document.body.appendChild(dialog);

    const input = dialog.querySelector("#bmr-input");
    const addBtn = dialog.querySelector("#bmr-add-btn");
    const results = dialog.querySelector("#bmr-results");

    input.addEventListener("input", () => renderResults(input.value));
    addBtn.addEventListener("click", showAddForm);

    dialog.addEventListener("keydown", (e) => {
      if (e.key === "Escape") dialog.close();
    });

    // I handle clicks on results — open on row, delete on ×
    results.addEventListener("click", (e) => {
      const del = e.target.closest(".bmr-delete");
      if (del) {
        const name = del.dataset.name;
        state.aliases = state.aliases.filter((a) => a.name !== name);
        saveAliases();
        renderResults(input.value);
        return;
      }

      const result = e.target.closest(".bmr-result");
      if (result) {
        const name = result.dataset.name;
        const alias = state.aliases.find((a) => a.name === name);
        if (alias) {
          openUrl(alias.value);
          dialog.close();
        }
      }
    });

    // I open the first matching alias when Enter is pressed
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const filtered = filterAliases(input.value);
        if (filtered.length > 0) {
          openUrl(filtered[0].value);
          dialog.close();
        }
      }
    });

    return dialog;
  }

  // I open or close the runner dialog
  async function toggleDialog() {
    if (!state.dialog) {
      await loadAliases();
      state.dialog = createDialog();
    }

    if (state.dialog.open) {
      state.dialog.close();
      return;
    }

    await loadAliases();
    const input = state.dialog.querySelector("#bmr-input");
    input.value = "";
    renderResults("");
    state.dialog.showModal();
    input.focus();
  }

  // I listen for the toggle message from the background worker
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "toggle-dialog") toggleDialog();
  });
})();
