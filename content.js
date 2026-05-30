(function () {
  const state = {
    aliases: [],
    dialog: null,
    page: 1,
    perPage: 8,
  };

  // I ask the background worker to open a URL in a new tab
  function openUrl(url) {
    chrome.runtime.sendMessage({ action: "open-url", url });
  }

  // I fetch aliases from chrome.storage.sync
  async function loadAliases() {
    try {
      const res = await chrome.storage.sync.get("aliases");
      state.aliases = res.aliases || [];
    } catch (e) {
      state.aliases = [];
    }
  }

  // I persist aliases to chrome.storage.sync
  async function saveAliases() {
    try {
      await chrome.storage.sync.set({ aliases: state.aliases });
    } catch (e) {}
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
    const container = state.dialog.querySelector("#bmr-results");
    const filtered = filterAliases(query);
    const totalPages = Math.ceil(filtered.length / state.perPage) || 1;

    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.perPage;
    const pageItems = filtered.slice(start, start + state.perPage);

    if (state.aliases.length === 0) {
      container.innerHTML =
        '<div class="bmr-empty">No aliases yet. Click "+ Add Alias" to create one.</div>';
      renderPagination(0);
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div class="bmr-empty">No matching aliases</div>';
      renderPagination(0);
      return;
    }

    container.innerHTML = pageItems
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

    renderPagination(filtered.length);
  }

  // I render pagination controls below the results
  function renderPagination(total) {
    const container = state.dialog.querySelector("#bmr-pagination");
    const totalPages = Math.ceil(total / state.perPage);
    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = `
      <button class="bmr-page-btn" data-page="${state.page - 1}" ${state.page <= 1 ? "disabled" : ""}>◀ Prev</button>
      <span class="bmr-page-info">${state.page} / ${totalPages}</span>
      <button class="bmr-page-btn" data-page="${state.page + 1}" ${state.page >= totalPages ? "disabled" : ""}>Next ▶</button>`;
  }

  // I escape HTML entities so user values can't inject markup
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // I show an error popover below the input
  function showError(msg) {
    const inputRow = state.dialog.querySelector(".bmr-input-row");
    if (!inputRow) return;
    let popover = inputRow.querySelector("#bmr-error");
    if (!popover) {
      popover = document.createElement("div");
      popover.id = "bmr-error";
      popover.className = "bmr-error";
      inputRow.appendChild(popover);
    }
    popover.innerHTML = `
      <svg class="bmr-error-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>
      <span>${escapeHtml(msg)}</span>`;
    popover.classList.add("bmr-error-visible");
    clearTimeout(popover._timer);
    popover._timer = setTimeout(() => popover.classList.remove("bmr-error-visible"), 3000);
  }

  // I show/hide the inline form for adding a new alias
  function showAddForm() {
    const d = state.dialog;
    const existing = d.querySelector(".bmr-add-form");
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

    const footer = d.querySelector("#bmr-footer");
    footer.parentNode.insertBefore(form, footer);

    form
      .querySelector(".bmr-add-cancel")
      .addEventListener("click", () => form.remove());
    form.querySelector(".bmr-add-save").addEventListener("click", () => {
      const name = form.querySelector(".bmr-add-name").value.trim();
      const value = form.querySelector(".bmr-add-value").value.trim();
      if (!name || !value) return;
      if (state.aliases.some((a) => a.name === name)) {
        showError("Alias already exists");
        return;
      }
      state.aliases.push({ name, value });
      saveAliases();
      form.remove();
      renderResults(d.querySelector("#bmr-input").value);
    });

    form.querySelector(".bmr-add-name").focus();
  }

  // I build the dialog DOM and wire up all event listeners
  function createDialog() {
    const dialog = document.createElement("dialog");
    dialog.id = "bmr-dialog";

    dialog.innerHTML = `
      <div class="bmr-runner">
        <div class="bmr-input-row">
          <input type="text" id="bmr-input" class="bmr-input" placeholder="Type to search aliases…" autofocus />
          <button id="bmr-manage-btn" class="bmr-manage-btn" title="Manage aliases">⚙</button>
        </div>
        <div id="bmr-results" class="bmr-results"></div>
        <div id="bmr-pagination" class="bmr-pagination"></div>
        <div id="bmr-footer" class="bmr-footer">
          <button id="bmr-add-btn" class="bmr-add-btn">+ Add Alias</button>
          <span class="bmr-hint">Esc · ⚙ to manage</span>
        </div>
      </div>`;

    document.body.appendChild(dialog);

    const input = dialog.querySelector("#bmr-input");
    const addBtn = dialog.querySelector("#bmr-add-btn");
    const manageBtn = dialog.querySelector("#bmr-manage-btn");
    const results = dialog.querySelector("#bmr-results");
    const pagination = dialog.querySelector("#bmr-pagination");

    input.addEventListener("input", () => {
      const popover = dialog.querySelector("#bmr-error");
      if (popover) popover.classList.remove("bmr-error-visible");
      state.page = 1;
      renderResults(input.value);
    });
    addBtn.addEventListener("click", showAddForm);
    manageBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "open-manage" });
    });

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

    // I handle pagination clicks via delegation
    pagination.addEventListener("click", (e) => {
      const btn = e.target.closest(".bmr-page-btn");
      if (!btn || btn.disabled) return;
      state.page = Number(btn.dataset.page);
      renderResults(input.value);
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
    state.page = 1;
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
