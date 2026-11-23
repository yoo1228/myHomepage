const first = ['#7C93C3', '#FFF5F5', '#E8F5E9'];
const second = ['#55679C', '#F7D6D0', '#A5D6A7'];
const third = ['#1E2A5E', '#E2B4BD', '#66BB6A'];
const fourth = ['#E1D7B7', '#4A4A4A', '#1B5E20'];
const h = ['white', 'white', 'white'];
const text = ['white', 'black', 'black'];

const STORAGE_KEY = "tangocho_root_direct_data";
const LEGACY_ACCORDION_KEY = "tangocho_accordion_data";
const LEGACY_FLAT_KEY = "tangocho_data";
const THEME_KEY = "tangocho_theme";

function changeTheme(idx) {
  document.documentElement.style.setProperty('--first', first[idx]);
  document.documentElement.style.setProperty('--second', second[idx]);
  document.documentElement.style.setProperty('--third', third[idx]);
  document.documentElement.style.setProperty('--fourth', fourth[idx]);
  document.documentElement.style.setProperty('--h', h[idx]);
  document.documentElement.style.setProperty('--text', text[idx]);
}

let themeIdx = 0;
const themeButton = document.getElementById('change-theme');
if (themeButton) {
  themeButton.addEventListener('click', () => {
    themeIdx = (themeIdx + 1) % first.length;
    changeTheme(themeIdx);
    localStorage.setItem(THEME_KEY, String(themeIdx));
  });
}

const resizeTextarea = (el) => {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

const rootWordTable = document.getElementById("rootWordTable");
const rootWordTableBody = document.getElementById("rootWordTableBody");
const addRootWordBtn = document.getElementById("addRootWordBtn");
const folderTreeContainer = document.getElementById("folderTreeContainer");
const addRootFolderBtn = document.getElementById("addRootFolderBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const importCsvBtn = document.getElementById("importCsvBtn");
const importCsvInput = document.getElementById("importCsvInput");
const folderTemplate = document.getElementById("folderTemplate");
const rowTemplate = document.getElementById("rowTemplate");
const searchInput = document.getElementById("searchInput");

let appData = {
  rootWords: [{ k: "", y: "", i: "" }],
  folders: []
};

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (e) {
    console.error(e);
  }
}

function setupEditableCell(cell, initialValue, onUpdate) {
  const textarea = cell.querySelector("textarea");
  const display = cell.querySelector(".text-display");
  if (!textarea || !display) return;

  textarea.value = initialValue;
  display.textContent = initialValue;

  if (initialValue.trim() !== "") {
    textarea.style.display = "none";
    display.style.display = "block";
  } else {
    textarea.style.display = "inline-block";
    display.style.display = "none";
  }

  display.addEventListener("click", () => {
    display.style.display = "none";
    textarea.style.display = "inline-block";
    resizeTextarea(textarea);
    textarea.focus();
  });

  textarea.addEventListener("blur", () => {
    display.textContent = textarea.value;
    textarea.style.display = "none";
    display.style.display = "block";
  });

  textarea.addEventListener("input", () => {
    resizeTextarea(textarea);
    onUpdate(textarea.value);
  });
}

function isDescendantOrSelf(sourceNode, targetId) {
  if (sourceNode.id === targetId) return true;
  return sourceNode.children.some((child) => isDescendantOrSelf(child, targetId));
}

function collectAllFolders(nodes, prefix, result) {
  nodes.forEach((node) => {
    const path = prefix ? `${prefix} / ${node.name}` : node.name;
    result.push({ id: node.id, label: path });
    collectAllFolders(node.children, path, result);
  });
}

function collectMoveDestinations(nodes, sourceNode, prefix, result) {
  nodes.forEach((node) => {
    if (!isDescendantOrSelf(sourceNode, node.id)) {
      const path = prefix ? `${prefix} / ${node.name}` : node.name;
      result.push({ id: node.id, label: path });
      collectMoveDestinations(node.children, sourceNode, path, result);
    }
  });
}

function findNodeById(nodes, targetId) {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    const found = findNodeById(node.children, targetId);
    if (found) return found;
  }
  return null;
}

function moveWordTo(sourceWordsArray, wordObj, targetFolderId) {
  const idx = sourceWordsArray.indexOf(wordObj);
  if (idx === -1) return;

  if (targetFolderId === "__ROOT__") {
    if (sourceWordsArray === appData.rootWords) return;
    sourceWordsArray.splice(idx, 1);
    appData.rootWords.push(wordObj);
  } else {
    const destFolder = findNodeById(appData.folders, targetFolderId);
    if (!destFolder || destFolder.words === sourceWordsArray) return;
    sourceWordsArray.splice(idx, 1);
    destFolder.words.push(wordObj);
    destFolder.isOpen = true;
  }

  saveData();
  renderAll();
}

function moveFolderTo(folderObj, parentArray, targetParentId) {
  const idx = parentArray.indexOf(folderObj);
  if (idx === -1) return;

  if (targetParentId === "__ROOT__") {
    if (parentArray === appData.folders) return;
    parentArray.splice(idx, 1);
    appData.folders.push(folderObj);
  } else {
    const destNode = findNodeById(appData.folders, targetParentId);
    if (!destNode || isDescendantOrSelf(folderObj, destNode.id)) return;
    parentArray.splice(idx, 1);
    destNode.children.push(folderObj);
    destNode.isOpen = true;
  }

  saveData();
  renderAll();
}

function dissolveFolder(folderObj, parentArray, parentFolderObj) {
  const idx = parentArray.indexOf(folderObj);
  if (idx === -1) return;

  const validWords = folderObj.words.filter(
    (w) => (w.k && w.k.trim() !== "") || (w.y && w.y.trim() !== "") || (w.i && w.i.trim() !== "")
  );

  if (parentFolderObj) {
    parentFolderObj.words.push(...validWords);
  } else {
    appData.rootWords.push(...validWords);
  }

  parentArray.splice(idx, 1, ...folderObj.children);
  saveData();
  renderAll();
}
function createWordRowElement(wordsArray, wordObj, tbody, isRootWord) {
  const clone = rowTemplate.content.cloneNode(true);
  const tr = clone.querySelector("tr");
  const cells = clone.querySelectorAll(".editable-cell");
  const moveWordSelect = clone.querySelector(".move-word-select");
  const delBtn = clone.querySelector(".round-button");

  if (cells.length >= 3) {
    setupEditableCell(cells.item(0), wordObj.k || "", (val) => {
      wordObj.k = val;
      saveData();
    });
    setupEditableCell(cells.item(1), wordObj.y || "", (val) => {
      wordObj.y = val;
      saveData();
    });
    setupEditableCell(cells.item(2), wordObj.i || "", (val) => {
      wordObj.i = val;
      saveData();
    });
  }

  if (moveWordSelect) {
    moveWordSelect.style.display = "";
    moveWordSelect.innerHTML = "";
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "⇄ 移動";
    defaultOpt.selected = true;
    defaultOpt.disabled = true;
    moveWordSelect.appendChild(defaultOpt);

    if (!isRootWord) {
      const rootOpt = document.createElement("option");
      rootOpt.value = "__ROOT__";
      rootOpt.textContent = "⬆ 最上位へ";
      moveWordSelect.appendChild(rootOpt);
    }

    const allFolders = [];
    collectAllFolders(appData.folders, "", allFolders);
    allFolders.forEach((f) => {
      const destFolder = findNodeById(appData.folders, f.id);
      if (destFolder && destFolder.words !== wordsArray) {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = `📁 ${f.label}`;
        moveWordSelect.appendChild(opt);
      }
    });

    moveWordSelect.addEventListener("change", (e) => {
      const targetId = e.target.value;
      if (targetId) {
        moveWordTo(wordsArray, wordObj, targetId);
      }
    });
  }

  if (delBtn) {
    delBtn.addEventListener("click", () => {
      const idx = wordsArray.indexOf(wordObj);
      if (idx !== -1) {
        wordsArray.splice(idx, 1);
      }
      tr.remove();
      saveData();
    });
  }

  const addWordRow = tbody.querySelector(".add-word-row");
  tbody.insertBefore(clone, addWordRow);

  const insertedRow = addWordRow.previousElementSibling;
  if (insertedRow) {
    insertedRow.querySelectorAll(".js-auto-resize").forEach((el) => {
      if (el.style.display !== "none") resizeTextarea(el);
    });
  }
}



function renderFolderNode(folderObj, parentArray, parentFolderObj, container) {
  const clone = folderTemplate.content.cloneNode(true);
  const folderBlock = clone.querySelector(".folder-block");
  const toggleBtn = clone.querySelector(".folder-toggle-btn");
  const arrowSpan = clone.querySelector(".folder-arrow");
  const titleSpan = clone.querySelector(".folder-title");
  const folderContent = clone.querySelector(".folder-content");
  const tbody = clone.querySelector(".word-table-body");
  const addWordBtn = clone.querySelector(".add-word-btn");
  const subfoldersContainer = clone.querySelector(".subfolders-container");

  const moveSelect = clone.querySelector(".move-folder-select");
  const addSubfolderBtn = clone.querySelector(".add-subfolder-btn");
  const renameBtn = clone.querySelector(".rename-folder-btn");
  const dissolveBtn = clone.querySelector(".dissolve-folder-btn");
  const deleteBtn = clone.querySelector(".delete-folder-btn");

  titleSpan.textContent = folderObj.name;

  if (moveSelect) {
    if (parentArray === appData.folders) {
      moveSelect.style.display = "none";
    } else {
      moveSelect.style.display = "";
      moveSelect.innerHTML = "";
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "⇄ 移動...";
      defaultOpt.selected = true;
      defaultOpt.disabled = true;
      moveSelect.appendChild(defaultOpt);

      const rootOpt = document.createElement("option");
      rootOpt.value = "__ROOT__";
      rootOpt.textContent = "⬆ 最上位の階層へ";
      moveSelect.appendChild(rootOpt);

      const destinations = [];
      collectMoveDestinations(appData.folders, folderObj, "", destinations);
      destinations.forEach((dest) => {
        const opt = document.createElement("option");
        opt.value = dest.id;
        opt.textContent = `📁 ${dest.label} の中へ`;
        moveSelect.appendChild(opt);
      });

      moveSelect.addEventListener("change", (e) => {
        const targetId = e.target.value;
        if (targetId) {
          moveFolderTo(folderObj, parentArray, targetId);
        }
      });
    }
  }

  function updateOpenState(forceOpen = null) {
    const shouldOpen = forceOpen !== null ? forceOpen : folderObj.isOpen;
    if (shouldOpen) {
      folderContent.style.display = "block";
      arrowSpan.textContent = "▼";
      folderContent.querySelectorAll(".js-auto-resize").forEach((el) => {
        if (el.style.display !== "none") resizeTextarea(el);
      });
    } else {
      folderContent.style.display = "none";
      arrowSpan.textContent = "▶";
    }
  }

  folderBlock._updateOpenState = updateOpenState;

  toggleBtn.addEventListener("click", () => {
    folderObj.isOpen = !folderObj.isOpen;
    updateOpenState();
    saveData();
  });

  addSubfolderBtn.addEventListener("click", () => {
    const name = prompt(`「${folderObj.name}」の中に作成するフォルダ名を入力してください`);
    if (!name || name.trim() === "") return;

    folderObj.isOpen = true;
    folderObj.children.push({
      id: `folder_${Date.now()}`,
      name: name.trim(),
      isOpen: true,
      words: [{ k: "", y: "", i: "" }],
      children: []
    });
    saveData();
    renderAll();
  });

  renameBtn.addEventListener("click", () => {
    const newName = prompt("新しいフォルダ名を入力してくだｓあい", folderObj.name);
    if (!newName || newName.trim() === "") return;
    folderObj.name = newName.trim();
    saveData();
    renderAll();
  });

  if (dissolveBtn) {
    dissolveBtn.addEventListener("click", () => {
      if (!confirm(`フォルダ「${folderObj.name}」を解散しますか？`)) return;
      dissolveFolder(folderObj, parentArray, parentFolderObj);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (!confirm(`フォルダ「${folderObj.name}」と中の単語、サブフォルダをすべて完全削除しますか？`)) return;
      const idx = parentArray.indexOf(folderObj);
      if (idx !== -1) {
        parentArray.splice(idx, 1);
      }
      saveData();
      renderAll();
    });
  }

  addWordBtn.addEventListener("click", () => {
    const newWord = { k: "", y: "", i: "" };
    folderObj.words.push(newWord);
    createWordRowElement(folderObj.words, newWord, tbody, false);
    saveData();
  });

  folderObj.words.forEach((wordObj) => {
    createWordRowElement(folderObj.words, wordObj, tbody, false);
  });

  folderObj.children.forEach((childFolder) => {
    renderFolderNode(childFolder, folderObj.children, folderObj, subfoldersContainer);
  });

  container.appendChild(folderBlock);
  updateOpenState();
}
function renderAll() {
  if (rootWordTableBody) {
    rootWordTableBody.querySelectorAll(".word-row").forEach((tr) => tr.remove());
    appData.rootWords.forEach((wordObj) => {
      createWordRowElement(appData.rootWords, wordObj, rootWordTableBody, true);
    });
  }

  if (folderTreeContainer) {
    folderTreeContainer.innerHTML = "";
    appData.folders.forEach((rootFolder) => {
      renderFolderNode(rootFolder, appData.folders, null, folderTreeContainer);
    });
  }

  filterAll();
}

if (addRootWordBtn && rootWordTableBody) {
  addRootWordBtn.addEventListener("click", () => {
    const newWord = { k: "", y: "", i: "" };
    appData.rootWords.push(newWord);
    createWordRowElement(appData.rootWords, newWord, rootWordTableBody, true);
    saveData();
  });
}

if (addRootFolderBtn) {
  addRootFolderBtn.addEventListener("click", () => {
    const name = prompt("フォルダ名を入力してください");
    if (!name || name.trim() === "") return;

    appData.folders.push({
      id: `folder_${Date.now()}`,
      name: name.trim(),
      isOpen: true,
      words: [{ k: "", y: "", i: "" }],
      children: []
    });
    saveData();
    renderAll();
  });
}

function filterAll() {
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";

  if (rootWordTableBody && rootWordTable) {
    let hasRootMatch = false;
    rootWordTableBody.querySelectorAll(":scope > .word-row").forEach((row) => {
      const textareas = row.querySelectorAll("textarea");
      const k = textareas.item(0) ? textareas.item(0).value.toLowerCase() : "";
      const y = textareas.item(1) ? textareas.item(1).value.toLowerCase() : "";
      const i = textareas.item(2) ? textareas.item(2).value.toLowerCase() : "";
      const isMatch = keyword === "" || k.includes(keyword) || y.includes(keyword) || i.includes(keyword);
      row.style.display = isMatch ? "" : "none";
      if (isMatch) hasRootMatch = true;
    });
    rootWordTable.style.display = keyword === "" || hasRootMatch ? "" : "none";
  }

  if (!folderTreeContainer) return;

  function filterFolderBlock(block) {
    const tbody = block.querySelector(":scope > .folder-content > table > .word-table-body");
    const subContainer = block.querySelector(":scope > .folder-content > .subfolders-container");
    let hasMatchingWord = false;

    if (tbody) {
      tbody.querySelectorAll(":scope > .word-row").forEach((row) => {
        const textareas = row.querySelectorAll("textarea");
        const k = textareas.item(0) ? textareas.item(0).value.toLowerCase() : "";
        const y = textareas.item(1) ? textareas.item(1).value.toLowerCase() : "";
        const i = textareas.item(2) ? textareas.item(2).value.toLowerCase() : "";
        const isMatch = keyword === "" || k.includes(keyword) || y.includes(keyword) || i.includes(keyword);
        row.style.display = isMatch ? "" : "none";
        if (keyword !== "" && isMatch) {
          hasMatchingWord = true;
        }
      });
    }

    let hasMatchingSubfolder = false;
    if (subContainer) {
      subContainer.querySelectorAll(":scope > .folder-block").forEach((childBlock) => {
        if (filterFolderBlock(childBlock)) {
          hasMatchingSubfolder = true;
        }
      });
    }

    const totalMatch = hasMatchingWord || hasMatchingSubfolder;

    if (keyword === "") {
      block.style.display = "";
      if (block._updateOpenState) block._updateOpenState(null);
      return true;
    } else {
      block.style.display = totalMatch ? "" : "none";
      if (totalMatch && block._updateOpenState) {
        block._updateOpenState(true);
      }
      return totalMatch;
    }
  }

  folderTreeContainer.querySelectorAll(":scope > .folder-block").forEach((rootBlock) => {
    filterFolderBlock(rootBlock);
  });
}

if (searchInput) {
  searchInput.addEventListener("input", filterAll);
}
if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", () => {
    const csvRows = [["フォルダ", "ことば", "よみ", "備考"]];

    appData.rootWords.forEach((w) => {
      if ((w.k && w.k.trim() !== "") || (w.y && w.y.trim() !== "") || (w.i && w.i.trim() !== "")) {
        csvRows.push(["", w.k || "", w.y || "", w.i || ""]);
      }
    });

    function collectWords(nodes, parentPath) {
      nodes.forEach((node) => {
        const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name;
        const validWords = node.words.filter(
          (w) => (w.k && w.k.trim() !== "") || (w.y && w.y.trim() !== "") || (w.i && w.i.trim() !== "")
        );

        if (validWords.length > 0) {
          validWords.forEach((w) => {
            csvRows.push([currentPath, w.k || "", w.y || "", w.i || ""]);
          });
        } else {
          csvRows.push([currentPath, "", "", ""]);
        }

        if (Array.isArray(node.children) && node.children.length > 0) {
          collectWords(node.children, currentPath);
        }
      });
    }

    collectWords(appData.folders, "");

    const csvString = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvString], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tangocho_all.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

function parseCSV(text) {
  const cleanText = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText.charAt(i);
    const nextChar = cleanText.charAt(i + 1);

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\r" && nextChar === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        i++;
      } else if (char === "\n" || char === "\r") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

if (importCsvBtn && importCsvInput) {
  importCsvBtn.addEventListener("click", () => {
    importCsvInput.value = "";
    importCsvInput.click();
  });

  importCsvInput.addEventListener("change", (e) => {
    const file = e.target.files ? e.target.files.item(0) : null;
    if (!file) return;

    if (!confirm("CSVの内容で上書きしますか?")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const parsedRows = parseCSV(String(event.target.result || ""));
      const newRootWords = [];
      const newFolders = [];
      let idCounter = 0;

      function getOrCreateFolderByPath(pathStr) {
        const parts = pathStr
          .split("/")
          .map((p) => p.trim())
          .filter((p) => p !== "");

        let currentLevel = newFolders;
        let targetNode = null;

        parts.forEach((name) => {
          let found = currentLevel.find((node) => node.name === name);
          if (!found) {
            idCounter += 1;
            found = {
              id: `folder_${Date.now()}_${idCounter}`,
              name,
              isOpen: true,
              words: [],
              children: []
            };
            currentLevel.push(found);
          }
          targetNode = found;
          currentLevel = found.children;
        });

        return targetNode;
      }

      parsedRows.forEach((cols, index) => {
        if (cols.every((c) => !c || c.trim() === "")) return;

        if (index === 0 && (cols.at(0) === "フォルダ" || cols.at(0) === "ことば")) {
          return;
        }

        if (cols.length >= 4) {
          const folderPath = (cols.at(0) || "").trim();
          const k = cols.at(1) || "";
          const y = cols.at(2) || "";
          const i = cols.at(3) || "";
          if (folderPath === "") {
            if (k.trim() !== "" || y.trim() !== "" || i.trim() !== "") {
              newRootWords.push({ k, y, i });
            }
          } else {
            const folderNode = getOrCreateFolderByPath(folderPath);
            if (folderNode && (k.trim() !== "" || y.trim() !== "" || i.trim() !== "")) {
              folderNode.words.push({ k, y, i });
            }
          }
        } else if (cols.length === 3) {
          newRootWords.push({
            k: cols.at(0) || "",
            y: cols.at(1) || "",
            i: cols.at(2) || ""
          });
        } else if (cols.length === 2) {
          newRootWords.push({
            k: cols.at(0) || "",
            y: "",
            i: cols.at(1) || ""
          });
        }
      });

      if (newRootWords.length === 0) {
        newRootWords.push({ k: "", y: "", i: "" });
      }

      const ensureAtLeastOneRow = (nodes) => {
        nodes.forEach((n) => {
          if (n.words.length === 0 && n.children.length === 0) {
            n.words.push({ k: "", y: "", i: "" });
          }
          ensureAtLeastOneRow(n.children);
        });
      };
      ensureAtLeastOneRow(newFolders);

      appData = {
        rootWords: newRootWords,
        folders: newFolders
      };
      saveData();
      renderAll();
    };
    reader.readAsText(file, "UTF-8");
  });
}

function loadInitialData() {
  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme !== null) {
      const idx = Number(savedTheme);
      if (!Number.isNaN(idx) && idx >= 0 && idx < first.length) {
        themeIdx = idx;
        changeTheme(themeIdx);
      }
    }

    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed && Array.isArray(parsed.rootWords) && Array.isArray(parsed.folders)) {
        appData = parsed;
        if (appData.rootWords.length === 0) {
          appData.rootWords.push({ k: "", y: "", i: "" });
        }
        renderAll();
        return;
      }
    }

    const legacyAccordion = localStorage.getItem(LEGACY_ACCORDION_KEY);
    if (legacyAccordion) {
      const parsedFolders = JSON.parse(legacyAccordion);
      if (Array.isArray(parsedFolders) && parsedFolders.length > 0) {
        appData = {
          rootWords: [{ k: "", y: "", i: "" }],
          folders: parsedFolders
        };
        saveData();
        renderAll();
        return;
      }
    }

    const legacyFlat = localStorage.getItem(LEGACY_FLAT_KEY);
    if (legacyFlat) {
      const parsedFlat = JSON.parse(legacyFlat);
      if (Array.isArray(parsedFlat) && parsedFlat.length > 0) {
        appData = {
          rootWords: parsedFlat,
          folders: []
        };
        saveData();
      }
    }
  } catch (e) {
    console.error(e);
  }

  renderAll();
}

window.addEventListener("DOMContentLoaded", loadInitialData);
