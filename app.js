const boardEl = document.getElementById('board');
const difficultyEl = document.getElementById('difficulty');
const messageEl = document.getElementById('message');
const timerEl = document.getElementById('timer');
const mistakesEl = document.getElementById('mistakes');
const hintsUsedEl = document.getElementById('hints-used');
const notesToggleEl = document.getElementById('notes-toggle');
const numberPadButtons = [...document.querySelectorAll('.number-pad button')];

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const MAX_MISTAKES = 3;
const blanksByDifficulty = {
  easy: 35,
  normal: 45,
  hard: 53,
  expert: 58,
};

let puzzle = [];
let solution = [];
let initialPuzzle = [];
let notes = [];
let selectedIndex = 0;
let mistakes = 0;
let hintsUsed = 0;
let noteMode = false;
let history = [];
let gameOver = false;
let completed = false;
let elapsedSeconds = 0;
let timerId = null;

function showMessage(text, type = '') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function cloneNotes(source) {
  return source.map((row) => row.map((cell) => [...cell]));
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isValid(grid, row, col, num) {
  for (let i = 0; i < 9; i += 1) {
    if (grid[row][i] === num || grid[i][col] === num) {
      return false;
    }
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      if (grid[r][c] === num) {
        return false;
      }
    }
  }

  return true;
}

function solveGrid(grid) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (grid[row][col] === 0) {
        for (const num of shuffle(DIGITS)) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (solveGrid(grid)) {
              return true;
            }
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }

  return true;
}

function createSolvedGrid() {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  solveGrid(grid);
  return grid;
}

function createPuzzleFromSolution(solved, blanks) {
  const created = cloneGrid(solved);
  const cells = shuffle(Array.from({ length: 81 }, (_, index) => index));

  for (let i = 0; i < blanks; i += 1) {
    const idx = cells[i];
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    created[row][col] = 0;
  }

  return created;
}

function createEmptyNotes() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
}

function isFixedCell(row, col) {
  return initialPuzzle[row][col] !== 0;
}

function updateStatusPanel() {
  mistakesEl.textContent = `${mistakes}/${MAX_MISTAKES}`;
  hintsUsedEl.textContent = `${hintsUsed}回`;
  notesToggleEl.textContent = noteMode ? 'メモ ON' : 'メモ OFF';
  notesToggleEl.classList.toggle('active', noteMode);
  notesToggleEl.setAttribute('aria-pressed', String(noteMode));
}

function formatTime(totalSeconds) {
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function startTimer() {
  if (timerId) {
    clearInterval(timerId);
  }

  timerEl.textContent = formatTime(elapsedSeconds);
  timerId = window.setInterval(() => {
    if (gameOver || completed) {
      return;
    }
    elapsedSeconds += 1;
    timerEl.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function saveHistory() {
  history.push({
    puzzle: cloneGrid(puzzle),
    notes: cloneNotes(notes),
    mistakes,
    hintsUsed,
    completed,
    gameOver,
    elapsedSeconds,
  });
}

function getCellMeta(row, col) {
  const value = puzzle[row][col];
  const idx = row * 9 + col;
  const selectedRow = Math.floor(selectedIndex / 9);
  const selectedCol = selectedIndex % 9;
  const selectedValue = puzzle[selectedRow]?.[selectedCol] ?? 0;

  return {
    idx,
    value,
    fixed: isFixedCell(row, col),
    selected: idx === selectedIndex,
    related:
      idx !== selectedIndex &&
      (row === selectedRow || col === selectedCol || (Math.floor(row / 3) === Math.floor(selectedRow / 3) && Math.floor(col / 3) === Math.floor(selectedCol / 3))),
    sameValue: selectedValue !== 0 && selectedValue === value,
    invalid: value !== 0 && value !== solution[row][col],
  };
}

function renderNotes(cell, row, col) {
  const noteGrid = document.createElement('div');
  noteGrid.className = 'notes-grid';

  for (const digit of DIGITS) {
    const noteEl = document.createElement('span');
    noteEl.textContent = notes[row][col].includes(digit) ? String(digit) : '';
    noteGrid.append(noteEl);
  }

  cell.append(noteGrid);
}

function renderBoard() {
  boardEl.innerHTML = '';

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const meta = getCellMeta(row, col);
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.dataset.index = String(meta.idx);
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.type = 'button';
      cell.setAttribute('aria-label', `行${row + 1} 列${col + 1} ${meta.value === 0 ? '空きマス' : `${meta.value}`}`);

      if (meta.fixed) {
        cell.classList.add('fixed');
      }
      if (meta.selected) {
        cell.classList.add('selected');
      }
      if (meta.related) {
        cell.classList.add('related');
      }
      if (meta.sameValue) {
        cell.classList.add('same-value');
      }
      if (meta.invalid) {
        cell.classList.add('invalid');
      }

      if (meta.value === 0) {
        renderNotes(cell, row, col);
      } else {
        cell.textContent = String(meta.value);
      }

      cell.addEventListener('click', () => selectCell(meta.idx));
      boardEl.append(cell);
    }
  }
}

function selectCell(index) {
  selectedIndex = index;
  renderBoard();
}

function checkForCompletion() {
  const solved = puzzle.every((row, rowIndex) => row.every((value, colIndex) => value === solution[rowIndex][colIndex]));
  if (solved) {
    completed = true;
    stopTimer();
    renderBoard();
    showMessage(`クリア！おめでとうございます 🎉 記録: ${formatTime(elapsedSeconds)}`, 'ok');
  }
}

function registerMistake() {
  mistakes += 1;
  updateStatusPanel();

  if (mistakes >= MAX_MISTAKES) {
    gameOver = true;
    stopTimer();
    renderBoard();
    showMessage('3回間違えたためゲームオーバーです。新しいゲームで再挑戦しましょう。', 'error');
  } else {
    showMessage(`間違いがあります。残り ${MAX_MISTAKES - mistakes} 回です。`, 'error');
  }
}

function clearCell(row, col) {
  puzzle[row][col] = 0;
  notes[row][col] = [];
}

function toggleNote(number) {
  const row = Math.floor(selectedIndex / 9);
  const col = selectedIndex % 9;

  if (isFixedCell(row, col) || gameOver || completed) {
    return;
  }

  if (puzzle[row][col] !== 0) {
    showMessage('メモは空いているマスで使えます。まず数字を消してください。');
    return;
  }

  saveHistory();
  const nextNotes = new Set(notes[row][col]);
  if (nextNotes.has(number)) {
    nextNotes.delete(number);
  } else {
    nextNotes.add(number);
  }
  notes[row][col] = [...nextNotes].sort((a, b) => a - b);
  renderBoard();
  showMessage(`メモ ${number} を${nextNotes.has(number) ? '追加' : '削除'}しました。`);
}

function setCell(number) {
  const row = Math.floor(selectedIndex / 9);
  const col = selectedIndex % 9;

  if (isFixedCell(row, col) || gameOver || completed) {
    if (isFixedCell(row, col)) {
      showMessage('固定マスは変更できません。', 'error');
    } else if (gameOver) {
      showMessage('ゲームオーバーです。新しいゲームを始めてください。', 'error');
    } else if (completed) {
      showMessage('この問題はクリア済みです。新しいゲームで次に進みましょう。', 'ok');
    }
    return;
  }

  if (noteMode && number !== 0) {
    toggleNote(number);
    return;
  }

  saveHistory();

  if (number === 0) {
    clearCell(row, col);
    renderBoard();
    showMessage('マスを消しました。');
    return;
  }

  puzzle[row][col] = number;
  notes[row][col] = [];
  renderBoard();

  if (number !== solution[row][col]) {
    registerMistake();
    return;
  }

  showMessage('いいですね。この調子です。', 'ok');
  checkForCompletion();
}

function undoMove() {
  const previous = history.pop();
  if (!previous) {
    showMessage('元に戻せる操作がありません。');
    return;
  }

  puzzle = cloneGrid(previous.puzzle);
  notes = cloneNotes(previous.notes);
  mistakes = previous.mistakes;
  hintsUsed = previous.hintsUsed;
  completed = previous.completed;
  gameOver = previous.gameOver;
  elapsedSeconds = previous.elapsedSeconds;
  timerEl.textContent = formatTime(elapsedSeconds);
  if (!completed && !gameOver && !timerId) {
    startTimer();
  }
  updateStatusPanel();
  renderBoard();
  showMessage('1手戻しました。');
}

function useHint() {
  if (gameOver || completed) {
    return;
  }

  let row = Math.floor(selectedIndex / 9);
  let col = selectedIndex % 9;
  if (isFixedCell(row, col) || puzzle[row][col] === solution[row][col]) {
    const target = puzzle.flat().findIndex((value, index) => {
      const targetRow = Math.floor(index / 9);
      const targetCol = index % 9;
      return !isFixedCell(targetRow, targetCol) && value !== solution[targetRow][targetCol];
    });
    if (target === -1) {
      checkForCompletion();
      return;
    }
    row = Math.floor(target / 9);
    col = target % 9;
    selectedIndex = target;
  }

  saveHistory();
  puzzle[row][col] = solution[row][col];
  notes[row][col] = [];
  hintsUsed += 1;
  updateStatusPanel();
  renderBoard();
  showMessage('ヒントで1マス埋めました。', 'ok');
  checkForCompletion();
}

function checkAnswer() {
  const wrongCells = [];

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row][col] !== 0 && puzzle[row][col] !== solution[row][col]) {
        wrongCells.push([row, col]);
      }
    }
  }

  renderBoard();

  if (wrongCells.length > 0) {
    showMessage(`まだ ${wrongCells.length} マス間違いがあります。赤い数字を直してみましょう。`, 'error');
    return;
  }

  if (puzzle.flat().includes(0)) {
    showMessage('今のところ正解です。空いているマスを埋めましょう。', 'ok');
    return;
  }

  checkForCompletion();
}

function solvePuzzle() {
  saveHistory();
  puzzle = cloneGrid(solution);
  notes = createEmptyNotes();
  completed = true;
  gameOver = false;
  stopTimer();
  renderBoard();
  showMessage(`自動で解きました。タイム: ${formatTime(elapsedSeconds)}`, 'ok');
}

function toggleNotesMode() {
  noteMode = !noteMode;
  updateStatusPanel();
  showMessage(noteMode ? 'メモモードをオンにしました。' : 'メモモードをオフにしました。');
}

function resetGameState() {
  notes = createEmptyNotes();
  selectedIndex = 0;
  mistakes = 0;
  hintsUsed = 0;
  history = [];
  gameOver = false;
  completed = false;
  noteMode = false;
  elapsedSeconds = 0;
  updateStatusPanel();
}

function newGame() {
  showMessage('問題を作成中...');
  const solved = createSolvedGrid();
  solution = solved;
  puzzle = createPuzzleFromSolution(solved, blanksByDifficulty[difficultyEl.value]);
  initialPuzzle = cloneGrid(puzzle);
  resetGameState();

  const firstOpen = puzzle.flat().findIndex((cell) => cell === 0);
  selectedIndex = firstOpen === -1 ? 0 : firstOpen;
  renderBoard();
  timerEl.textContent = formatTime(elapsedSeconds);
  startTimer();
  showMessage('新しい問題を作成しました。メモやヒントも使えます。');
}

numberPadButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setCell(Number(button.dataset.number));
  });
});

document.getElementById('new-game').addEventListener('click', newGame);
document.getElementById('undo').addEventListener('click', undoMove);
document.getElementById('hint').addEventListener('click', useHint);
document.getElementById('check').addEventListener('click', checkAnswer);
document.getElementById('solve').addEventListener('click', solvePuzzle);
notesToggleEl.addEventListener('click', toggleNotesMode);

document.addEventListener('keydown', (event) => {
  if (/^[1-9]$/.test(event.key)) {
    event.preventDefault();
    setCell(Number(event.key));
  }
  if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
    event.preventDefault();
    setCell(0);
  }
  if (event.key.toLowerCase() === 'n') {
    event.preventDefault();
    toggleNotesMode();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undoMove();
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    selectCell((selectedIndex + 1) % 81);
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    selectCell((selectedIndex + 80) % 81);
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    selectCell((selectedIndex + 72) % 81);
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    selectCell((selectedIndex + 9) % 81);
  }
});

newGame();
