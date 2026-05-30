const perPage = 15;
let aliases = [];
let page = 1;

async function load() {
  try {
    const res = await chrome.storage.sync.get("aliases");
    aliases = res.aliases || [];
  } catch { aliases = []; }
}

async function save() {
  try { await chrome.storage.sync.set({ aliases }); } catch {}
}

function render() {
  const totalPages = Math.ceil(aliases.length / perPage) || 1;
  if (page > totalPages) page = totalPages;
  const start = (page - 1) * perPage;
  const pageItems = aliases.slice(start, start + perPage);

  const tbody = document.getElementById("mng-tbody");

  if (aliases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="mng-empty">No aliases yet. Add one above.</td></tr>';
    renderPagination(0);
    return;
  }

  tbody.innerHTML = pageItems
    .map(
      (a, i) => `
    <tr>
      <td class="mng-name-cell"><img class="mng-favicon" src="${faviconUrl(a.value)}" alt="" loading="lazy" /> ${esc(a.name)}</td>
      <td class="mng-value-cell">${esc(a.value)}</td>
      <td class="mng-actions">
        <button class="mng-edit-btn" data-index="${start + i}">Edit</button>
        <button class="mng-delete-btn" data-name="${esc(a.name)}">Delete</button>
      </td>
    </tr>`,
    )
    .join("");

  renderPagination(aliases.length);
}

function renderPagination(total) {
  const el = document.getElementById("mng-pagination");
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `
    <button class="mng-page-btn" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>◀ Prev</button>
    <span>${page} / ${totalPages}</span>
    <button class="mng-page-btn" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>Next ▶</button>`;
}

function showToast(msg) {
  const existing = document.querySelector(".mng-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "mng-toast";
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>
    <span>${esc(msg)}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("mng-toast-visible"));
  setTimeout(() => toast.classList.remove("mng-toast-visible"), 3000);
}

function faviconUrl(value) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(value).hostname}&sz=16`;
  } catch {
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(`https://${value}`).hostname}&sz=16`;
    } catch { return ""; }
  }
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// add alias
document.getElementById("mng-add-btn").addEventListener("click", async () => {
  const name = document.getElementById("mng-name").value.trim();
  const value = document.getElementById("mng-value").value.trim();
  if (!name || !value) return;
  if (aliases.some((a) => a.name === name)) {
    showToast("Alias already exists");
    return;
  }
  aliases.push({ name, value });
  await save();
  document.getElementById("mng-name").value = "";
  document.getElementById("mng-value").value = "";
  page = Math.ceil(aliases.length / perPage);
  render();
});

// inline edit via prompt (simple)
document.getElementById("mng-tbody").addEventListener("click", async (e) => {
  const editBtn = e.target.closest(".mng-edit-btn");
  if (editBtn) {
    const idx = Number(editBtn.dataset.index);
    const alias = aliases[idx];
    if (!alias) return;
    const newName = prompt("Edit alias name:", alias.name);
    if (newName === null) return;
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    const newValue = prompt("Edit alias value:", alias.value);
    if (newValue === null) return;
    const trimmedValue = newValue.trim();
    if (!trimmedValue) return;
    if (trimmedName !== alias.name && aliases.some((a) => a.name === trimmedName)) {
      showToast("Alias already exists");
      return;
    }
    aliases[idx] = { name: trimmedName, value: trimmedValue };
    await save();
    render();
  }

  const delBtn = e.target.closest(".mng-delete-btn");
  if (delBtn) {
    const name = delBtn.dataset.name;
    if (!confirm(`Delete "${name}"?`)) return;
    aliases = aliases.filter((a) => a.name !== name);
    await save();
    render();
  }
});

// pagination clicks
document.getElementById("mng-pagination").addEventListener("click", (e) => {
  const btn = e.target.closest(".mng-page-btn");
  if (!btn || btn.disabled) return;
  page = Number(btn.dataset.page);
  render();
});

// enter key on inputs
document.getElementById("mng-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("mng-add-btn").click();
});
document.getElementById("mng-value").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("mng-add-btn").click();
});

load().then(render);
