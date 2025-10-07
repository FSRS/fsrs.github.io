document.addEventListener("DOMContentLoaded", () => {
  // --- START: ADDED DEBUG FLAG ---
  // Set this to 'true' to see detailed solver logs in the console.
  // Set this to 'false' for release to hide them.
  const IS_DEBUG_MODE = false;
  // --- END: ADDED DEBUG FLAG ---

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
  const exptModeBtn = document.getElementById("expt-mode-btn"); // Get the new button
  const dateSelect = document.getElementById("date-select");
  const levelSelect = document.getElementById("level-select");
  const puzzleInfoContainer = document.getElementById("puzzle-info");
  const puzzleLevelEl = document.getElementById("puzzle-level");
  const puzzleScoreEl = document.getElementById("puzzle-score");
  const puzzleTimerEl = document.getElementById("puzzle-timer");
  const modeToggleButton = document.getElementById("mode-toggle-btn");
  const colorButton = modeSelector.querySelector('[data-mode="color"]');
  const difficultyLamp = document.getElementById("difficulty-lamp");
  let isExperimentalMode = false;

  const difficultyWords = [
    "ROOKIE",
    "LAYMAN",
    "AMATEUR",
    "TECHNICIAN",
    "WIZARD",
    "EXPERT",
    "MASTER",
    "NEMESIS",
    "DOMINATOR",
    "VANQUISHER",
  ];

  const colorPaletteLight = [
    "#f87171",
    "#fb923c",
    "#facc15",
    "#a3e635",
    "#34d399",
    "#22d3ee",
    "#60a5fa",
    "#c084fc",
    "#f472b6",
  ];

  const colorPaletteMid = [
    "#dc2626", // red-600
    "#ea580c", // orange-600
    "#ca8a04", // yellow-600
    "#65a30d", // lime-600
    "#16a34a", // green-600
    "#0891b2", // cyan-600
    "#2563eb", // blue-600
    "#7c3aed", // violet-600
    "#db2777", // pink-600
  ];

  // darker palette for dark-mode (deeper/jewel tones)
  const colorPaletteDark = [
    "#991b1b", // red-800
    "#9a3412", // orange-800
    "#92400e", // amber-800
    "#3f6212", // lime-800
    "#065f46", // emerald-800
    "#155e75", // cyan-800
    "#1e3a8a", // blue-900
    "#5b21b6", // violet-800
    "#9d174d", // pink-800
  ];

  // live palette variables used by updateControls()
  let cellColorPalette;
  let candidateColorPalette;

  function updateColorPalettes(isDarkMode) {
    if (isDarkMode) {
      cellColorPalette = colorPaletteDark;
      candidateColorPalette = colorPaletteLight;
    } else {
      cellColorPalette = colorPaletteLight;
      candidateColorPalette = colorPaletteMid;
    }
  }

  // Initialize palettes based on the initial system preference
  updateColorPalettes(
    window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // react to changes in system preference (updates UI instantly)
  const colorSchemeMQ = window.matchMedia("(prefers-color-scheme: dark)");
  colorSchemeMQ.addEventListener?.("change", (e) => {
    updateColorPalettes(e.matches);
    updateControls(); // rebuild the number/color pad
    onBoardUpdated();
  });

  const levelTips = [
    "Lv. 0: Singles",
    "Lv. 1: Locked Pair, Locked Triple",
    "Lv. 2: Intersections, Pairs, Triples",
    "Lv. 3: Quads, X-Wing, XY-Wing, Remote Pair",
    "Lv. 4: Unique Rectangles, BUG+1, XYZ-Wing, W-Wing, Swordfish, Jellyfish",
    "Lv. 5: Hidden Rectangles, BUG Lite (6 cells), (Grouped) Turbot-Fishes",
    "Lv. 6: Finned Fishes, X-Chain, Firework, WXYZ-Wing, Sue de Coq",
    "Lv. 7: Grouped X-Chain, 3D Medusa, Alternating Inference Chain",
    "Lv. 8: Grouped AIC, Pair Subset Exclusion, ALS-XZ",
    "Lv. 9: Triple Sub. Excl., ALS-XY/W-Wing, Finned Franken/Mutant Swordfish",
  ];

  let boardState = [];
  let allPuzzles = [];
  let selectedCell = { row: null, col: null };
  let currentMode = "concrete";
  let coloringSubMode = "cell";
  let candidatePopupFormat = "A"; // 'A' for numpad, 'B' for phone pad
  let selectedColor = null;
  let highlightedDigit = null;
  let highlightState = 0; // 0: off, 1: digit, 2: bi-value
  let history = [];
  let historyIndex = -1;
  let timerInterval = null;
  let startTime = 0;
  let initialPuzzleString = "";
  let solutionBoard = null;
  let isCustomPuzzle = false;
  let hasUsedAutoPencil = false;
  let isAutoPencilPending = false;
  let isSolvePending = false;
  let autoPencilTipTimer = null;
  let lampWorker = null;
  let lampEvaluationTimeout = null;

  function updateButtonLabels() {
    const isMobile = window.innerWidth <= 550; // Breakpoint for mobile view
    const titleText = document.getElementById("sudoku-title-text");

    if (titleText) {
      if (isMobile) {
        // The HTML string no longer contains the style attribute
        titleText.innerHTML = ` <a href="https://darksabun.club/" class="hover:underline">D.S.</a>`;
      } else {
        titleText.textContent = " Daily Sudoku";
      }
    }

    // 1. Update Number/Pencil Button
    if (currentMode === "pencil") {
      modeToggleButton.textContent = isMobile ? "Pen." : "Pencil";
    } else {
      modeToggleButton.textContent = isMobile ? "Num." : "Number (Z)";
    }

    // 2. Update Color Button
    if (currentMode === "color") {
      if (coloringSubMode === "cell") {
        colorButton.textContent = isMobile ? "Color: Cell" : "Color: Cell";
      } else {
        colorButton.textContent = isMobile
          ? "Color: Cand."
          : "Color: Candidate";
      }
    } else {
      colorButton.textContent = isMobile ? "Color" : "Color (X)";
    }

    // 3. Unify Display/Expt button for all platforms
    formatToggleBtn.style.display = "none"; // Always hide the A/B button
    exptModeBtn.style.display = "inline-flex"; // Always show the Expt button
    const exptShortcut = isMobile ? "" : " (E)";
    exptModeBtn.textContent =
      (isExperimentalMode ? "Expt. ON" : "Expt. OFF") + exptShortcut;
    // Highlight if ON
    if (isExperimentalMode) {
      exptModeBtn.classList.add("active-green");
    } else {
      exptModeBtn.classList.remove("active-green");
    }
  }

  function addSudokuCoachLink(puzzleString) {
    const container = document.getElementById("solver-link-container");
    if (!container) return;

    // Clear any previous link
    container.innerHTML = "";
    if (!puzzleString) return; // Don't add a link if the puzzle string is empty

    // Convert '.' to '0' for the URL
    const puzzleForLink = puzzleString.replace(/\./g, "0");
    const solverUrl = `https://sudoku.coach/en/solver/${puzzleForLink}`;

    // Create the link element
    const link = document.createElement("a");
    link.href = solverUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    // Check screen width and set text accordingly
    const isMobile = window.innerWidth <= 550;
    link.textContent = isMobile
      ? "Export to SC Solver"
      : "Export to Sudoku Coach Solver (Ctrl+E)";

    // Apply the new button styling
    link.className =
      "w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600";

    container.appendChild(link);
  }

  async function initialize() {
    createGrid();
    updateControls();
    initBoardState();
    setupEventListeners();
    updateButtonLabels();

    try {
      const response = await fetch("sudoku.json");
      if (!response.ok) throw new Error("Failed to load sudoku.json");
      allPuzzles = await response.json();
      await populateSelectors();
      findAndLoadSelectedPuzzle();
    } catch (error) {
      console.error("Error loading puzzles:", error);
    }
  }

  async function populateSelectors() {
    // Populate Level selector (0-9)
    levelSelect.innerHTML = "";
    for (let i = 0; i < 10; i++) {
      const option = document.createElement("option");
      option.value = i;
      // Format the text to include both number and word
      option.textContent = `${i} (${difficultyWords[i]})`;
      levelSelect.appendChild(option);
    }

    // Populate Date selector (last 7 days including today, but not before 20250912)
    dateSelect.innerHTML = "";
    const today = new Date();

    const minDateNum = 20250912;

    const recentDates = [];

    for (let i = 0; i < 7; i++) {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000; // get UTC time in msec
      const kstOffset = 9 * 60 * 60 * 1000; // KST is UTC+9
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

    // Ensure descending order
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

        // 1. Label text (1–9)
        btn.textContent = i + 1;

        // 2. Compute adaptive label color
        const isDarkMode =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        const labelColor =
          coloringSubMode === "candidate"
            ? isDarkMode
              ? "#1f2937"
              : "#e5e7eb" // gray-800 / gray-200
            : "rgba(255,255,255,0.6)"; // softer for cell mode

        btn.className =
          "color-btn p-2 text-lg font-bold border rounded-md shadow-sm h-12";
        btn.style.color = labelColor;

        // 3. Add hover brightness effect
        btn.addEventListener("mouseenter", () => {
          const base = activePalette[i];
          // brighten in dark mode, darken in light mode
          btn.style.filter = isDarkMode
            ? "brightness(1.25)"
            : "brightness(0.9)";
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
          // Revert to original color (either a set color or default)
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
      } else if (state.pencils.size > 0) {
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

            // Enable direct coloring for PC, or for Mobile when Experimental Mode is ON
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
                // Revert to original color (either a set color or default)
                mark.style.color = state.pencilColors.get(i) || "";
              });

              mark.addEventListener("click", (e) => {
                // Handle coloring in color mode
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
                  onBoardUpdated();
                }
                // In Pencil mode + Expt ON, click a candidate to REMOVE it
                else if (isExperimentalMode && currentMode === "pencil") {
                  e.stopPropagation();
                  const cellState = boardState[row][col];
                  if (cellState.pencils.has(i)) {
                    cellState.pencils.delete(i);
                    saveState();
                    onBoardUpdated();
                  }
                }
                // In Number mode + Expt ON, click a candidate to SET it as the value
                else if (isExperimentalMode && currentMode === "concrete") {
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

      // Apply highlight if a digit is selected for highlighting
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

  // --- START: NEW DEBUG HELPER FUNCTION ---
  function logBoardState(board, pencils) {
    let output = "\n";
    const topBorder =
      ".----------------------.---------------------.-------------------.\n";
    const midBorder =
      ":----------------------+---------------------+-------------------:\n";
    const botBorder =
      "'----------------------'---------------------'-------------------'\n";

    output += topBorder;

    for (let r = 0; r < 9; r++) {
      let rowStr = "|";
      for (let c = 0; c < 9; c++) {
        let cellContent = "";
        if (board[r][c] !== 0) {
          // It's a solved cell
          cellContent = `  ${board[r][c]}  `;
        } else {
          // It's an unsolved cell with candidates
          cellContent = [...pencils[r][c]].sort().join("");
        }
        // Pad the string to 5 characters and add a space
        rowStr += ` ${cellContent.padEnd(5, " ")}`;
        if (c === 2 || c === 5) {
          rowStr += "|";
        }
      }
      rowStr += " |\n";
      output += rowStr;

      if (r === 2 || r === 5) {
        output += midBorder;
      }
    }
    output += botBorder;
    console.log(output);
  }
  // --- END: NEW DEBUG HELPER FUNCTION ---

  function isValidDate(yyyymmdd) {
    if (!/^\d{8}$/.test(yyyymmdd)) return false;

    const year = parseInt(yyyymmdd.slice(0, 4), 10);
    const month = parseInt(yyyymmdd.slice(4, 6), 10);
    const day = parseInt(yyyymmdd.slice(6, 8), 10);

    // Month 1–12, Day 1–31
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    // Construct real JS Date
    const d = new Date(year, month - 1, day);
    return (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    );
  }

  // --- Difficulty Lamp Functions ---
  function updateLamp(color) {
    if (!difficultyLamp) return;
    const colors = ["white", "green", "yellow", "orange", "red", "gray"];
    difficultyLamp.classList.remove(...colors.map((c) => `lamp-${c}`));
    difficultyLamp.classList.add(`lamp-${color}`);

    const tooltips = {
      white: "Easy: Solvable with singles.",
      green: "Medium: Requires pairs, triples, or intersections.",
      yellow: "Hard: Requires advanced techniques like X-Wing.",
      orange: "Unfair: Requires techniques beyond this solver's scope.",
      red: "Error: Current state conflicts with the solution.",
      gray: "Invalid: This puzzle does not have a unique solution.",
    };
    difficultyLamp.title = tooltips[color] || "Difficulty Indicator";
  }

  function setupEventListeners() {
    gridContainer.addEventListener("click", handleCellClick);
    modeSelector.addEventListener("click", handleModeChange);
    numberPad.addEventListener("click", handleNumberPadClick);
    loadBtn.addEventListener("click", () =>
      loadPuzzle(puzzleStringInput.value)
    );
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
      e.stopPropagation(); // Stop the event from bubbling up to the parent

      candidatePopupFormat = candidatePopupFormat === "A" ? "B" : "A";
      updateButtonLabels();
      onBoardUpdated(); // Re-render the main board to update pencil marks

      // Add the concise tip message
      const tip = `Candidate display set to ${
        candidatePopupFormat === "A" ? "Numpad (A)" : "Phone (B)"
      } layout.`;
      showMessage(tip, "gray");

      // If the popup is open, re-render it too
      if (
        !candidateModal.classList.contains("hidden") &&
        selectedCell.row !== null
      ) {
        showCandidatePopup(selectedCell.row, selectedCell.col);
      }
    });
    dateSelect.addEventListener("change", () => {
      if (dateSelect.value === "custom") {
        // open popup, do nothing to board yet
        dateModal.classList.remove("hidden");
        dateModal.classList.add("flex");
        dateInput.value = "";
        dateError.textContent = "";
        dateInput.focus();
      } else {
        // only renew when a real date is chosen
        findAndLoadSelectedPuzzle();
      }
    });
    levelSelect.addEventListener("change", findAndLoadSelectedPuzzle);
    document.addEventListener("keydown", handleKeyPress);
    // Hover effects for mode buttons
    modeToggleButton.addEventListener("mouseenter", () => {
      const isMobile = window.innerWidth <= 550;
      if (currentMode === "concrete") {
        modeToggleButton.textContent = isMobile ? "Pen.?" : "Pencil?";
      } else if (currentMode === "pencil") {
        modeToggleButton.textContent = isMobile ? "Num.?" : "Number?";
      }
    });

    // This is now simpler and respects the responsive labels
    modeToggleButton.addEventListener("mouseleave", () => {
      updateButtonLabels();
    });

    colorButton.addEventListener("mouseenter", () => {
      const isMobile = window.innerWidth <= 550;
      if (currentMode === "color") {
        if (coloringSubMode === "cell") {
          colorButton.textContent = isMobile
            ? "Color: Cand.?"
            : "Color: Candidate?";
        } else {
          colorButton.textContent = isMobile ? "Color: Cell?" : "Color: Cell?";
        }
      }
    });

    // This is now simpler and respects the responsive labels
    colorButton.addEventListener("mouseleave", () => {
      updateButtonLabels();
    });
    // Date modal elements
    const dateModal = document.getElementById("date-modal");
    const dateInput = document.getElementById("date-input");
    const dateError = document.getElementById("date-error");
    const dateSubmitBtn = document.getElementById("date-submit-btn");
    const dateCancelBtn = document.getElementById("date-cancel-btn");

    // Keydown events for popup
    dateInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dateModal.classList.add("hidden");
        dateModal.classList.remove("flex");
        dateSelect.value = dateSelect.querySelector("option").value; // reset selection
      }
      if (e.key === "Enter") {
        e.preventDefault();
        dateSubmitBtn.click(); // trigger submit
      }
      if (e.key === "Backspace") {
        const pos = dateInput.selectionStart;
        if (pos && (pos === 5 || pos === 8)) {
          // skip over the dash
          dateInput.setSelectionRange(pos - 1, pos - 1);
        }
      }
    });

    dateInput.addEventListener("input", () => {
      // keep only digits
      let val = dateInput.value.replace(/\D/g, "");
      if (val.length > 8) val = val.slice(0, 8);

      // build YYYY-MM-DD
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
      const rawValue = dateInput.value.replace(/\D/g, ""); // Remove non-digits

      if (!isValidDate(rawValue)) {
        dateError.textContent =
          "Please enter a valid calendar date (YYYY-MM-DD).";
        return;
      }

      const dateNum = parseInt(rawValue, 10);
      // Calculate current date in KST (UTC+9)
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000; // get UTC time in msec
      const kstOffset = 9 * 60 * 60 * 1000; // KST is UTC+9
      const today = new Date(utc + kstOffset);

      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayNum = parseInt(`${yyyy}${mm}${dd}`);
      const todayStr = `${yyyy}-${mm}-${dd}`;

      // Validate date range
      if (dateNum < 20250912 || dateNum > todayNum) {
        dateError.textContent = `Date must be between 2025-09-12 and ${todayStr}.`;
        return;
      }

      // Add new option if it doesn't exist
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

      // Close modal and trigger puzzle load
      dateModal.classList.add("hidden");
      dateModal.classList.remove("flex");
      findAndLoadSelectedPuzzle();
    });

    dateCancelBtn.addEventListener("click", () => {
      dateModal.classList.add("hidden");
      dateModal.classList.remove("flex");
      dateSelect.value = dateSelect.querySelector("option").value; // reset to first valid option
    });

    // Add listener for the experimental mode button
    exptModeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      isExperimentalMode = !isExperimentalMode;
      updateButtonLabels();

      // The lamp is now always visible, so no need to toggle it.
      // We can still trigger an immediate evaluation when the mode is turned on.
      if (isExperimentalMode) {
        evaluateBoardDifficulty();
      }

      // Generate platform-specific tip messages
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

    // --- New Undo/Redo Handling ---
    // Handle these combinations first and stop further execution.
    if (isCtrlOrCmd && key_lower === "z") {
      e.preventDefault();
      undo();
      return; // Exit the function to prevent collision
    }
    if (isCtrlOrCmd && key_lower === "y") {
      e.preventDefault();
      redo();
      return; // Exit the function
    }
    if (isCtrlOrCmd && key_lower === "e") {
      e.preventDefault(); // Prevent browser default for Ctrl+E
      // Find the solver button (which is an <a> tag) inside its container
      const solverButton = document.querySelector("#solver-link-container a");

      // If the button exists, click it
      if (solverButton) {
        solverButton.click();
      }
      return;
    }
    // --- End of New Logic ---

    // Do not trigger shortcuts if typing in an input field
    if (document.activeElement.tagName === "INPUT") {
      return;
    }

    // Close modal with Escape key
    if (key === "Escape" && !candidateModal.classList.contains("hidden")) {
      candidateModal.classList.add("hidden");
      return;
    }

    // Priority 1: Candidate Modal is open
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
      return; // Stop further processing if modal is open
    }

    // Handle Arrow Keys for navigation
    if (key.startsWith("Arrow")) {
      e.preventDefault(); // Prevent page scrolling
      let { row, col } = selectedCell;

      if (row === null || col === null) {
        // If no cell is selected, start at the top-left
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

    if (key === "Shift") {
      highlightedDigit = null;
      highlightState = 0;
      onBoardUpdated();
      return;
    }

    // Handle Delete/Backspace to clear cell
    if (key === "Delete" || key === "Backspace") {
      e.preventDefault(); // Prevent browser back navigation on backspace
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

    // Handle Mode Toggle Keys
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
          // candidate mode
          showCandidatePopup(selectedCell.row, selectedCell.col);
        }
        onBoardUpdated();
      }
      return;
    }

    if (key_lower === "d") {
      formatToggleBtn.click();
      return;
    }

    // Handle Action Keys
    if (key_lower === "a") {
      autoPencilBtn.click();
      return;
    }
    if (key_lower === "s") {
      solveBtn.click();
      return;
    }
    if (key_lower === "e" && !isCtrlOrCmd) {
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

    // Priority 2: Not modal, handle number keys based on current mode
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

    if (currentMode === "color") {
      if (coloringSubMode === "cell") {
        const oldColor = cellState.cellColor;
        const newColor = oldColor === selectedColor ? null : selectedColor;
        if (oldColor !== newColor) {
          cellState.cellColor = newColor;
          saveState();
        }
      } else {
        // candidate mode
        if (isMobile && !isExperimentalMode) {
          showCandidatePopup(selectedCell.row, selectedCell.col);
        }
        // On desktop, this is handled by direct clicks on pencil marks
      }
    } else {
      // --- Revised Highlight Logic ---
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
    }
    onBoardUpdated();
    return;
  }

  function handleModeChange(e) {
    const clickedButton = e.target.closest("button");
    if (!clickedButton) return;

    const previousMode = currentMode;

    // --- State Update Logic ---
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
        coloringSubMode = "cell"; // Always start with 'cell' when entering color mode
      } else {
        // If already in color mode, just toggle the sub-mode
        coloringSubMode = coloringSubMode === "cell" ? "candidate" : "cell";
      }
    }

    // --- Tip Display Logic ---
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
        // candidate sub-mode
        tip = isMobile
          ? "Tip: Pick a color, then touch a cell to select a candidate."
          : "Tip: Pick a color, hover over a candidate to preview, and click to apply.";
      }
    }

    showMessage(tip, "gray"); // <-- ALSO UNCOMMENT THIS LINE

    // Update active classes for all buttons
    modeToggleButton.classList.remove("active", "active-green");
    colorButton.classList.remove("active", "active-green");

    if (currentMode === "concrete") {
      modeToggleButton.classList.add("active"); // Blue
    } else if (currentMode === "pencil") {
      modeToggleButton.classList.add("active-green"); // Green
    } else if (currentMode === "color") {
      if (coloringSubMode === "candidate") {
        colorButton.classList.add("active-green"); // Green for Color: Cand
      } else {
        // cell mode
        colorButton.classList.add("active"); // Blue for Color: Cell
      }
    }

    // Update the number/color pad if the mode type changed
    const wasColor = previousMode === "color";
    const isColor = currentMode === "color";
    if (isColor || wasColor) {
      updateControls(); // Always rebuild the pad if the mode involves color

      if (isColor) {
        // If we are in ANY color mode (just entered or toggled sub-mode),
        // reset the selection to the first color of the new palette.
        const firstColorButton = numberPad.querySelector(".color-btn");
        if (firstColorButton) {
          selectedColor = firstColorButton.dataset.color;
          firstColorButton.classList.add("selected");
        }
      } else {
        // Otherwise, we must have just LEFT color mode
        selectedColor = null;
      }
    }
    onBoardUpdated();
    updateButtonLabels(); // <-- FIX: Update labels immediately after mode change
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
        // pencil mode
        if (cellState.value === 0) {
          if (cellState.pencils.has(num)) {
            cellState.pencils.delete(num);
          } else {
            cellState.pencils.add(num);
          }
          changeMade = true;
        }
      }

      // If a change was made, save it and check for puzzle completion.
      if (changeMade) {
        saveState();
        checkCompletion();
      }

      // ALWAYS re-render the board after any interaction.
      onBoardUpdated();
    }
  }

  function checkCompletion() {
    // Check if any cell is empty
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (boardState[r][c].value === 0) {
          return; // Not finished yet
        }
      }
    }

    // If no cells are empty, validate the board
    if (validateBoard()) {
      if (!isCustomPuzzle) {
        // --- Share Logic for Daily Puzzles ---
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
              // Manually build the success message with a "Copy Again" button
              messageArea.innerHTML = ""; // Clear "Congratulations..." text

              // Set the success text color on the container
              const colorClasses = [
                "text-red-600",
                "text-green-600",
                "text-gray-600",
                "text-orange-500", // Add orange
              ];
              messageArea.classList.remove(...colorClasses);
              messageArea.classList.add("text-green-600");

              // Create and append the success message
              const successText = document.createTextNode(
                "Copied Discord sharable text!"
              );
              messageArea.appendChild(successText);

              // Create, style, and append the "Copy Again" button
              const copyAgainButton = document.createElement("button");
              copyAgainButton.textContent = "Copy Again";
              // Reuse the same style as the "Share" button for consistency
              copyAgainButton.className =
                "px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors";

              // Make the "Copy Again" button trigger the same copy action
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
        // --- Default message for Custom Puzzles ---
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
    }, 2620); // Duration is roughly (80 * 20ms) + 1000ms
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

  function autoEliminatePencils(row, col, num) {
    // Eliminate from the same row
    for (let c = 0; c < 9; c++) {
      boardState[row][c].pencils.delete(num);
    }

    // Eliminate from the same column
    for (let r = 0; r < 9; r++) {
      boardState[r][col].pencils.delete(num);
    }

    // Eliminate from the same 3x3 box
    const boxRowStart = Math.floor(row / 3) * 3;
    const boxColStart = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        boardState[boxRowStart + r][boxColStart + c].pencils.delete(num);
      }
    }
  }

  function clearAllColors() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        boardState[r][c].cellColor = null;
        boardState[r][c].pencilColors.clear();
      }
    }
    saveState();
    onBoardUpdated();
    showMessage("All colors cleared.", "gray");
  }

  function calculateAllPencils(board) {
    const newPencils = Array(9)
      .fill(null)
      .map(() =>
        Array(9)
          .fill(null)
          .map(() => new Set())
      );
    const boardValues = board.map((row) => row.map((cell) => cell.value));
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (boardValues[r][c] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(boardValues, r, c, num)) {
              newPencils[r][c].add(num);
            }
          }
        }
      }
    }
    return newPencils;
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
    onBoardUpdated();
    showMessage("Auto-Pencil complete!", "green");
    hasUsedAutoPencil = true;
    isAutoPencilPending = false;
  }

  /**
   * Checks if a puzzle board has a unique solution and returns the result.
   * @param {number[][]} board - The initial puzzle board.
   * @returns {{isValid: boolean, message: string}} An object with the validation result.
   */
  function checkPuzzleUniqueness(board) {
    // Pre-check 1: Clue count
    const clueCount = board.flat().filter((v) => v !== 0).length;
    if (clueCount < 17) {
      return {
        isValid: false,
        message:
          "Error: Puzzle has fewer than 17 clues; solution is not unique.",
      };
    }

    // Pre-check 2: Missing numbers
    const presentNumbers = new Set(board.flat().filter((v) => v !== 0));
    if (presentNumbers.size < 8) {
      return {
        isValid: false,
        message:
          "Error: More than one number is missing; solution is not unique.",
      };
    }
    // Pre-Check 3
    // Check for two empty rows in any horizontal band
    for (let bandStartRow = 0; bandStartRow < 9; bandStartRow += 3) {
      let emptyRowCount = 0;
      for (let r_offset = 0; r_offset < 3; r_offset++) {
        const r = bandStartRow + r_offset;
        if (board[r].every((cell) => cell === 0)) {
          emptyRowCount++;
        }
      }
      if (emptyRowCount >= 2) {
        return {
          isValid: false,
          message: "Error: Two empty rows in a band; solution is not unique.",
        };
      }
    }

    // Check for two empty columns in any vertical band
    for (let bandStartCol = 0; bandStartCol < 9; bandStartCol += 3) {
      let emptyColCount = 0;
      for (let c_offset = 0; c_offset < 3; c_offset++) {
        const c = bandStartCol + c_offset;
        let isColEmpty = true;
        for (let r = 0; r < 9; r++) {
          if (board[r][c] !== 0) {
            isColEmpty = false;
            break;
          }
        }
        if (isColEmpty) {
          emptyColCount++;
        }
      }
      if (emptyColCount >= 2) {
        return {
          isValid: false,
          message:
            "Error: Two empty columns in a band; solution is not unique.",
        };
      }
    }

    function isBoardValid(b) {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (b[r][c] !== 0) {
            const num = b[r][c];
            b[r][c] = 0;
            const valid = isValid(b, r, c, num);
            b[r][c] = num;
            if (!valid) return false;
          }
        }
      }
      return true;
    }
    // Pre-check 3: Initial conflicts (on a copy to be safe)
    if (!isBoardValid(board.map((row) => [...row]))) {
      return {
        isValid: false,
        message: "Error: The initial puzzle state has conflicts.",
      };
    }

    const boardCopy = board.map((row) => [...row]);
    while (findAndPlaceOneHiddenSingle(boardCopy)) {
      // This loop simplifies the board before counting.
    }

    // Final Check: Count solutions (on a copy to be safe)
    const solutionCount = countSolutions(boardCopy);

    if (solutionCount === 0) {
      return {
        isValid: false,
        message: "Error: This puzzle has no solution.",
      };
    }
    if (solutionCount > 1) {
      return {
        isValid: false,
        message: "Error: This puzzle has more than one solution.",
      };
    }

    return { isValid: true, message: "Puzzle has a unique solution." };
  }

  function loadPuzzle(puzzleString, puzzleData = null) {
    if (autoPencilTipTimer) clearTimeout(autoPencilTipTimer);
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
    puzzleInfoContainer.classList.toggle("hidden", !puzzleData);

    if (puzzleData) {
      puzzleLevelEl.textContent = `Lv. ${puzzleData.level} (${
        difficultyWords[puzzleData.level]
      })`;
      puzzleScoreEl.textContent = `Score: ${puzzleData.score}`;
    } else {
      puzzleLevelEl.textContent = "";
      puzzleScoreEl.textContent = "";
    }

    saveState(); // This will trigger the first lamp evaluation
    onBoardUpdated();
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
    isAutoPencilPending = false; // Reset pending state
    isSolvePending = false;
    saveState();
    onBoardUpdated();
    showMessage("Board cleared.", "gray");
    // startTimer();
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

        board[r][c] = 0; // Temporarily remove to check
        if (!isValid(board, r, c, num)) {
          cells[r * 9 + c].classList.add("invalid");
          allValid = false;
        }
        board[r][c] = num; // Restore
      }
    }
    return allValid;
  }

  /**
   * Counts the number of solutions for a given board up to a specified limit.
   * @param {number[][]} board - The Sudoku board to solve.
   * @param {number} limit - The maximum number of solutions to find before stopping.
   * @returns {number} The number of solutions found (up to the limit).
   */
  function countSolutions(board, limit = 2) {
    let count = 0;

    function search() {
      // The hidden single loop has been removed from here.

      const find = findEmpty(board);
      if (!find) {
        count++;
        return count >= limit; // Stop if we've reached the limit
      }

      const [row, col] = find;
      for (let num = 1; num <= 9; num++) {
        if (isValid(board, row, col, num)) {
          board[row][col] = num;
          if (search()) {
            return true; // Propagate the stop signal
          }
        }
      }
      board[row][col] = 0; // Backtrack
      return false;
    }

    search();
    return count;
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

    // Use the pre-calculated solution
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

  function findEmpty(board) {
    let bestCell = null;
    let minRemainingValues = 10; // Start with a value higher than the max possible (9)

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          // This cell is empty, so count its legal moves
          let remainingValues = 0;
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, r, c, num)) {
              remainingValues++;
            }
          }

          // If this cell is more constrained than the best one we've found so far
          if (remainingValues < minRemainingValues) {
            minRemainingValues = remainingValues;
            bestCell = [r, c];
          }

          // Optimization: If a cell has only 0 or 1 possible value, it's the best we can do.
          if (minRemainingValues <= 1) {
            return bestCell;
          }
        }
      }
    }
    return bestCell; // This will be null if the board is full
  }

  /**
   * Finds and places the first available "Hidden Single" on the board.
   * This version is more robust and scans houses systematically.
   * @param {number[][]} board - The Sudoku board.
   * @returns {boolean} - True if a hidden single was found and placed, otherwise false.
   */
  function findAndPlaceOneHiddenSingle(board) {
    // --- Scan by ROW ---
    for (let r = 0; r < 9; r++) {
      for (let num = 1; num <= 9; num++) {
        // First, check if the number already exists in this row
        let numExists = false;
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === num) {
            numExists = true;
            break;
          }
        }
        if (numExists) continue; // If it exists, move to the next number

        // If it doesn't exist, find where it could go
        let possibleCells = [];
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0 && isValid(board, r, c, num)) {
            possibleCells.push(c);
          }
        }
        if (possibleCells.length === 1) {
          board[r][possibleCells[0]] = num;
          return true; // Found one, restart the whole process
        }
      }
    }

    // --- Scan by COLUMN ---
    for (let c = 0; c < 9; c++) {
      for (let num = 1; num <= 9; num++) {
        let numExists = false;
        for (let r = 0; r < 9; r++) {
          if (board[r][c] === num) {
            numExists = true;
            break;
          }
        }
        if (numExists) continue;

        let possibleCells = [];
        for (let r = 0; r < 9; r++) {
          if (board[r][c] === 0 && isValid(board, r, c, num)) {
            possibleCells.push(r);
          }
        }
        if (possibleCells.length === 1) {
          board[possibleCells[0]][c] = num;
          return true;
        }
      }
    }

    // --- Scan by BOX ---
    for (let boxStartRow = 0; boxStartRow < 9; boxStartRow += 3) {
      for (let boxStartCol = 0; boxStartCol < 9; boxStartCol += 3) {
        for (let num = 1; num <= 9; num++) {
          let numExists = false;
          for (let r_off = 0; r_off < 3; r_off++) {
            for (let c_off = 0; c_off < 3; c_off++) {
              if (board[boxStartRow + r_off][boxStartCol + c_off] === num) {
                numExists = true;
                break;
              }
            }
            if (numExists) break;
          }
          if (numExists) continue;

          let possibleCells = [];
          for (let r_offset = 0; r_offset < 3; r_offset++) {
            for (let c_offset = 0; c_offset < 3; c_offset++) {
              let r = boxStartRow + r_offset;
              let c = boxStartCol + c_offset;
              if (board[r][c] === 0 && isValid(board, r, c, num)) {
                possibleCells.push({ r, c });
              }
            }
          }
          if (possibleCells.length === 1) {
            const { r, c } = possibleCells[0];
            board[r][c] = num;
            return true;
          }
        }
      }
    }

    return false; // No hidden singles found in a full pass
  }

  function isValid(board, row, col, num) {
    for (let c = 0; c < 9; c++) {
      if (board[row][c] === num) return false;
    }
    for (let r = 0; r < 9; r++) {
      if (board[r][col] === num) return false;
    }
    const boxRowStart = Math.floor(row / 3) * 3;
    const boxColStart = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (board[boxRowStart + r][boxColStart + c] === num) return false;
      }
    }
    return true;
  }

  function solveSudoku(board) {
    const find = findEmpty(board);
    if (!find) return true;
    const [row, col] = find;

    for (let num = 1; num <= 9; num++) {
      if (isValid(board, row, col, num)) {
        board[row][col] = num;
        if (solveSudoku(board)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }

  function showMessage(text, color) {
    // First, clear any complex content like buttons
    messageArea.innerHTML = "";
    // Wrap the entire message in a single span
    messageArea.innerHTML = `<span>${text}</span>`;

    const colorClasses = [
      "text-red-600",
      "text-green-600",
      "text-gray-600",
      "text-orange-500",
    ];

    // Remove any previous color classes to avoid conflicts
    messageArea.classList.remove(...colorClasses);

    const colors = {
      red: "text-red-600",
      green: "text-green-600",
      gray: "text-gray-600",
      orange: "text-orange-500", // Add orange
    };

    // Add the specified color class, defaulting to gray for neutral messages
    messageArea.classList.add(colors[color] || "text-gray-600");
  }

  function generateDiscordShareText() {
    const title =
      "[fsrs Daily Sudoku](https://fsrs.darksabun.club/sudoku.html)";

    // 1. Get Date from the dropdown
    const dateVal = dateSelect.value;
    let puzzleDateStr = new Date().toISOString().slice(0, 10); // Fallback to today
    if (dateVal && /^\d{8}$/.test(dateVal)) {
      puzzleDateStr = `${dateVal.slice(0, 4)}-${dateVal.slice(
        4,
        6
      )}-${dateVal.slice(6, 8)}`;
    }

    // 2. Get Level and Time
    const level = levelSelect.value;
    const levelWord = difficultyWords[level] || "Unknown";
    const levelStr = `Level ${level} (${levelWord})`;
    const timeStr = puzzleTimerEl.textContent;

    const header = `${title} | ${puzzleDateStr}\n${levelStr} | Time ${timeStr}\n`;

    // 3. Generate Emoji Grid
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
        gridStr += "\n"; // Extra newline between 3x3 blocks
      }
      for (let c = 0; c < 9; c++) {
        if (c > 0 && c % 3 === 0) {
          gridStr += " "; // Space between 3x3 blocks
        }
        const char = initialPuzzleString[r * 9 + c];
        gridStr += digitMap[char] || emptySquare;
      }
      gridStr += "\n";
    }

    return header + "\n" + gridStr.trim();
  }

  // --- Timer Functions ---

  function startTimer() {
    stopTimer(); // Clear any existing timer before starting a new one
    startTime = Date.now();
    puzzleTimerEl.textContent = "00:00"; // Initial display
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

  // --- History Functions ---

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
    history.push(cloneBoardState(boardState));
    historyIndex++;
    updateUndoRedoButtons();
  }

  function onBoardUpdated() {
    renderBoard(); // Always draw the board first
    queueLampEvaluation(); // Then schedule lamp update
  }

  function queueLampEvaluation() {
    if (lampEvaluationTimeout) clearTimeout(lampEvaluationTimeout);
    lampEvaluationTimeout = setTimeout(() => {
      evaluateBoardDifficulty();
    }, 500); // small delay avoids blocking UI
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      boardState = cloneBoardState(history[historyIndex]);
      onBoardUpdated();
      updateUndoRedoButtons();
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      boardState = cloneBoardState(history[historyIndex]);
      onBoardUpdated();
      updateUndoRedoButtons();
    }
  }

  function updateUndoRedoButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
  }

  // --- Difficulty Evaluation Logic ---
  // A container for all the solving techniques translated from Python
  const techniques = {
    // --- New Helper Functions ---
    _getBoxIndex: (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3),

    _sees: (cell1, cell2) => {
      const [r1, c1] = cell1;
      const [r2, c2] = cell2;
      if (r1 === r2 || c1 === c2) return true;
      return (
        techniques._getBoxIndex(r1, c1) === techniques._getBoxIndex(r2, c2)
      );
    },

    _commonVisibleCells: (cell1, cell2) => {
      const common = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (
            techniques._sees([r, c], cell1) &&
            techniques._sees([r, c], cell2)
          ) {
            common.push([r, c]);
          }
        }
      }
      return common;
    },
    // --- End of New Helpers ---

    combinations: function* (arr, size) {
      if (size > arr.length) return;
      const indices = Array.from({ length: size }, (_, i) => i);
      while (true) {
        yield indices.map((i) => arr[i]);
        let i = size - 1;
        while (i >= 0 && indices[i] === i + arr.length - size) {
          i--;
        }
        if (i < 0) return;
        indices[i]++;
        for (let j = i + 1; j < size; j++) {
          indices[j] = indices[j - 1] + 1;
        }
      }
    },

    _getUnitCells: (unitType, idx) => {
      const cells = [];
      if (unitType === "row") for (let c = 0; c < 9; c++) cells.push([idx, c]);
      else if (unitType === "col")
        for (let r = 0; r < 9; r++) cells.push([r, idx]);
      else if (unitType === "box") {
        const startRow = Math.floor(idx / 3) * 3;
        const startCol = (idx % 3) * 3;
        for (let r_offset = 0; r_offset < 3; r_offset++) {
          for (let c_offset = 0; c_offset < 3; c_offset++) {
            cells.push([startRow + r_offset, startCol + c_offset]);
          }
        }
      }
      return cells;
    },

    nakedSingle: (board, pencils) => {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0 && pencils[r][c].size === 1) {
            const num = pencils[r][c].values().next().value;
            return { change: true, type: "place", r, c, num };
          }
        }
      }
      return { change: false };
    },

    hiddenSingle: (board, pencils) => {
      const units = [];
      for (let i = 0; i < 9; i++) {
        units.push(techniques._getUnitCells("row", i));
        units.push(techniques._getUnitCells("col", i));
        units.push(techniques._getUnitCells("box", i));
      }
      for (const unit of units) {
        for (let num = 1; num <= 9; num++) {
          const possibleCells = [];
          for (const [r, c] of unit) {
            if (board[r][c] === 0 && pencils[r][c].has(num)) {
              possibleCells.push([r, c]);
            }
          }
          if (possibleCells.length === 1) {
            const [r, c] = possibleCells[0];
            return { change: true, type: "place", r, c, num };
          }
        }
      }
      return { change: false };
    },

    intersection: (board, pencils) => {
      // Pointing (Row/Col to Box)
      for (let i = 0; i < 9; i++) {
        for (let num = 1; num <= 9; num++) {
          const rowColsWithNum = [];
          for (let c = 0; c < 9; c++)
            if (pencils[i][c].has(num)) rowColsWithNum.push(c);
          if (
            rowColsWithNum.length > 1 &&
            new Set(rowColsWithNum.map((c) => Math.floor(c / 3))).size === 1
          ) {
            const boxIdx =
              Math.floor(i / 3) * 3 + Math.floor(rowColsWithNum[0] / 3);
            const boxCells = techniques._getUnitCells("box", boxIdx);
            for (const [r, c] of boxCells) {
              if (r !== i && pencils[r][c].has(num))
                return { change: true, type: "remove", cells: [{ r, c, num }] };
            }
          }
          const colRowsWithNum = [];
          for (let r = 0; r < 9; r++)
            if (pencils[r][i].has(num)) colRowsWithNum.push(r);
          if (
            colRowsWithNum.length > 1 &&
            new Set(colRowsWithNum.map((r) => Math.floor(r / 3))).size === 1
          ) {
            const boxIdx =
              Math.floor(colRowsWithNum[0] / 3) * 3 + Math.floor(i / 3);
            const boxCells = techniques._getUnitCells("box", boxIdx);
            for (const [r, c] of boxCells) {
              if (c !== i && pencils[r][c].has(num))
                return { change: true, type: "remove", cells: [{ r, c, num }] };
            }
          }
        }
      }
      // Claiming (Box to Row/Col)
      for (let boxIdx = 0; boxIdx < 9; boxIdx++) {
        for (let num = 1; num <= 9; num++) {
          const boxCellsWithNum = [];
          const boxCells = techniques._getUnitCells("box", boxIdx);
          for (const [r, c] of boxCells)
            if (pencils[r][c].has(num)) boxCellsWithNum.push([r, c]);
          if (boxCellsWithNum.length > 1) {
            if (new Set(boxCellsWithNum.map(([r, c]) => r)).size === 1) {
              const row = boxCellsWithNum[0][0];
              for (let c = 0; c < 9; c++)
                if (
                  Math.floor(c / 3) !== Math.floor(boxCellsWithNum[0][1] / 3) &&
                  pencils[row][c].has(num)
                )
                  return {
                    change: true,
                    type: "remove",
                    cells: [{ r: row, c, num }],
                  };
            }
            if (new Set(boxCellsWithNum.map(([r, c]) => c)).size === 1) {
              const col = boxCellsWithNum[0][1];
              for (let r = 0; r < 9; r++)
                if (
                  Math.floor(r / 3) !== Math.floor(boxCellsWithNum[0][0] / 3) &&
                  pencils[r][col].has(num)
                )
                  return {
                    change: true,
                    type: "remove",
                    cells: [{ r, c: col, num }],
                  };
            }
          }
        }
      }
      return { change: false };
    },

    nakedSubset: (board, pencils, size) => {
      const units = [];
      for (let i = 0; i < 9; i++) {
        units.push(techniques._getUnitCells("row", i));
        units.push(techniques._getUnitCells("col", i));
        units.push(techniques._getUnitCells("box", i));
      }
      for (const unit of units) {
        const potentialCells = unit.filter(
          ([r, c]) =>
            board[r][c] === 0 &&
            pencils[r][c].size >= 2 &&
            pencils[r][c].size <= size
        );
        if (potentialCells.length < size) continue;
        for (const cellGroup of techniques.combinations(potentialCells, size)) {
          const union = new Set();
          cellGroup.forEach(([r, c]) =>
            pencils[r][c].forEach((p) => union.add(p))
          );
          if (union.size === size) {
            const removals = [];
            const cellGroupSet = new Set(cellGroup.map(JSON.stringify));
            for (const [r, c] of unit) {
              if (
                board[r][c] === 0 &&
                !cellGroupSet.has(JSON.stringify([r, c]))
              ) {
                for (const num of union)
                  if (pencils[r][c].has(num)) removals.push({ r, c, num });
              }
            }
            if (removals.length > 0)
              return { change: true, type: "remove", cells: removals };
          }
        }
      }
      return { change: false };
    },

    hiddenSubset: (board, pencils, size) => {
      const units = [];
      for (let i = 0; i < 9; i++) {
        units.push(techniques._getUnitCells("row", i));
        units.push(techniques._getUnitCells("col", i));
        units.push(techniques._getUnitCells("box", i));
      }
      for (const unit of units) {
        const emptyCells = unit.filter(([r, c]) => board[r][c] === 0);
        if (emptyCells.length <= size) continue;
        const unitCandidates = new Set();
        emptyCells.forEach(([r, c]) =>
          pencils[r][c].forEach((p) => unitCandidates.add(p))
        );
        if (unitCandidates.size < size) continue;

        for (const numGroup of techniques.combinations(
          [...unitCandidates],
          size
        )) {
          const numGroupSet = new Set(numGroup);
          const cellsWithNums = emptyCells.filter(
            ([r, c]) => ![...numGroupSet].every((n) => !pencils[r][c].has(n))
          );
          if (cellsWithNums.length === size) {
            const removals = [];
            for (const [r, c] of cellsWithNums) {
              for (const p of pencils[r][c])
                if (!numGroupSet.has(p)) removals.push({ r, c, num: p });
            }
            if (removals.length > 0)
              return { change: true, type: "remove", cells: removals };
          }
        }
      }
      return { change: false };
    },

    fish: (board, pencils, size) => {
      for (const isRowBased of [true, false]) {
        for (let num = 1; num <= 9; num++) {
          const candidatesInDim = [];
          for (let i = 0; i < 9; i++) {
            const indices = [];
            for (let j = 0; j < 9; j++) {
              const [r, c] = isRowBased ? [i, j] : [j, i];
              if (pencils[r][c].has(num)) indices.push(j);
            }
            if (indices.length >= 2 && indices.length <= size) {
              candidatesInDim.push([i, indices]);
            }
          }
          if (candidatesInDim.length < size) continue;

          for (const lines of techniques.combinations(candidatesInDim, size)) {
            const allSecondaryIndices = new Set();
            lines.forEach(([_, indices]) =>
              indices.forEach((idx) => allSecondaryIndices.add(idx))
            );
            if (allSecondaryIndices.size === size) {
              const removals = [];
              const primaryLineIndices = new Set(lines.map(([i, _]) => i));
              for (const secIdx of allSecondaryIndices) {
                for (let primIdx = 0; primIdx < 9; primIdx++) {
                  if (!primaryLineIndices.has(primIdx)) {
                    const [r, c] = isRowBased
                      ? [primIdx, secIdx]
                      : [secIdx, primIdx];
                    if (pencils[r][c].has(num)) removals.push({ r, c, num });
                  }
                }
              }
              if (removals.length > 0)
                return { change: true, type: "remove", cells: removals };
            }
          }
        }
      }
      return { change: false };
    },

    // --- Start of newly added techniques ---
    xyWing: (board, pencils) => {
      const bivalueCells = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (pencils[r][c].size === 2) {
            bivalueCells.push({ r, c, cands: [...pencils[r][c]].sort() });
          }
        }
      }

      if (bivalueCells.length < 3) return { change: false };

      for (const pivot of bivalueCells) {
        const [x, y] = pivot.cands;
        const pincer1Candidates = bivalueCells.filter(
          (cell) =>
            (cell.r !== pivot.r || cell.c !== pivot.c) &&
            techniques._sees([cell.r, cell.c], [pivot.r, pivot.c]) &&
            cell.cands.includes(x) &&
            !cell.cands.includes(y)
        );
        const pincer2Candidates = bivalueCells.filter(
          (cell) =>
            (cell.r !== pivot.r || cell.c !== pivot.c) &&
            techniques._sees([cell.r, cell.c], [pivot.r, pivot.c]) &&
            cell.cands.includes(y) &&
            !cell.cands.includes(x)
        );

        for (const pincer1 of pincer1Candidates) {
          const z = pincer1.cands.find((c) => c !== x);
          if (z === undefined) continue;
          for (const pincer2 of pincer2Candidates) {
            if (
              pincer2.cands.includes(z) &&
              !techniques._sees([pincer1.r, pincer1.c], [pincer2.r, pincer2.c])
            ) {
              const removals = [];
              const commonSeers = techniques._commonVisibleCells(
                [pincer1.r, pincer1.c],
                [pincer2.r, pincer2.c]
              );
              for (const [r, c] of commonSeers) {
                if (pencils[r][c].has(z) && !(r === pivot.r && c === pivot.c)) {
                  removals.push({ r, c, num: z });
                }
              }
              if (removals.length > 0) {
                return { change: true, type: "remove", cells: removals };
              }
            }
          }
        }
      }
      return { change: false };
    },

    xyzWing: (board, pencils) => {
      const trivalueCells = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (pencils[r][c].size === 3) {
            trivalueCells.push({ r, c, cands: new Set(pencils[r][c]) });
          }
        }
      }
      const bivalueCells = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (pencils[r][c].size === 2) {
            bivalueCells.push({ r, c, cands: new Set(pencils[r][c]) });
          }
        }
      }

      for (const pivot of trivalueCells) {
        const wings = bivalueCells.filter(
          (cell) =>
            techniques._sees([cell.r, cell.c], [pivot.r, pivot.c]) &&
            [...cell.cands].every((cand) => pivot.cands.has(cand))
        );
        if (wings.length < 2) continue;

        for (const wingCombo of techniques.combinations(wings, 2)) {
          const [wing1, wing2] = wingCombo;

          // --- START: BUG FIX ---
          // A true XYZ-Wing requires the two wing cells to not see each other.
          // If they do, they form a Naked Triple with the pivot cell.
          if (techniques._sees([wing1.r, wing1.c], [wing2.r, wing2.c])) {
            continue;
          }
          // --- END: BUG FIX ---

          const intersection = new Set(
            [...wing1.cands].filter((c) => wing2.cands.has(c))
          );
          if (intersection.size === 1) {
            const z = intersection.values().next().value;
            const removals = [];
            for (let r = 0; r < 9; r++) {
              for (let c = 0; c < 9; c++) {
                if (
                  (r === pivot.r && c === pivot.c) ||
                  (r === wing1.r && c === wing1.c) ||
                  (r === wing2.r && c === wing2.c)
                ) {
                  continue;
                }

                if (
                  pencils[r][c].has(z) &&
                  techniques._sees([r, c], [pivot.r, pivot.c]) &&
                  techniques._sees([r, c], [wing1.r, wing1.c]) &&
                  techniques._sees([r, c], [wing2.r, wing2.c])
                ) {
                  removals.push({ r, c, num: z });
                }
              }
            }
            if (removals.length > 0) {
              return { change: true, type: "remove", cells: removals };
            }
          }
        }
      }
      return { change: false };
    },

    wWing: (board, pencils) => {
      const bivalueCells = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (pencils[r][c].size === 2) {
            bivalueCells.push({ r, c, cands: new Set(pencils[r][c]) });
          }
        }
      }
      if (bivalueCells.length < 2) return { change: false };

      for (const pair of techniques.combinations(bivalueCells, 2)) {
        const [cell1, cell2] = pair;
        if (cell1.cands.size !== 2 || cell2.cands.size !== 2) continue;
        const cands1 = [...cell1.cands].sort();
        const cands2 = [...cell2.cands].sort();
        if (cands1[0] !== cands2[0] || cands1[1] !== cands2[1]) continue;
        if (techniques._sees([cell1.r, cell1.c], [cell2.r, cell2.c])) continue;

        const [x, y] = cands1;
        // Strong link on x, eliminate y
        let result = techniques._findWWingElimination(
          board,
          pencils,
          cell1,
          cell2,
          x,
          y
        );
        if (result.change) return result;
        // Strong link on y, eliminate x
        result = techniques._findWWingElimination(
          board,
          pencils,
          cell1,
          cell2,
          y,
          x
        );
        if (result.change) return result;
      }
      return { change: false };
    },

    _findWWingElimination: (board, pencils, cell1, cell2, x, y) => {
      const units = [];
      for (let i = 0; i < 9; i++) {
        units.push(techniques._getUnitCells("row", i));
        units.push(techniques._getUnitCells("col", i));
        units.push(techniques._getUnitCells("box", i));
      }

      for (const unit of units) {
        const x_cells = unit.filter(([r, c]) => pencils[r][c].has(x));
        if (x_cells.length === 2) {
          const [link1, link2] = x_cells;
          const sees_l1_c1 = techniques._sees(link1, [cell1.r, cell1.c]);
          const sees_l1_c2 = techniques._sees(link1, [cell2.r, cell2.c]);
          const sees_l2_c1 = techniques._sees(link2, [cell1.r, cell1.c]);
          const sees_l2_c2 = techniques._sees(link2, [cell2.r, cell2.c]);

          if (
            (sees_l1_c1 && sees_l2_c2 && !sees_l1_c2 && !sees_l2_c1) ||
            (sees_l1_c2 && sees_l2_c1 && !sees_l1_c1 && !sees_l2_c2)
          ) {
            const removals = [];
            const commonSeers = techniques._commonVisibleCells(
              [cell1.r, cell1.c],
              [cell2.r, cell2.c]
            );
            for (const [r, c] of commonSeers) {
              if (pencils[r][c].has(y)) {
                removals.push({ r, c, num: y });
              }
            }
            if (removals.length > 0) {
              return { change: true, type: "remove", cells: removals };
            }
          }
        }
      }
      return { change: false };
    },

    remotePair: (board, pencils) => {
      const bivalueCells = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (pencils[r][c].size === 2) {
            const cands = [...pencils[r][c]].sort().join("");
            bivalueCells.push({ r, c, cands });
          }
        }
      }

      const pairGroups = new Map();
      for (const cell of bivalueCells) {
        if (!pairGroups.has(cell.cands)) {
          pairGroups.set(cell.cands, []);
        }
        pairGroups.get(cell.cands).push([cell.r, cell.c]);
      }

      for (const [pairStr, cells] of pairGroups.entries()) {
        if (cells.length < 4) continue;
        const pair = pairStr.split("").map(Number);
        const adj = new Map();
        cells.forEach((cell) => adj.set(JSON.stringify(cell), []));

        for (let i = 0; i < cells.length; i++) {
          for (let j = i + 1; j < cells.length; j++) {
            if (techniques._sees(cells[i], cells[j])) {
              adj.get(JSON.stringify(cells[i])).push(cells[j]);
              adj.get(JSON.stringify(cells[j])).push(cells[i]);
            }
          }
        }

        for (const startNode of cells) {
          const queue = [[startNode, [startNode]]]; // [node, path]
          const visitedPaths = new Set();
          visitedPaths.add(JSON.stringify([startNode]));

          while (queue.length > 0) {
            const [current, path] = queue.shift();

            if (path.length >= 4 && path.length % 2 === 0) {
              const end1 = path[0];
              const end2 = path[path.length - 1];
              const commonSeers = techniques._commonVisibleCells(end1, end2);
              const removals = [];

              for (const [r, c] of commonSeers) {
                if (!path.some((p) => p[0] === r && p[1] === c)) {
                  if (pencils[r][c].has(pair[0]))
                    removals.push({ r, c, num: pair[0] });
                  if (pencils[r][c].has(pair[1]))
                    removals.push({ r, c, num: pair[1] });
                }
              }
              if (removals.length > 0) {
                return { change: true, type: "remove", cells: removals };
              }
            }

            const currentStr = JSON.stringify(current);
            for (const neighbor of adj.get(currentStr)) {
              if (
                !path.some((p) => p[0] === neighbor[0] && p[1] === neighbor[1])
              ) {
                const newPath = [...path, neighbor];
                const newPathStr = JSON.stringify(
                  newPath.map((p) => p.join(",")).sort()
                ); // Path invariant to direction
                if (!visitedPaths.has(newPathStr)) {
                  queue.push([neighbor, newPath]);
                  visitedPaths.add(newPathStr);
                }
              }
            }
          }
        }
      }
      return { change: false };
    },

    chuteRemotePair: (board, pencils) => {
      let result = techniques._runChuteLogic(board, pencils, true); // Rows
      if (result.change) return result;
      result = techniques._runChuteLogic(board, pencils, false); // Columns
      return result;
    },

    _runChuteLogic: (board, pencils, isRowVersion) => {
      for (let chuteIndex = 0; chuteIndex < 3; chuteIndex++) {
        const bivalueCells = [];
        const chuteRange = [
          chuteIndex * 3,
          chuteIndex * 3 + 1,
          chuteIndex * 3 + 2,
        ];

        for (const i of chuteRange) {
          for (let j = 0; j < 9; j++) {
            const [r, c] = isRowVersion ? [i, j] : [j, i];
            if (pencils[r][c].size === 2) {
              bivalueCells.push({ r, c, cands: pencils[r][c] });
            }
          }
        }

        if (bivalueCells.length < 2) continue;

        for (const pair of techniques.combinations(bivalueCells, 2)) {
          const [cell1, cell2] = pair;
          if (techniques._sees([cell1.r, cell1.c], [cell2.r, cell2.c]))
            continue;

          const cands1Str = [...cell1.cands].sort().join("");
          const cands2Str = [...cell2.cands].sort().join("");
          if (cands1Str !== cands2Str) continue;

          const [x, y] = [...cell1.cands];
          const intersectionCandidates = new Set();
          let other_line, other_box_start;

          if (isRowVersion) {
            const pair_rows = new Set([cell1.r, cell2.r]);
            other_line = chuteRange.find((r) => !pair_rows.has(r));

            const chute_boxes = new Set([
              chuteIndex * 3,
              chuteIndex * 3 + 1,
              chuteIndex * 3 + 2,
            ]);
            const pair_boxes = new Set([
              techniques._getBoxIndex(cell1.r, cell1.c),
              techniques._getBoxIndex(cell2.r, cell2.c),
            ]);
            const other_box_index = [...chute_boxes].find(
              (b) => !pair_boxes.has(b)
            );
            if (other_box_index === undefined) continue;
            other_box_start = (other_box_index % 3) * 3;

            for (let c = other_box_start; c < other_box_start + 3; c++) {
              pencils[other_line][c].forEach((cand) =>
                intersectionCandidates.add(cand)
              );
              if (board[other_line][c] !== 0)
                intersectionCandidates.add(board[other_line][c]);
            }
          } else {
            // Column version
            const pair_cols = new Set([cell1.c, cell2.c]);
            other_line = chuteRange.find((c) => !pair_cols.has(c));

            const chute_boxes = new Set([
              chuteIndex,
              chuteIndex + 3,
              chuteIndex + 6,
            ]);
            const pair_boxes = new Set([
              techniques._getBoxIndex(cell1.r, cell1.c),
              techniques._getBoxIndex(cell2.r, cell2.c),
            ]);
            const other_box_index = [...chute_boxes].find(
              (b) => !pair_boxes.has(b)
            );
            if (other_box_index === undefined) continue;
            other_box_start = Math.floor(other_box_index / 3) * 3;

            for (let r = other_box_start; r < other_box_start + 3; r++) {
              pencils[r][other_line].forEach((cand) =>
                intersectionCandidates.add(cand)
              );
              if (board[r][other_line] !== 0)
                intersectionCandidates.add(board[r][other_line]);
            }
          }

          const removals = [];
          const commonSeers = techniques._commonVisibleCells(
            [cell1.r, cell1.c],
            [cell2.r, cell2.c]
          );
          if (!intersectionCandidates.has(x)) {
            for (const [r, c] of commonSeers) {
              if (pencils[r][c].has(y)) removals.push({ r, c, num: y });
            }
          }
          if (!intersectionCandidates.has(y)) {
            for (const [r, c] of commonSeers) {
              if (pencils[r][c].has(x)) removals.push({ r, c, num: x });
            }
          }
          if (removals.length > 0) {
            const uniqueRemovals = Array.from(
              new Set(removals.map(JSON.stringify))
            ).map(JSON.parse);
            return { change: true, type: "remove", cells: uniqueRemovals };
          }
        }
      }
      return { change: false };
    },

    bugPlusOne: (board, pencils) => {
      const unsolvedCells = [];
      const bivalueCells = [];
      const trivalueCells = [];

      // Step 1 & 2: Categorize all unsolved cells
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) {
            unsolvedCells.push({ r, c });
            const count = pencils[r][c].size;
            if (count === 2) bivalueCells.push({ r, c });
            else if (count === 3) trivalueCells.push({ r, c });
          }
        }
      }

      // Step 3: Check if the board is in a BUG+1 state
      if (
        trivalueCells.length === 1 &&
        bivalueCells.length === unsolvedCells.length - 1
      ) {
        const { r: r_plus1, c: c_plus1 } = trivalueCells[0];
        const cands = [...pencils[r_plus1][c_plus1]];

        // Step 4: Test each of the 3 candidates in the "+1" cell
        for (const num of cands) {
          // Count occurrences of candidate 'num' in the cell's units
          let rowCount = 0;
          for (let c = 0; c < 9; c++) {
            if (board[r_plus1][c] === 0 && pencils[r_plus1][c].has(num))
              rowCount++;
          }

          let colCount = 0;
          for (let r = 0; r < 9; r++) {
            if (board[r][c_plus1] === 0 && pencils[r][c_plus1].has(num))
              colCount++;
          }

          let boxCount = 0;
          const boxRowStart = Math.floor(r_plus1 / 3) * 3;
          const boxColStart = Math.floor(c_plus1 / 3) * 3;
          for (let ro = 0; ro < 3; ro++) {
            for (let co = 0; co < 3; co++) {
              const r = boxRowStart + ro;
              const c = boxColStart + co;
              if (board[r][c] === 0 && pencils[r][c].has(num)) boxCount++;
            }
          }

          // Step 5: If 'num' appears an odd number of times in all three units, it must be the solution
          if (rowCount % 2 !== 0 && colCount % 2 !== 0 && boxCount % 2 !== 0) {
            // Reduce the cell to a naked single
            return { change: true, type: "place", r: r_plus1, c: c_plus1, num };
          }
        }
      }

      return { change: false };
    },
    // ----------------- ADD / UPDATE: Unique Rectangle (Types 1-6) and helpers -----------------
    // Insert these inside the `techniques` object. Place _findUniqueRectangles and
    // _findCommonPeers BEFORE uniqueRectangle so uniqueRectangle can call them.

    _findUniqueRectangles: (board, pencils) => {
      // Returns list of rectangles: { cells: [[r1,c1],[r1,c2],[r2,c1],[r2,c2]], digits: [d1,d2] }
      const rects = [];
      for (let d1 = 1; d1 <= 8; d1++) {
        for (let d2 = d1 + 1; d2 <= 9; d2++) {
          for (let r1 = 0; r1 < 9; r1++) {
            for (let r2 = r1 + 1; r2 < 9; r2++) {
              const cols = [];
              for (let c = 0; c < 9; c++) {
                // both rows must have both digits in this column (as candidates)
                if (
                  pencils[r1][c].has(d1) &&
                  pencils[r1][c].has(d2) &&
                  pencils[r2][c].has(d1) &&
                  pencils[r2][c].has(d2)
                ) {
                  cols.push(c);
                }
              }
              if (cols.length < 2) continue;
              for (let i = 0; i < cols.length; i++) {
                for (let j = i + 1; j < cols.length; j++) {
                  const c1 = cols[i],
                    c2 = cols[j];
                  // must span exactly two boxes
                  const spanBoxes =
                    (Math.floor(r1 / 3) === Math.floor(r2 / 3)) !==
                    (Math.floor(c1 / 3) === Math.floor(c2 / 3));
                  if (!spanBoxes) continue;
                  const cells = [
                    [r1, c1],
                    [r1, c2],
                    [r2, c1],
                    [r2, c2],
                  ];

                  // At least one of the four must be exactly the bivalue pair (UR floor)
                  let hasBivalueFloor = false;
                  for (const [r, c] of cells) {
                    if (
                      pencils[r][c].size === 2 &&
                      pencils[r][c].has(d1) &&
                      pencils[r][c].has(d2)
                    ) {
                      hasBivalueFloor = true;
                      break;
                    }
                  }
                  if (!hasBivalueFloor) continue;

                  rects.push({ cells, digits: [d1, d2] });
                }
              }
            }
          }
        }
      }
      return rects;
    },

    _findCommonPeers: (cells, rectCells, board, pencils) => {
      // returns array of [r,c] that see every cell in `cells`
      // exclude any cells that are inside rectCells (or equal to any in cells),
      // and only include unsolved cells (board[r][c] === 0)
      const isSame = (a, b) => a[0] === b[0] && a[1] === b[1];
      const inRect = (r, c) =>
        rectCells.some((rc) => rc[0] === r && rc[1] === c) ||
        cells.some((rc) => rc[0] === r && rc[1] === c);
      const peers = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] !== 0) continue; // only unsolved
          if (inRect(r, c)) continue;
          let seesAll = true;
          for (const cell of cells) {
            if (!techniques._sees([r, c], cell)) {
              seesAll = false;
              break;
            }
          }
          if (seesAll) peers.push([r, c]);
        }
      }
      return peers;
    },

    uniqueRectangle: (board, pencils) => {
      const rects = techniques._findUniqueRectangles(board, pencils);
      if (!rects || rects.length === 0) return { change: false };

      const isExactPair = (r, c, d1, d2) =>
        pencils[r][c].size === 2 &&
        pencils[r][c].has(d1) &&
        pencils[r][c].has(d2);

      const uniqueRemovals = (arr) => {
        return Array.from(new Set(arr.map(JSON.stringify))).map(JSON.parse);
      };

      for (const rect of rects) {
        const { cells, digits } = rect;
        const [d1, d2] = digits;

        const extraCells = cells.filter(([r, c]) => !isExactPair(r, c, d1, d2));

        // --- Type 1: One extra cell ---
        if (extraCells.length === 1) {
          const [r, c] = extraCells[0];
          const removals = [];
          if (pencils[r][c].has(d1)) removals.push({ r, c, num: d1 });
          if (pencils[r][c].has(d2)) removals.push({ r, c, num: d2 });
          if (removals.length > 0)
            return {
              change: true,
              type: "remove",
              cells: uniqueRemovals(removals),
              details: {
                subtype: "Type 1",
                rectangleCells: cells,
                digits: digits,
              },
            };
        }

        // --- Types 2 & 5: Two or three extra cells with a common extra digit ---
        if (extraCells.length === 2 || extraCells.length === 3) {
          const extrasMasks = extraCells.map(([r, c]) =>
            Array.from(pencils[r][c]).filter((x) => x !== d1 && x !== d2)
          );
          let allHaveOneExtra = extrasMasks.every((arr) => arr.length === 1);
          if (allHaveOneExtra && extrasMasks.length > 0) {
            const commonExtraDigit = extrasMasks[0][0];
            let allAreSame = extrasMasks.every(
              (arr) => arr[0] === commonExtraDigit
            );
            if (allAreSame) {
              const peers = techniques._findCommonPeers(
                extraCells,
                cells,
                board,
                pencils
              );
              const removals = [];
              for (const [r, c] of peers) {
                if (pencils[r][c].has(commonExtraDigit)) {
                  removals.push({ r, c, num: commonExtraDigit });
                }
              }
              if (removals.length > 0)
                return {
                  change: true,
                  type: "remove",
                  cells: uniqueRemovals(removals),
                  details: {
                    subtype: `Type ${extraCells.length === 2 ? 2 : 5}`,
                    rectangleCells: cells,
                    digits: digits,
                  },
                };
            }
          }
        }

        // --- Types 3, 4, 6: Require exactly two extra cells ---
        if (extraCells.length === 2) {
          const [e1, e2] = extraCells;
          const [e1r, e1c] = e1;
          const [e2r, e2c] = e2;

          // --- Type 3: Virtual Naked Subset ---
          const virtualSet = new Set();
          for (const d of pencils[e1r][e1c])
            if (d !== d1 && d !== d2) virtualSet.add(d);
          for (const d of pencils[e2r][e2c])
            if (d !== d1 && d !== d2) virtualSet.add(d);

          if (virtualSet.size > 0) {
            const processUnit = (unitCellsRaw) => {
              const unitCells = unitCellsRaw.filter(
                ([r, c]) =>
                  !cells.some((rc) => rc[0] === r && rc[1] === c) &&
                  board[r][c] === 0
              );
              if (unitCells.length < 1) return null;
              // Note: The loop for k can stop earlier, as k + 1 cannot be larger than the number of available 'other' cells
              for (let k = 1; k < unitCells.length; k++) {
                for (const chosen of techniques.combinations(unitCells, k)) {
                  const union = new Set(virtualSet);
                  chosen.forEach(([r, c]) =>
                    pencils[r][c].forEach((p) => union.add(p))
                  );
                  // --- FIX IS HERE ---
                  // The number of candidates must equal k real cells + 1 virtual cell.
                  if (union.size === k + 1) {
                    const chosenSet = new Set(chosen.map(JSON.stringify));
                    const removals = [];
                    for (const [r, c] of unitCells) {
                      if (chosenSet.has(JSON.stringify([r, c]))) continue;
                      for (const d of union) {
                        if (pencils[r][c].has(d))
                          removals.push({ r, c, num: d });
                      }
                    }
                    if (removals.length > 0) return uniqueRemovals(removals);
                  }
                }
              }
              return null;
            };

            const sharedUnits = [];
            if (e1r === e2r)
              sharedUnits.push(techniques._getUnitCells("row", e1r));
            if (e1c === e2c)
              sharedUnits.push(techniques._getUnitCells("col", e1c));
            if (
              techniques._getBoxIndex(e1r, e1c) ===
              techniques._getBoxIndex(e2r, e2c)
            ) {
              sharedUnits.push(
                techniques._getUnitCells(
                  "box",
                  techniques._getBoxIndex(e1r, e1c)
                )
              );
            }

            for (const unit of sharedUnits) {
              const res = processUnit(unit);
              if (res)
                return {
                  change: true,
                  type: "remove",
                  cells: res,
                  details: {
                    subtype: "Type 3 (Virtual Naked Subset)",
                    rectangleCells: cells,
                    digits: digits,
                  },
                };
            }
          }

          // --- Type 4: Aligned extra cells with a restricted digit ---
          if (e1r === e2r || e1c === e2c) {
            for (const u of [d1, d2]) {
              const v = u === d1 ? d2 : d1;
              let isRestricted = false;
              if (e1r === e2r) {
                let u_found_elsewhere = false;
                for (let c = 0; c < 9; ++c) {
                  if (
                    !cells.some((rc) => rc[0] === e1r && rc[1] === c) &&
                    pencils[e1r][c].has(u)
                  ) {
                    u_found_elsewhere = true;
                    break;
                  }
                }
                if (!u_found_elsewhere) isRestricted = true;
              } else {
                let u_found_elsewhere = false;
                for (let r = 0; r < 9; ++r) {
                  if (
                    !cells.some((rc) => rc[0] === r && rc[1] === e1c) &&
                    pencils[r][e1c].has(u)
                  ) {
                    u_found_elsewhere = true;
                    break;
                  }
                }
                if (!u_found_elsewhere) isRestricted = true;
              }

              if (isRestricted) {
                const removals = [];
                if (pencils[e1r][e1c].has(v))
                  removals.push({ r: e1r, c: e1c, num: v });
                if (pencils[e2r][e2c].has(v))
                  removals.push({ r: e2r, c: e2c, num: v });
                if (removals.length > 0)
                  return {
                    change: true,
                    type: "remove",
                    cells: uniqueRemovals(removals),
                    details: {
                      subtype: "Type 4 (Aligned Pair)",
                      rectangleCells: cells,
                      digits: digits,
                    },
                  };
              }
            }
          }

          // --- Type 6: Diagonal extra cells with restricted rows ---
          if (e1r !== e2r && e1c !== e2c) {
            for (const u of [d1, d2]) {
              let u_found_in_rows = false;
              for (const row of [cells[0][0], cells[2][0]]) {
                for (let c = 0; c < 9; ++c) {
                  if (
                    !cells.some((rc) => rc[0] === row && rc[1] === c) &&
                    pencils[row][c].has(u)
                  ) {
                    u_found_in_rows = true;
                    break;
                  }
                }
                if (u_found_in_rows) break;
              }

              if (!u_found_in_rows) {
                const removals = [];
                if (pencils[e1r][e1c].has(u))
                  removals.push({ r: e1r, c: e1c, num: u });
                if (pencils[e2r][e2c].has(u))
                  removals.push({ r: e2r, c: e2c, num: u });
                if (removals.length > 0)
                  return {
                    change: true,
                    type: "remove",
                    cells: uniqueRemovals(removals),
                    details: {
                      subtype: "Type 6 (Diagonal Pair)",
                      rectangleCells: cells,
                      digits: digits,
                    },
                  };
              }
            }
          }
        }
      }
      return { change: false };
    },
    // --- End of newly added techniques ---
  };

  async function evaluateBoardDifficulty() {
    await new Promise(requestAnimationFrame);
    if (!initialPuzzleString || !solutionBoard) {
      updateLamp("gray");
      return;
    }

    // 1. Invalid Sudoku check
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

    // 2. Determine starting state
    const currentBoardForEval = cloneBoardState(boardState);
    let emptyCount = 0;
    let emptyWithNoPencils = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (currentBoardForEval[r][c].value === 0) {
          emptyCount++;
          if (currentBoardForEval[r][c].pencils.size === 0)
            emptyWithNoPencils++;
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

    // 3. Wrong progression check
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (
          virtualBoard[r][c] !== 0 &&
          virtualBoard[r][c] !== solutionBoard[r][c]
        ) {
          updateLamp("gray");
          return;
        }
        if (
          virtualBoard[r][c] === 0 &&
          startingPencils[r][c].size > 0 && // Only check if pencils exist
          !startingPencils[r][c].has(solutionBoard[r][c])
        ) {
          updateLamp("gray");
          return;
        }
      }
    }

    // 4. Easy check
    if (emptyCount <= 3) {
      updateLamp("white");
      return;
    }

    // 5. Iterative solving
    let maxDifficulty = 0;
    const techniqueOrder = [
      { name: "Naked Single", func: techniques.nakedSingle, level: 0 },
      { name: "Hidden Single", func: techniques.hiddenSingle, level: 0 },
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
            console.groupCollapsed(`Found: ${tech.name} (Level ${tech.level})`);
            if (tech.name === "Unique Rectangle" && result.details) {
              const { subtype, rectangleCells, digits } = result.details;
              const cellStr = rectangleCells
                .map(([r, c]) => `(${r},${c})`)
                .join(", ");
              console.log(
                `%cUR Info: ${subtype} on cells [${cellStr}] with digits [${digits.join(
                  ","
                )}]`,
                "color: #0284c7"
              );
            }
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
            logBoardState(virtualBoard, startingPencils);
            console.groupEnd();
          }

          progressMade = true;
          break; // Restart scan
        }
      }
    }

    // 6. Set lamp color based on results
    const isSolved = virtualBoard.flat().every((v) => v !== 0);
    if (isSolved) {
      if (maxDifficulty === 0) updateLamp("white");
      else if (maxDifficulty === 1) updateLamp("green");
      else if (maxDifficulty === 2) updateLamp("yellow");
    } else {
      updateLamp("orange");
    }
  }

  initialize();
});
