// --- DOM Element Selections ---
const gridContainer = document.getElementById("sudoku-grid");
const puzzleStringInput = document.getElementById("puzzle-string");
const loadBtn = document.getElementById("load-btn");
const solveBtn = document.getElementById("solve-btn");
const clearBtn = document.getElementById("clear-btn");
const clearColorsBtn = document.getElementById("clear-colors-btn");
const autoPencilBtn = document.getElementById("auto-pencil-btn");
const undoBtn = document.getElementById("undo-btn");
const redoBtn = document.getElementById("redo-btn");
const messageArea = document.getElementById("message-area");
const modeSelector = document.getElementById("mode-selector");
const numberPad = document.getElementById("number-pad");
const candidateModal = document.getElementById("candidate-modal");
const candidateGrid = document.getElementById("candidate-grid");
const closeModalBtn = document.getElementById("close-modal-btn");
const formatToggleBtn = document.getElementById("format-toggle-btn");
const exptModeBtn = document.getElementById("expt-mode-btn");
const dateSelect = document.getElementById("date-select");
const levelSelect = document.getElementById("level-select");
const puzzleInfoContainer = document.getElementById("puzzle-info");
const puzzleLevelEl = document.getElementById("puzzle-level");
const puzzleScoreEl = document.getElementById("puzzle-score");
const puzzleTimerEl = document.getElementById("puzzle-timer");
const modeToggleButton = document.getElementById("mode-toggle-btn");
const colorButton = modeSelector.querySelector('[data-mode="color"]');
const difficultyLamp = document.getElementById("difficulty-lamp");
const vagueHintBtn = document.getElementById("vague-hint-btn");

let vagueHintMessage = "";
let arePencilsHidden = false;

// --- UI Update Functions ---

function updateColorPalettes(isDarkMode) {
  if (isDarkMode) {
    cellColorPalette = colorPaletteDark;
    candidateColorPalette = colorPaletteLight;
  } else {
    cellColorPalette = colorPaletteLight;
    candidateColorPalette = colorPaletteMid;
  }
}

function updateButtonLabels() {
  const isMobile = window.innerWidth <= 550;
  const titleText = document.getElementById("sudoku-title-text");

  if (titleText) {
    if (isMobile) {
      titleText.innerHTML = ` <a href="https://darksabun.club/" class="hover:underline">D.S.</a>`;
    } else {
      titleText.textContent = " Daily Sudoku";
    }
  }

  if (currentMode === "pencil") {
    modeToggleButton.textContent = isMobile ? "Pen." : "Pen.";
  } else {
    modeToggleButton.textContent = isMobile ? "Num." : "Num. (Z)";
  }

  if (currentMode === "color") {
    if (coloringSubMode === "cell") {
      colorButton.textContent = isMobile ? "Color: Cell" : "Color: Cell";
    } else {
      colorButton.textContent = isMobile ? "Color: Cand." : "Color: Cand.";
    }
  } else {
    colorButton.textContent = isMobile ? "Color" : "Color (X)";
  }

  formatToggleBtn.style.display = "none";
  exptModeBtn.style.display = "inline-flex";
  const exptShortcut = isMobile ? "" : " (E)";
  exptModeBtn.textContent =
    (isExperimentalMode ? "Expt!" : "Expt.") + exptShortcut;
  if (isExperimentalMode) {
    exptModeBtn.classList.add("active-green");
  } else {
    exptModeBtn.classList.remove("active-green");
  }

  vagueHintBtn.textContent = isMobile ? "?" : "? (V)";
}

function addSudokuCoachLink(puzzleString) {
  const container = document.getElementById("solver-link-container");
  if (!container) return;
  container.innerHTML = "";
  if (!puzzleString) return;
  const puzzleForLink = puzzleString.replace(/\./g, "0");
  const solverUrl = `https://sudoku.coach/en/solver/${puzzleForLink}`;
  const link = document.createElement("a");
  link.href = solverUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const isMobile = window.innerWidth <= 550;
  link.textContent = isMobile
    ? "Export to SC Solver"
    : "Export to Sudoku Coach Solver (Ctrl+E)";
  link.className =
    "w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600";
  container.appendChild(link);
}

function initBoardState() {
  boardState = Array(9)
    .fill(null)
    .map(() =>
      Array(9)
        .fill(null)
        .map(() => ({
          value: 0,
          isGiven: false,
          pencils: new Set(),
          cellColor: null,
          pencilColors: new Map(),
        }))
    );
}

function createGrid() {
  gridContainer.innerHTML = "";
  for (let i = 0; i < 9; i++) {
    const rowEl = document.createElement("div");
    rowEl.className = "grid-row flex";
    for (let j = 0; j < 9; j++) {
      const cellEl = document.createElement("div");
      cellEl.className = "sudoku-cell";
      cellEl.dataset.row = i;
      cellEl.dataset.col = j;
      rowEl.appendChild(cellEl);
    }
    gridContainer.appendChild(rowEl);
  }
}

function updateControls() {
  numberPad.innerHTML = "";
  if (currentMode === "color") {
    const activePalette =
      coloringSubMode === "candidate"
        ? candidateColorPalette
        : cellColorPalette;
    for (let i = 0; i < 9; i++) {
      const btn = document.createElement("button");
      btn.style.backgroundColor = activePalette[i];
      btn.dataset.color = activePalette[i];
      btn.textContent = i + 1;
      const isDarkMode =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const labelColor =
        coloringSubMode === "candidate"
          ? isDarkMode
            ? "#1f2937"
            : "#e5e7eb"
          : "rgba(255,255,255,0.6)";
      btn.className =
        "color-btn p-2 text-lg font-bold border rounded-md shadow-sm h-12";
      btn.style.color = labelColor;
      btn.addEventListener("mouseenter", () => {
        btn.style.filter = isDarkMode ? "brightness(1.25)" : "brightness(0.9)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.filter = "brightness(1)";
      });
      numberPad.appendChild(btn);
    }
  } else {
    for (let i = 1; i <= 9; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.dataset.number = i;
      btn.className =
        "p-2 text-lg font-bold border rounded-md shadow-sm hover:bg-gray-100 h-12";
      numberPad.appendChild(btn);
    }
  }
}

function renderBoard() {
  const cells = gridContainer.querySelectorAll(".sudoku-cell");
  const isMobile = window.innerWidth <= 550;
  cells.forEach((cell) => {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const state = boardState[row][col];
    cell.innerHTML = "";
    cell.classList.remove(
      "selected",
      "selected-green",
      "invalid",
      "highlighted"
    );
    cell.style.backgroundColor = state.cellColor || "";
    if (state.cellColor) {
      cell.classList.add("has-color");
    } else {
      cell.classList.remove("has-color");
    }
    cell.addEventListener("mouseover", () => {
      if (
        currentMode === "color" &&
        coloringSubMode === "cell" &&
        selectedColor
      ) {
        cell.style.backgroundColor = selectedColor;
      }
    });
    cell.addEventListener("mouseout", () => {
      if (currentMode === "color" && coloringSubMode === "cell") {
        cell.style.backgroundColor = state.cellColor || "";
      }
    });
    if (row === selectedCell.row && col === selectedCell.col) {
      const useGreenHighlight =
        currentMode === "pencil" ||
        (currentMode === "color" && coloringSubMode === "candidate");
      if (useGreenHighlight) {
        cell.classList.add("selected-green");
      } else {
        cell.classList.add("selected");
      }
    }
    const content = document.createElement("div");
    content.className = "cell-content";
    if (state.value !== 0) {
      content.textContent = state.value;
      content.classList.add(state.isGiven ? "given-value" : "user-value");
    } else if (!arePencilsHidden && state.pencils.size > 0) {
      const pencilGrid = document.createElement("div");
      pencilGrid.className = "pencil-grid";
      const orderA = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const orderB = [7, 8, 9, 4, 5, 6, 1, 2, 3];
      const currentOrder = candidatePopupFormat === "A" ? orderA : orderB;
      currentOrder.forEach((i) => {
        const mark = document.createElement("div");
        mark.className = "pencil-mark";
        if (state.pencils.has(i)) {
          mark.textContent = i;
          if (state.pencilColors.has(i)) {
            mark.style.color = state.pencilColors.get(i);
          }
          if (!isMobile || (isMobile && isExperimentalMode)) {
            mark.addEventListener("mouseover", () => {
              if (
                currentMode === "color" &&
                coloringSubMode === "candidate" &&
                selectedColor
              ) {
                mark.style.color = selectedColor;
              }
            });
            mark.addEventListener("mouseout", () => {
              mark.style.color = state.pencilColors.get(i) || "";
            });
            mark.addEventListener("click", (e) => {
              if (
                currentMode === "color" &&
                coloringSubMode === "candidate" &&
                selectedColor
              ) {
                e.stopPropagation();
                const cellState = boardState[row][col];
                const currentColor = cellState.pencilColors.get(i);
                if (currentColor === selectedColor) {
                  cellState.pencilColors.delete(i);
                } else {
                  cellState.pencilColors.set(i, selectedColor);
                }
                saveState();
                renderBoard();
              } else if (isExperimentalMode && currentMode === "pencil") {
                e.stopPropagation();
                const cellState = boardState[row][col];
                if (cellState.pencils.has(i)) {
                  cellState.pencils.delete(i);
                  saveState();
                  onBoardUpdated();
                }
              } else if (isExperimentalMode && currentMode === "concrete") {
                e.stopPropagation();
                const cellState = boardState[row][col];
                if (cellState.isGiven) return;
                cellState.value = i;
                cellState.pencils.clear();
                autoEliminatePencils(row, col, i);
                saveState();
                onBoardUpdated();
                checkCompletion();
              }
            });
          }
        }
        pencilGrid.appendChild(mark);
      });
      content.appendChild(pencilGrid);
    }
    cell.appendChild(content);
    if (highlightState === 1 && highlightedDigit !== null) {
      if (
        state.value === highlightedDigit ||
        (state.value === 0 && state.pencils.has(highlightedDigit))
      ) {
        cell.classList.add("highlighted");
      }
    } else if (highlightState === 2) {
      if (state.value === 0 && state.pencils.size === 2) {
        cell.classList.add("highlighted");
      }
    }
  });
  validateBoard();
}

function updateLamp(color) {
  if (!difficultyLamp) return;
  currentLampColor = color;
  const colors = [
    "white",
    "green",
    "yellow",
    "orange",
    "red",
    "gray",
    "black",
    "bug",
  ];
  difficultyLamp.classList.remove(...colors.map((c) => `lamp-${c}`));
  difficultyLamp.classList.add(`lamp-${color}`);
  const tooltips = {
    white: "Easy: Level 0.",
    green: "Medium: Level 1 - 2.",
    yellow: "Hard: Level 3 - 5.",
    orange: "Unfair: Level 6.",
    red: "Extreme: Level 7+.",
    black: "Error: An incorrect progress has been made.",
    gray: "Invalid: This puzzle does not have a unique solution.",
    bug: "Bug: Report it to fsrs please!",
  };
  difficultyLamp.title = tooltips[color] || "Difficulty Indicator";
}

// --- Event Handlers and Listeners ---

function setupEventListeners() {
  gridContainer.addEventListener("click", handleCellClick);
  modeSelector.addEventListener("click", handleModeChange);
  numberPad.addEventListener("click", handleNumberPadClick);
  loadBtn.addEventListener("click", () => loadPuzzle(puzzleStringInput.value));
  solveBtn.addEventListener("click", solve);
  clearBtn.addEventListener("click", clearUserBoard);
  clearColorsBtn.addEventListener("click", clearAllColors);
  autoPencilBtn.addEventListener("click", autoPencil);
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);
  closeModalBtn.addEventListener("click", () =>
    candidateModal.classList.add("hidden")
  );
  window.addEventListener("resize", updateButtonLabels);
  formatToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    candidatePopupFormat = candidatePopupFormat === "A" ? "B" : "A";
    updateButtonLabels();
    renderBoard();
    const tip = `Candidate display set to ${
      candidatePopupFormat === "A" ? "Numpad (A)" : "Phone (B)"
    } layout.`;
    showMessage(tip, "gray");
    if (
      !candidateModal.classList.contains("hidden") &&
      selectedCell.row !== null
    ) {
      showCandidatePopup(selectedCell.row, selectedCell.col);
    }
  });
  dateSelect.addEventListener("change", () => {
    if (dateSelect.value === "custom") {
      dateModal.classList.remove("hidden");
      dateModal.classList.add("flex");
      dateInput.value = "";
      dateError.textContent = "";
      dateInput.focus();
    } else {
      findAndLoadSelectedPuzzle();
    }
  });
  levelSelect.addEventListener("change", findAndLoadSelectedPuzzle);
  document.addEventListener("keydown", handleKeyPress);
  modeToggleButton.addEventListener("mouseenter", () => {
    const isMobile = window.innerWidth <= 550;
    if (currentMode === "concrete") {
      modeToggleButton.textContent = isMobile ? "Pen.?" : "Pencil?";
    } else if (currentMode === "pencil") {
      modeToggleButton.textContent = isMobile ? "Num.?" : "Number?";
    }
  });
  modeToggleButton.addEventListener("mouseleave", () => {
    updateButtonLabels();
  });
  colorButton.addEventListener("mouseenter", () => {
    const isMobile = window.innerWidth <= 550;
    if (currentMode === "color") {
      if (coloringSubMode === "cell") {
        colorButton.textContent = isMobile ? "Color: Cand?" : "Color: Cand?";
      } else {
        colorButton.textContent = isMobile ? "Color: Cell?" : "Color: Cell?";
      }
    }
  });
  colorButton.addEventListener("mouseleave", () => {
    updateButtonLabels();
  });
  const dateModal = document.getElementById("date-modal");
  const dateInput = document.getElementById("date-input");
  const dateError = document.getElementById("date-error");
  const dateSubmitBtn = document.getElementById("date-submit-btn");
  const dateCancelBtn = document.getElementById("date-cancel-btn");
  dateInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      dateModal.classList.add("hidden");
      dateModal.classList.remove("flex");
      dateSelect.value = dateSelect.querySelector("option").value;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      dateSubmitBtn.click();
    }
    if (e.key === "Backspace") {
      const pos = dateInput.selectionStart;
      if (pos && (pos === 5 || pos === 8)) {
        dateInput.setSelectionRange(pos - 1, pos - 1);
      }
    }
  });
  dateInput.addEventListener("input", () => {
    let val = dateInput.value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);
    let formatted = "";
    if (val.length > 0) formatted = val.slice(0, 4);
    if (val.length > 4) formatted += "-" + val.slice(4, 6);
    if (val.length > 6) formatted += "-" + val.slice(6, 8);
    dateInput.value = formatted;
  });
  dateSelect.addEventListener("change", () => {
    if (dateSelect.value === "custom") {
      dateModal.classList.remove("hidden");
      dateModal.classList.add("flex");
      dateInput.value = "";
      dateError.textContent = "";
      dateInput.focus();
      return;
    }
    findAndLoadSelectedPuzzle();
  });
  dateSubmitBtn.addEventListener("click", () => {
    const rawValue = dateInput.value.replace(/\D/g, "");
    if (!isValidDate(rawValue)) {
      dateError.textContent =
        "Please enter a valid calendar date (YYYY-MM-DD).";
      return;
    }
    const dateNum = parseInt(rawValue, 10);
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const kstOffset = 9 * 60 * 60 * 1000;
    const today = new Date(utc + kstOffset);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayNum = parseInt(`${yyyy}${mm}${dd}`);
    const todayStr = `${yyyy}-${mm}-${dd}`;
    if (dateNum < 20250912 || dateNum > todayNum) {
      dateError.textContent = `Date must be between 2025-09-12 and ${todayStr}.`;
      return;
    }
    let customOption = [...dateSelect.options].find(
      (opt) => opt.value === rawValue
    );
    if (!customOption) {
      customOption = document.createElement("option");
      customOption.value = rawValue;
      customOption.textContent = `${rawValue.slice(0, 4)}-${rawValue.slice(
        4,
        6
      )}-${rawValue.slice(6, 8)}`;
      dateSelect.appendChild(customOption);
    }
    dateSelect.value = rawValue;
    dateModal.classList.add("hidden");
    dateModal.classList.remove("flex");
    findAndLoadSelectedPuzzle();
  });
  dateCancelBtn.addEventListener("click", () => {
    dateModal.classList.add("hidden");
    dateModal.classList.remove("flex");
    dateSelect.value = dateSelect.querySelector("option").value;
  });
  vagueHintBtn.addEventListener("click", () => {
    if (currentLampColor === "gray") {
      showMessage("No hint available for an invalid puzzle.", "red");
    } else if (currentLampColor === "black") {
      showMessage("Hint unavailable: a wrong progress has been made.", "red");
    } else if (vagueHintMessage) {
      showMessage(`Vague Hint: ${vagueHintMessage}`, "green");
    } else {
      showMessage("Hint is only available until Level 6 techniques.", "orange");
    }
  });
  exptModeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (arePencilsHidden && !isExperimentalMode) {
      showMessage(
        "Experimental mode is disabled while marks are hidden.",
        "orange"
      );
      return;
    }
    isExperimentalMode = !isExperimentalMode;
    updateButtonLabels();
    const isMobile = window.innerWidth <= 550;
    let tip = "";
    if (isExperimentalMode) {
      tip = isMobile
        ? "Expt. ON: Direct coloring, plus click candidates to remove (Pencil) or set (Number)."
        : "Expt. ON: Click candidates to remove (Pencil mode) or set as value (Number mode).";
    } else {
      tip = isMobile
        ? "Expt. OFF: Popup coloring enabled."
        : "Expt. OFF: Click-to-set/remove candidates disabled.";
    }
    showMessage(tip, "gray");
  });
}

function handleKeyPress(e) {
  const key = e.key;
  const key_lower = e.key.toLowerCase();
  const isCtrlOrCmd = e.ctrlKey || e.metaKey;
  if (isCtrlOrCmd && key_lower === "a") {
    e.preventDefault();
    arePencilsHidden = !arePencilsHidden;
    if (arePencilsHidden) {
      let message =
        "Pencil marks hidden. (Press <span class='shortcut-highlight'>Ctrl+A</span> to make visible)";
      // Force-switch from pencil to number mode if active
      if (currentMode === "pencil") {
        currentMode = "concrete";
        message += " Switched to Number mode.";
      }
      // Force-switch from candidate to cell coloring if active
      if (currentMode === "color" && coloringSubMode === "candidate") {
        coloringSubMode = "cell";
        message += " Switched to Cell coloring mode.";
      }
      // Force-disable experimental mode if active
      if (isExperimentalMode) {
        isExperimentalMode = false;
        message += " Experimental mode disabled.";
      }
      showMessage(message, "gray");
      updateControls();
      updateButtonLabels();
      renderBoard();
    } else {
      showMessage("Pencil marks are now visible.", "gray");
      renderBoard();
    }
    return;
  }
  if (isCtrlOrCmd && key_lower === "z") {
    e.preventDefault();
    undo();
    return;
  }
  if (isCtrlOrCmd && key_lower === "y") {
    e.preventDefault();
    redo();
    return;
  }
  if (isCtrlOrCmd && key_lower === "e") {
    e.preventDefault();
    const solverButton = document.querySelector("#solver-link-container a");
    if (solverButton) {
      solverButton.click();
    }
    return;
  }
  if (document.activeElement.tagName === "INPUT") {
    return;
  }
  if (key === "Escape" && !candidateModal.classList.contains("hidden")) {
    candidateModal.classList.add("hidden");
    return;
  }
  if (!candidateModal.classList.contains("hidden")) {
    if (key >= "1" && key <= "9") {
      const candidateButtons = candidateGrid.querySelectorAll("button");
      let targetButton = null;
      candidateButtons.forEach((btn) => {
        if (btn.textContent === key) {
          targetButton = btn;
        }
      });
      if (targetButton && !targetButton.disabled) {
        targetButton.click();
      }
    }
    return;
  }
  if (key.startsWith("Arrow")) {
    e.preventDefault();
    let { row, col } = selectedCell;
    if (row === null || col === null) {
      selectedCell = { row: 0, col: 0 };
    } else {
      if (key === "ArrowUp") {
        selectedCell.row = (row - 1 + 9) % 9;
      } else if (key === "ArrowDown") {
        selectedCell.row = (row + 1) % 9;
      } else if (key === "ArrowLeft") {
        selectedCell.col = (col - 1 + 9) % 9;
      } else if (key === "ArrowRight") {
        selectedCell.col = (col + 1) % 9;
      }
    }
    onBoardUpdated();
    return;
  }
  if (key === "Enter") {
    if (selectedCell.row !== null) {
      const cellState = boardState[selectedCell.row][selectedCell.col];
      if (highlightState === 0 && cellState.pencils.size === 2) {
        highlightedDigit = null;
        highlightState = 2;
      } else if (cellState.value !== 0) {
        if (highlightedDigit !== cellState.value) {
          highlightedDigit = cellState.value;
          highlightState = 1;
        } else {
          highlightedDigit = null;
          highlightState = 0;
        }
      }
      onBoardUpdated();
    }
    return;
  }
  if (!isCtrlOrCmd && key === "Shift") {
    highlightedDigit = null;
    highlightState = 0;
    onBoardUpdated();
    return;
  }
  if (key === "Delete" || key === "Backspace") {
    e.preventDefault();
    if (selectedCell.row !== null) {
      const { row, col } = selectedCell;
      const cellState = boardState[row][col];
      if (
        !cellState.isGiven &&
        (cellState.value !== 0 || cellState.pencils.size > 0)
      ) {
        cellState.value = 0;
        cellState.pencils.clear();
        saveState();
        onBoardUpdated();
      }
    }
    return;
  }
  if (key_lower === "z") {
    modeToggleButton.click();
    return;
  }
  if (key_lower === "x") {
    colorButton.click();
    return;
  }
  if (key_lower === "c") {
    if (
      currentMode === "color" &&
      selectedCell.row !== null &&
      selectedColor !== null
    ) {
      if (coloringSubMode === "cell") {
        const { row, col } = selectedCell;
        const cellState = boardState[row][col];
        const oldColor = cellState.cellColor;
        const newColor = oldColor === selectedColor ? null : selectedColor;
        if (oldColor !== newColor) {
          cellState.cellColor = newColor;
          saveState();
        }
      } else {
        showCandidatePopup(selectedCell.row, selectedCell.col);
      }
      onBoardUpdated();
    }
    return;
  }
  if (key_lower === "v") {
    vagueHintBtn.click();
    return;
  }
  if (key_lower === "d") {
    formatToggleBtn.click();
    return;
  }
  if (key_lower === "a" && !isCtrlOrCmd) {
    autoPencilBtn.click();
    return;
  }
  if (key_lower === "s") {
    solveBtn.click();
    return;
  }
  if (key_lower === "e" && !isCtrlOrCmd) {
    if (arePencilsHidden) {
      showMessage(
        "Experimental mode is disabled while marks are hidden. (Press Ctrl+A to make visible)",
        "orange"
      );
      return;
    }
    exptModeBtn.click();
    return;
  }
  if (key_lower === "q") {
    clearBtn.click();
    return;
  }
  if (key_lower === "w") {
    clearColorsBtn.click();
    return;
  }
  if (key >= "1" && key <= "9") {
    if (currentMode === "color") {
      const colorButtons = numberPad.querySelectorAll("button");
      const colorIndex = parseInt(key) - 1;
      if (colorButtons[colorIndex]) {
        colorButtons[colorIndex].click();
      }
    } else if (currentMode === "concrete" || currentMode === "pencil") {
      if (selectedCell.row === null) return;
      const numPadButton = numberPad.querySelector(
        `button[data-number="${key}"]`
      );
      if (numPadButton) {
        numPadButton.click();
      }
    }
  }
}

function handleCellClick(e) {
  const cell = e.target.closest(".sudoku-cell");
  if (!cell) return;
  selectedCell.row = parseInt(cell.dataset.row);
  selectedCell.col = parseInt(cell.dataset.col);
  const cellState = boardState[selectedCell.row][selectedCell.col];
  const isMobile = window.innerWidth <= 550;
  let needsRenderOnly = false;
  if (currentMode === "color") {
    if (coloringSubMode === "cell" && selectedColor) {
      const oldColor = cellState.cellColor;
      const newColor = oldColor === selectedColor ? null : selectedColor;
      if (oldColor !== newColor) {
        cellState.cellColor = newColor;
        saveState();
      }
      needsRenderOnly = true;
    } else if (coloringSubMode === "candidate") {
      if (isMobile && !isExperimentalMode) {
        showCandidatePopup(selectedCell.row, selectedCell.col);
      }
      needsRenderOnly = true;
    }
  } else {
    if (highlightState === 0 && cellState.pencils.size === 2) {
      highlightedDigit = null;
      highlightState = 2;
    } else if (cellState.value !== 0) {
      if (highlightedDigit !== cellState.value) {
        highlightedDigit = cellState.value;
        highlightState = 1;
      } else {
        highlightedDigit = null;
        highlightState = 0;
      }
    }
    needsRenderOnly = true;
  }
  if (needsRenderOnly) {
    renderBoard();
  }
}

function handleModeChange(e) {
  const clickedButton = e.target.closest("button");
  if (!clickedButton) return;
  if (clickedButton !== modeToggleButton && clickedButton !== colorButton) {
    return;
  }
  if (clickedButton === modeToggleButton) {
    const targetMode = currentMode === "concrete" ? "pencil" : "concrete";
    if (targetMode === "pencil" && arePencilsHidden) {
      showMessage(
        "Pencil mode is disabled while marks are hidden. (Press Ctrl+A to make visible)",
        "orange"
      );
      return;
    }
  }

  if (clickedButton === colorButton) {
    if (currentMode === "color") {
      const targetSubMode = coloringSubMode === "cell" ? "candidate" : "cell";
      if (targetSubMode === "candidate" && arePencilsHidden) {
        showMessage(
          "Candidate coloring is disabled while marks are hidden. (Press Ctrl+A to make visible)",
          "orange"
        );
        return;
      }
    }
  }
  const previousMode = currentMode;
  if (clickedButton === modeToggleButton) {
    currentMode =
      currentMode === "concrete" || currentMode === "pencil"
        ? currentMode === "concrete"
          ? "pencil"
          : "concrete"
        : "concrete";
  } else if (clickedButton === colorButton) {
    if (currentMode !== "color") {
      currentMode = "color";
      coloringSubMode = "cell";
    } else {
      coloringSubMode = coloringSubMode === "cell" ? "candidate" : "cell";
    }
  }
  const isMobile = window.innerWidth <= 550;
  let tip = "";
  if (currentMode === "concrete") {
    tip = isMobile
      ? "Tip: Touch a filled cell to highlight its number."
      : "Tip: Click a filled&nbsp;cell&nbsp;<span class='shortcut-highlight'>(or press 'Enter')</span> to highlight its number.";
  } else if (currentMode === "pencil") {
    tip = isMobile
      ? "Tip: Touch a cell, then a digit to toggle a pencil mark."
      : "Tip: Click a cell, then a digit to toggle a pencil mark.";
  } else if (currentMode === "color") {
    if (coloringSubMode === "cell") {
      tip = isMobile
        ? "Tip: Pick a color, then touch a cell to paint it."
        : "Tip: Pick a color, then click a&nbsp;cell&nbsp;<span class='shortcut-highlight'>(or press 'C')</span> to paint it.";
    } else {
      tip = isMobile
        ? "Tip: Pick a color, then touch a cell to select a candidate."
        : "Tip: Pick a color, hover over a candidate to preview, and click to apply.";
    }
  }
  showMessage(tip, "gray");
  modeToggleButton.classList.remove("active", "active-green");
  colorButton.classList.remove("active", "active-green");
  if (currentMode === "concrete") {
    modeToggleButton.classList.add("active");
  } else if (currentMode === "pencil") {
    modeToggleButton.classList.add("active-green");
  } else if (currentMode === "color") {
    if (coloringSubMode === "candidate") {
      colorButton.classList.add("active-green");
    } else {
      colorButton.classList.add("active");
    }
  }
  const wasColor = previousMode === "color";
  const isColor = currentMode === "color";
  if (isColor || wasColor) {
    updateControls();
    if (isColor) {
      const firstColorButton = numberPad.querySelector(".color-btn");
      if (firstColorButton) {
        selectedColor = firstColorButton.dataset.color;
        firstColorButton.classList.add("selected");
      }
    } else {
      selectedColor = null;
    }
  }
  renderBoard();
  updateButtonLabels();
}

function handleNumberPadClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (currentMode === "color") {
    selectedColor = btn.dataset.color;
    numberPad
      .querySelectorAll(".color-btn")
      .forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    return;
  }
  const num = parseInt(btn.dataset.number);
  if (selectedCell.row !== null) {
    const { row, col } = selectedCell;
    const cellState = boardState[row][col];
    if (cellState.isGiven) return;
    let changeMade = false;
    if (currentMode === "concrete") {
      const oldValue = cellState.value;
      const newValue = oldValue === num ? 0 : num;
      if (oldValue !== newValue) {
        cellState.value = newValue;
        if (newValue !== 0) {
          cellState.pencils.clear();
          autoEliminatePencils(row, col, newValue);
        }
        changeMade = true;
      }
    } else {
      if (cellState.value === 0) {
        if (cellState.pencils.has(num)) {
          cellState.pencils.delete(num);
        } else {
          cellState.pencils.add(num);
        }
        changeMade = true;
      }
    }
    if (changeMade) {
      saveState();
      onBoardUpdated(currentMode === "concrete");
      checkCompletion();
    } else {
      renderBoard();
    }
  }
}

// --- Core App Logic ---

async function populateSelectors() {
  levelSelect.innerHTML = "";
  for (let i = 0; i < 10; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${i} (${difficultyWords[i]})`;
    levelSelect.appendChild(option);
  }
  dateSelect.innerHTML = "";
  const today = new Date();
  const minDateNum = 20250912;
  const recentDates = [];
  for (let i = 0; i < 7; i++) {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const kstOffset = 9 * 60 * 60 * 1000;
    const today = new Date(utc + kstOffset);
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const dateNum = parseInt(`${yyyy}${mm}${dd}`);
    if (dateNum >= minDateNum) {
      recentDates.push({
        dateNum,
        label:
          i === 0 ? "Today" : i === 1 ? "Yesterday" : `${yyyy}-${mm}-${dd}`,
      });
    }
  }
  recentDates.sort((a, b) => b.dateNum - a.dateNum);
  recentDates.forEach(({ dateNum, label }) => {
    const option = document.createElement("option");
    option.value = dateNum;
    option.textContent = label;
    dateSelect.appendChild(option);
  });
  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = "Enter a date";
  dateSelect.appendChild(customOption);
}

function findAndLoadSelectedPuzzle() {
  if (dateSelect.value === "custom") {
    dateSelect.value = dateSelect.options[0].value;
  }
  const selectedDate = parseInt(dateSelect.value, 10);
  const selectedLevel = parseInt(levelSelect.value, 10);
  const puzzle = allPuzzles.find(
    (p) => p.date === selectedDate && p.level === selectedLevel
  );
  if (puzzle) {
    puzzleStringInput.value = puzzle.puzzle;
    loadPuzzle(puzzle.puzzle, puzzle);
    showMessage(
      `Loaded puzzle for ${
        dateSelect.options[dateSelect.selectedIndex].text
      }, Level ${selectedLevel}`,
      "green"
    );
    setTimeout(() => {
      const tip = levelTips[selectedLevel];
      if (tip) {
        showMessage(tip, "gray");
      }
    }, 1500);
  } else {
    initBoardState();
    onBoardUpdated();
    showMessage("No puzzle found for this date and level.", "red");
    puzzleLevelEl.textContent = "";
    puzzleScoreEl.textContent = "";
    puzzleTimerEl.textContent = "";
    stopTimer();
    addSudokuCoachLink(null);
  }
}

function checkCompletion() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (boardState[r][c].value === 0) {
        return;
      }
    }
  }
  if (validateBoard()) {
    if (!isCustomPuzzle) {
      messageArea.innerHTML = "";
      messageArea.className =
        "text-center text-sm font-semibold h-5 flex items-center justify-center gap-2";
      const congratsText = document.createTextNode(
        "Congratulations! You solved it! → "
      );
      const shareButton = document.createElement("button");
      shareButton.textContent = "Share";
      shareButton.className =
        "px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors";
      shareButton.onclick = () => {
        const shareText = generateDiscordShareText();
        navigator.clipboard
          .writeText(shareText)
          .then(() => {
            messageArea.innerHTML = "";
            const colorClasses = [
              "text-red-600",
              "text-green-600",
              "text-gray-600",
              "text-orange-500",
            ];
            messageArea.classList.remove(...colorClasses);
            messageArea.classList.add("text-green-600");
            const successText = document.createTextNode(
              "Copied Discord sharable text!"
            );
            messageArea.appendChild(successText);
            const copyAgainButton = document.createElement("button");
            copyAgainButton.textContent = "Copy Again";
            copyAgainButton.className =
              "px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors";
            copyAgainButton.onclick = shareButton.onclick;
            messageArea.appendChild(copyAgainButton);
          })
          .catch((err) => {
            console.error("Failed to copy text: ", err);
            showMessage("Error: Could not copy text!", "red");
          });
      };
      messageArea.appendChild(congratsText);
      messageArea.appendChild(shareButton);
    } else {
      showMessage("Congratulations! You solved it!", "green");
    }
    triggerSolveAnimation();
    stopTimer();
  }
}

function triggerSolveAnimation() {
  gridContainer.classList.add("is-solved");
  setTimeout(() => {
    gridContainer.classList.remove("is-solved");
  }, 2620);
}

function showCandidatePopup(row, col) {
  candidateGrid.innerHTML = "";
  const cellState = boardState[row][col];
  if (cellState.pencils.size === 0) return;
  const orderA = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const orderB = [7, 8, 9, 4, 5, 6, 1, 2, 3];
  const currentOrder = candidatePopupFormat === "A" ? orderA : orderB;
  currentOrder.forEach((i) => {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className =
      "p-3 border dark:border-gray-500 text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-slate-700 rounded-md";
    if (cellState.pencils.has(i)) {
      btn.classList.add("hover:bg-gray-200", "dark:hover:bg-slate-600");
      if (cellState.pencilColors.has(i)) {
        btn.style.backgroundColor = cellState.pencilColors.get(i);
      }
      btn.onclick = () => {
        const currentColor = cellState.pencilColors.get(i);
        if (currentColor === selectedColor) {
          cellState.pencilColors.delete(i);
        } else {
          cellState.pencilColors.set(i, selectedColor);
        }
        saveState();
        candidateModal.classList.add("hidden");
        onBoardUpdated();
      };
    } else {
      btn.disabled = true;
      btn.classList.add("opacity-25");
    }
    candidateGrid.appendChild(btn);
  });
  candidateModal.classList.remove("hidden");
  candidateModal.classList.add("flex");
}

function clearAllColors() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      boardState[r][c].cellColor = null;
      boardState[r][c].pencilColors.clear();
    }
  }
  saveState();
  renderBoard();
  showMessage("All colors cleared.", "gray");
}

function autoPencil() {
  if (hasUsedAutoPencil && !isAutoPencilPending) {
    showMessage(
      "This will overwrite pencil marks. Click again to apply.",
      "orange"
    );
    isAutoPencilPending = true;
    return;
  }
  let emptyWithNoPencils = 0;
  if (!hasUsedAutoPencil) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (
          boardState[r][c].value === 0 &&
          boardState[r][c].pencils.size === 0
        ) {
          emptyWithNoPencils++;
        }
      }
    }
  }
  const shouldSkipEval = !hasUsedAutoPencil && emptyWithNoPencils >= 4;
  const board = boardState.map((row) => row.map((cell) => cell.value));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cellState = boardState[r][c];
      if (cellState.value === 0) {
        cellState.pencils.clear();
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, r, c, num)) {
            cellState.pencils.add(num);
          }
        }
      }
    }
  }
  saveState();
  if (shouldSkipEval) {
    renderBoard();
  } else {
    onBoardUpdated(true);
  }
  showMessage("Auto-Pencil complete!", "green");
  hasUsedAutoPencil = true;
  isAutoPencilPending = false;
}

async function loadPuzzle(puzzleString, puzzleData = null) {
  if (autoPencilTipTimer) clearTimeout(autoPencilTipTimer);
  vagueHintMessage = "";
  isCustomPuzzle = puzzleData === null;
  if (puzzleString.length !== 81 || !/^[0-9\.]+$/.test(puzzleString)) {
    showMessage("Error: Invalid puzzle string.", "red");
    addSudokuCoachLink(null);
    return;
  }
  initialPuzzleString = puzzleString;
  initBoardState();
  const boardForValidation = Array(9)
    .fill(null)
    .map(() => Array(9).fill(0));
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const char = puzzleString[i];
    if (char !== "." && char !== "0") {
      const num = parseInt(char);
      boardState[row][col].value = num;
      boardState[row][col].isGiven = true;
      boardForValidation[row][col] = num;
    }
  }
  const initialBoardForSolution = boardForValidation.map((row) => [...row]);
  solveSudoku(initialBoardForSolution);
  solutionBoard = initialBoardForSolution;
  if (isCustomPuzzle) {
    const validity = checkPuzzleUniqueness(boardForValidation);
    if (!validity.isValid) {
      setTimeout(() => showMessage(validity.message, "red"), 750);
    }
  }
  selectedCell = { row: null, col: null };
  history = [];
  historyIndex = -1;
  hasUsedAutoPencil = false;
  isAutoPencilPending = false;
  isSolvePending = false;
  puzzleInfoContainer.classList.remove("hidden");
  puzzleTimerEl.classList.remove("hidden");
  if (puzzleData) {
    puzzleLevelEl.textContent = `Lv. ${puzzleData.level} (${
      difficultyWords[puzzleData.level]
    })`;
    puzzleScoreEl.textContent = `Score: ${puzzleData.score}`;
  } else {
    puzzleLevelEl.textContent = "";
    puzzleScoreEl.textContent = "";
    dateSelect.value = "custom";
  }
  renderBoard();
  await evaluateBoardDifficulty();
  saveState();
  addSudokuCoachLink(puzzleString);
  if (!puzzleData) showMessage("Custom puzzle loaded!", "green");
  startTimer();
  autoPencilTipTimer = setTimeout(() => {
    if (!hasUsedAutoPencil) {
      const isMobile = window.innerWidth <= 550;
      const tip = isMobile
        ? "Tip: Touch 'Auto-Pencil' below to fill in all possible candidates."
        : "Tip: Click&nbsp;'Auto-Pencil'&nbsp;<span class='shortcut-highlight'>(or press 'A')</span> to fill in all possible candidates.";
      showMessage(tip, "gray");
    }
  }, 5000);
}

function clearUserBoard() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!boardState[r][c].isGiven) {
        boardState[r][c].value = 0;
        boardState[r][c].pencils.clear();
      }
    }
  }
  vagueHintMessage = "";
  isAutoPencilPending = false;
  isSolvePending = false;
  saveState();
  onBoardUpdated(true);
  showMessage("Board cleared.", "gray");
}

function validateBoard() {
  const board = boardState.map((row) => row.map((cell) => cell.value));
  const cells = gridContainer.querySelectorAll(".sudoku-cell");
  let allValid = true;
  cells.forEach((cell) => cell.classList.remove("invalid"));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const num = board[r][c];
      if (num === 0 || boardState[r][c].isGiven) continue;
      board[r][c] = 0;
      if (!isValid(board, r, c, num)) {
        cells[r * 9 + c].classList.add("invalid");
        allValid = false;
      }
      board[r][c] = num;
    }
  }
  return allValid;
}

function solve() {
  if (!isSolvePending) {
    showMessage(
      "This will reveal the solution. Click again to solve.",
      "orange"
    );
    isSolvePending = true;
    return;
  }
  if (!initialPuzzleString) {
    showMessage("Error: No initial puzzle loaded.", "red");
    isSolvePending = false;
    return;
  }
  const startTime = performance.now();
  const initialBoard = Array(9)
    .fill(null)
    .map(() => Array(9).fill(0));
  for (let i = 0; i < 81; i++) {
    const char = initialPuzzleString[i];
    if (char !== "." && char !== "0") {
      initialBoard[Math.floor(i / 9)][i % 9] = parseInt(char);
    }
  }
  const validity = checkPuzzleUniqueness(initialBoard);
  if (!validity.isValid) {
    const duration = (performance.now() - startTime).toFixed(2);
    showMessage(`${validity.message} (${duration} ms)`, "red");
    return;
  }
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      boardState[r][c].value = solutionBoard[r][c];
      boardState[r][c].pencils.clear();
    }
  }
  const duration = (performance.now() - startTime).toFixed(2);
  saveState();
  onBoardUpdated();
  showMessage(`Puzzle Solved! (Unique; ${duration} ms)`, "green");
  triggerSolveAnimation();
  stopTimer();
}

function showMessage(text, color) {
  messageArea.innerHTML = "";
  messageArea.innerHTML = `<span>${text}</span>`;
  const colorClasses = [
    "text-red-600",
    "text-green-600",
    "text-gray-600",
    "text-orange-500",
  ];
  messageArea.classList.remove(...colorClasses);
  const colors = {
    red: "text-red-600",
    green: "text-green-600",
    gray: "text-gray-600",
    orange: "text-orange-500",
  };
  messageArea.classList.add(colors[color] || "text-gray-600");
}

function generateDiscordShareText() {
  const title = "[fsrs Daily Sudoku](https://fsrs.darksabun.club/sudoku.html)";
  const dateVal = dateSelect.value;
  let puzzleDateStr = new Date().toISOString().slice(0, 10);
  if (dateVal && /^\d{8}$/.test(dateVal)) {
    puzzleDateStr = `${dateVal.slice(0, 4)}-${dateVal.slice(
      4,
      6
    )}-${dateVal.slice(6, 8)}`;
  }
  const level = levelSelect.value;
  const levelWord = difficultyWords[level] || "Unknown";
  const levelStr = `Level ${level} (${levelWord})`;
  const timeStr = puzzleTimerEl.textContent;
  const header = `${title} | ${puzzleDateStr}\n${levelStr} | Time ${timeStr}\n`;
  const digitMap = {
    1: ":one:",
    2: ":two:",
    3: ":three:",
    4: ":four:",
    5: ":five:",
    6: ":six:",
    7: ":seven:",
    8: ":eight:",
    9: ":nine:",
  };
  const emptySquare = ":blue_square:";
  let gridStr = "";
  for (let r = 0; r < 9; r++) {
    if (r > 0 && r % 3 === 0) {
      gridStr += "\n";
    }
    for (let c = 0; c < 9; c++) {
      if (c > 0 && c % 3 === 0) {
        gridStr += " ";
      }
      const char = initialPuzzleString[r * 9 + c];
      gridStr += digitMap[char] || emptySquare;
    }
    gridStr += "\n";
  }
  return header + "\n" + gridStr.trim();
}

function startTimer() {
  stopTimer();
  startTime = Date.now();
  puzzleTimerEl.textContent = "00:00";
  timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

function updateTimer() {
  const elapsedMs = Date.now() - startTime;
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formattedSeconds = String(seconds).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  if (hours > 0) {
    const formattedHours = String(hours).padStart(2, "0");
    puzzleTimerEl.textContent = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  } else {
    puzzleTimerEl.textContent = `${formattedMinutes}:${formattedSeconds}`;
  }
}

function cloneBoardState(state) {
  return state.map((row) =>
    row.map((cell) => ({
      value: cell.value,
      isGiven: cell.isGiven,
      pencils: new Set(cell.pencils),
      cellColor: cell.cellColor,
      pencilColors: new Map(cell.pencilColors),
    }))
  );
}

function saveState() {
  history = history.slice(0, historyIndex + 1);
  history.push({
    boardState: cloneBoardState(boardState),
    lampColor: currentLampColor,
    vagueHint: vagueHintMessage,
  });
  historyIndex++;
  updateUndoRedoButtons();
}

function onBoardUpdated(forceEvaluation = false) {
  renderBoard();
  if (!forceEvaluation) {
    let emptyWithNoPencils = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (
          boardState[r][c].value === 0 &&
          boardState[r][c].pencils.size === 0
        ) {
          emptyWithNoPencils++;
        }
      }
    }
    if (emptyWithNoPencils >= 4) {
      return;
    }
  }
  if (lampEvaluationTimeout) clearTimeout(lampEvaluationTimeout);
  lampEvaluationTimeout = setTimeout(() => {
    evaluateBoardDifficulty();
  }, 100);
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    const historyEntry = history[historyIndex];
    boardState = cloneBoardState(historyEntry.boardState);
    vagueHintMessage = historyEntry.vagueHint;
    updateLamp(historyEntry.lampColor);
    renderBoard();
    updateUndoRedoButtons();
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    const historyEntry = history[historyIndex];
    boardState = cloneBoardState(historyEntry.boardState);
    vagueHintMessage = historyEntry.vagueHint;
    updateLamp(historyEntry.lampColor);
    renderBoard();
    updateUndoRedoButtons();
  }
}

function updateUndoRedoButtons() {
  undoBtn.disabled = historyIndex <= 0;
  redoBtn.disabled = historyIndex >= history.length - 1;
}

// --- Difficulty Evaluation Logic ---

async function evaluateBoardDifficulty() {
  await new Promise(requestAnimationFrame);
  vagueHintMessage = "";
  if (!initialPuzzleString || !solutionBoard) {
    updateLamp("gray");
    return;
  }
  const initialBoardForValidation = Array(9)
    .fill(null)
    .map(() => Array(9).fill(0));
  for (let i = 0; i < 81; i++) {
    const char = initialPuzzleString[i];
    if (char !== "." && char !== "0") {
      initialBoardForValidation[Math.floor(i / 9)][i % 9] = parseInt(char);
    }
  }
  if (!checkPuzzleUniqueness(initialBoardForValidation).isValid) {
    updateLamp("gray");
    return;
  }
  const currentBoardForEval = cloneBoardState(boardState);
  let emptyCount = 0;
  let emptyWithNoPencils = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (currentBoardForEval[r][c].value === 0) {
        emptyCount++;
        if (currentBoardForEval[r][c].pencils.size === 0) emptyWithNoPencils++;
      }
    }
  }
  let startingPencils;
  if (emptyCount <= 3 || emptyWithNoPencils >= 4) {
    startingPencils = calculateAllPencils(currentBoardForEval);
  } else {
    startingPencils = currentBoardForEval.map((row) =>
      row.map((cell) => new Set(cell.pencils))
    );
  }
  const virtualBoard = currentBoardForEval.map((row) =>
    row.map((cell) => cell.value)
  );
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (
        virtualBoard[r][c] !== 0 &&
        virtualBoard[r][c] !== solutionBoard[r][c]
      ) {
        updateLamp("black");
        vagueHintMessage = "";
        return;
      }
      if (
        virtualBoard[r][c] === 0 &&
        startingPencils[r][c].size > 0 &&
        !startingPencils[r][c].has(solutionBoard[r][c])
      ) {
        updateLamp("black");
        vagueHintMessage = "";
        return;
      }
    }
  }
  if (emptyCount <= 3) {
    updateLamp("white");
    vagueHintMessage = "Naked Single"; // Set the hint message here
    return;
  }
  // --- Detect invalid starting state (wrong progress) ---
  let initialHasEmptyNoCand = false;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      // if using virtual pencils as initial state
      if (virtualBoard[r][c] === 0 && startingPencils[r][c].size === 0) {
        initialHasEmptyNoCand = true;
        break;
      }
    }
    if (initialHasEmptyNoCand) break;
  }
  let maxDifficulty = 0;
  const techniqueOrder = [
    { name: "Naked Single", func: techniques.nakedSingle, level: 0 },
    { name: "Hidden Single", func: techniques.hiddenSingle, level: 0 },
    {
      name: "Locked Pair",
      func: (b, p) => techniques.lockedSubset(b, p, 2),
      level: 1,
    },
    {
      name: "Locked Triple",
      func: (b, p) => techniques.lockedSubset(b, p, 3),
      level: 1,
    },
    {
      name: "Intersection",
      func: (b, p) => techniques.intersection(b, p),
      level: 1,
    },
    {
      name: "Naked Pair",
      func: (b, p) => techniques.nakedSubset(b, p, 2),
      level: 1,
    },
    {
      name: "Hidden Pair",
      func: (b, p) => techniques.hiddenSubset(b, p, 2),
      level: 1,
    },
    {
      name: "Naked Triple",
      func: (b, p) => techniques.nakedSubset(b, p, 3),
      level: 1,
    },
    {
      name: "Hidden Triple",
      func: (b, p) => techniques.hiddenSubset(b, p, 3),
      level: 1,
    },
    {
      name: "Naked Quad",
      func: (b, p) => techniques.nakedSubset(b, p, 4),
      level: 2,
    },
    {
      name: "Hidden Quad",
      func: (b, p) => techniques.hiddenSubset(b, p, 4),
      level: 2,
    },
    {
      name: "Remote Pair",
      func: (b, p) => techniques.remotePair(b, p),
      level: 2,
    },
    { name: "X-Wing", func: (b, p) => techniques.fish(b, p, 2), level: 2 },
    { name: "XY-Wing", func: (b, p) => techniques.xyWing(b, p), level: 2 },
    { name: "BUG+1", func: (b, p) => techniques.bugPlusOne(b, p), level: 2 },
    {
      name: "Chute Remote Pair",
      func: (b, p) => techniques.chuteRemotePair(b, p),
      level: 2,
    },
    {
      name: "Unique Rectangle",
      func: (b, p) => techniques.uniqueRectangle(b, p),
      level: 2,
    },
    { name: "XYZ-Wing", func: (b, p) => techniques.xyzWing(b, p), level: 2 },
    { name: "W-Wing", func: (b, p) => techniques.wWing(b, p), level: 2 },
    { name: "Swordfish", func: (b, p) => techniques.fish(b, p, 3), level: 2 },
    { name: "Jellyfish", func: (b, p) => techniques.fish(b, p, 4), level: 2 },
    { name: "Unique Hexagon", func: techniques.uniqueHexagon, level: 2 },
    {
      name: "Extended Rectangle",
      func: techniques.extendedRectangle,
      level: 2,
    },
    { name: "Grouped W-Wing", func: techniques.groupedWWing, level: 2 },
    { name: "Skyscraper", func: techniques.skyscraper, level: 2 },
    { name: "2-String Kite", func: techniques.twoStringKite, level: 2 },
    { name: "Turbot Fish", func: techniques.turbotFish, level: 2 },
    { name: "Hidden Rectangle", func: techniques.hiddenRectangle, level: 2 },
    {
      name: "Rectangle Elimination",
      func: techniques.rectangleElimination,
      level: 2,
    },
    { name: "Finned X-Wing", func: techniques.finnedXWing, level: 2 },
    { name: "Finned Swordfish", func: techniques.finnedSwordfish, level: 3 },
    { name: "Finned Jellyfish", func: techniques.finnedJellyfish, level: 3 },
    { name: "Simple Coloring", func: techniques.simpleColoring, level: 3 },
    { name: "X-Chain", func: techniques.xChain, level: 3 },
    { name: "XY-Chain", func: techniques.xyChain, level: 3 },
    { name: "Firework", func: techniques.firework, level: 3 },
    { name: "WXYZ-Wing", func: techniques.wxyzWing, level: 3 },
    { name: "Sue de Coq", func: techniques.sueDeCoq, level: 3 },
  ];
  if (IS_DEBUG_MODE) {
    console.clear();
    console.log("--- Starting New Difficulty Evaluation ---");
    console.log("Initial Board State (0 = empty):");
    console.table(virtualBoard);
  }
  let progressMade = true;
  while (progressMade) {
    progressMade = false;
    for (const tech of techniqueOrder) {
      const result = tech.func(virtualBoard, startingPencils);
      if (result.change) {
        if (IS_DEBUG_MODE) {
          console.groupCollapsed(`Found: ${tech.name} (Lamp ${tech.level})`);
          if (result.type === "place") {
            console.log(
              `Action: Place ${result.num} at (${result.r}, ${result.c})`
            );
          } else if (result.type === "remove") {
            console.log(`Action: Remove candidates:`);
            result.cells.forEach(({ r, c, num }) => {
              console.log(`  - Remove ${num} from (${r}, ${c})`);
            });
          }
        }
        if (!vagueHintMessage) {
          vagueHintMessage = tech.name;
        }
        maxDifficulty = Math.max(maxDifficulty, tech.level);
        if (result.type === "place") {
          virtualBoard[result.r][result.c] = result.num;
          startingPencils[result.r][result.c].clear();
          for (let i = 0; i < 9; i++) {
            startingPencils[result.r][i].delete(result.num);
            startingPencils[i][result.c].delete(result.num);
          }
          const boxR = Math.floor(result.r / 3) * 3,
            boxC = Math.floor(result.c / 3) * 3;
          for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++)
              startingPencils[boxR + i][boxC + j].delete(result.num);
        } else if (result.type === "remove") {
          result.cells.forEach(({ r, c, num }) =>
            startingPencils[r][c].delete(num)
          );
        }
        if (IS_DEBUG_MODE) {
          if (LOG_CANDIDATE_GRID) {
            logBoardState(virtualBoard, startingPencils);
          }
          console.groupEnd();
        }
        progressMade = true;
        break;
      }
    }
  }
  const isSolved = virtualBoard.flat().every((v) => v !== 0);

  if (isSolved) {
    if (maxDifficulty === 0) updateLamp("white");
    else if (maxDifficulty === 1) updateLamp("green");
    else if (maxDifficulty === 2) updateLamp("yellow");
    else if (maxDifficulty === 3) updateLamp("orange");
  } else if (initialHasEmptyNoCand) {
    // Wrong progress made before evaluation started
    updateLamp("black");
    vagueHintMessage = "";
  } else {
    // === Final bug detection ===
    let foundBug = false;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (virtualBoard[r][c] === 0 && startingPencils[r][c].size === 0) {
          foundBug = true;
          break;
        }
      }
      if (foundBug) break;
    }

    if (foundBug) {
      updateLamp("bug");
      vagueHintMessage = "";
    } else {
      updateLamp("red");
    }
  }
}
