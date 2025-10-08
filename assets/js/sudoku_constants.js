// --- START: ADDED DEBUG FLAG ---
// Set this to 'true' to see detailed solver logs in the console.
// Set this to 'false' for release to hide them.
const IS_DEBUG_MODE = false;
const LOG_CANDIDATE_GRID = false;
// --- END: ADDED DEBUG FLAG ---

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

// live palette variables used by updateControls()
let cellColorPalette;
let candidateColorPalette;

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
let lampEvaluationTimeout = null;
let currentLampColor = "gray";
let isExperimentalMode = false;
