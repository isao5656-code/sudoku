const boardEl = document.getElementById('board');
const difficultyEl = document.getElementById('difficulty');
const messageEl = document.getElementById('message');
const memoButton = document.getElementById('memo');
const numberPadButtons = [...document.querySelectorAll('.number-pad button')];

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const blanksByDifficulty = {
  easy: 35,
  normal: 45,
  hard: 53,
};

let puzzle = [];
let solution = [];
let givens = [];
let notes = [];
let selectedIndex = 0;
let memoMode = false;

function showMessage(text, type = '') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function createEmptyNotes() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
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
        const candidates = shuffle(DIGITS);
        for (const num of candidates) {
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
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));
  for (let i = 0; i < blanks; i += 1) {
    const idx = cells[i];
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    created[row][col] = 0;
  }
  return created;
}

function isGivenCell(row, col) {
  return givens[row][col];
}

function clearNotes(row, col) {
  notes[row][col].clear();
}

function renderNotes(row, col) {
  const wrapper = document.createElement('div');
  wrapper.className = 'cell-notes';

  for (const digit of DIGITS) {
    const note = document.createElement('span');
    note.className = 'note';
    note.textContent = notes[row][col].has(digit) ? String(digit) : '';
    wrapper.append(note);
  }

  return wrapper;
}

function renderBoard() {
  boardEl.innerHTML = '';

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const idx = row * 9 + col;
      const value = puzzle[row][col];
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.dataset.index = String(idx);
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.type = 'button';

      if (isGivenCell(row, col)) {
        cell.classList.add('fixed');
      }

      if (idx === selectedIndex) {
        cell.classList.add('selected');
        if (memoMode) {
          cell.classList.add('memo-active');
        }
      }

      if (value === 0) {
        cell.append(renderNotes(row, col));
      } else {
        const valueEl = document.createElement('span');
        valueEl.className = 'cell-value';
        valueEl.textContent = String(value);
        cell.append(valueEl);
      }

      cell.addEventListener('click', () => selectCell(idx));
      boardEl.append(cell);
    }
  }
}

function selectCell(index) {
  selectedIndex = index;
  renderBoard();
  validateConflicts();
}

function toggleMemoMode() {
  memoMode = !memoMode;
  memoButton.classList.toggle('active', memoMode);
  memoButton.classList.toggle('memo-button', true);
  memoButton.setAttribute('aria-pressed', String(memoMode));
  memoButton.textContent = memoMode ? 'メモ ON' : 'メモ OFF';
  renderBoard();
  validateConflicts();
  showMessage(memoMode ? 'メモ入力モードです。数字で候補を記録できます。' : '通常入力モードに戻りました。');
}

function toggleNote(number) {
  const row = Math.floor(selectedIndex / 9);
  const col = selectedIndex % 9;

  if (isGivenCell(row, col)) {
    showMessage('固定マスにはメモできません。', 'error');
    return;
  }

  if (puzzle[row][col] !== 0) {
    showMessage('数字が入っているマスは先に消してからメモしてください。', 'error');
    return;
  }

  const cellNotes = notes[row][col];
  if (number === 0) {
    cellNotes.clear();
  } else if (cellNotes.has(number)) {
    cellNotes.delete(number);
  } else {
    cellNotes.add(number);
  }

  renderBoard();
  validateConflicts();
  showMessage(number === 0 ? 'メモを消しました。' : `候補 ${number} を${cellNotes.has(number) ? '追加' : '削除'}しました。`);
}

function setCell(number) {
  const row = Math.floor(selectedIndex / 9);
  const col = selectedIndex % 9;

  if (isGivenCell(row, col)) {
    showMessage('固定マスは変更できません。', 'error');
    return;
  }

  if (memoMode) {
    toggleNote(number);
    return;
  }

  puzzle[row][col] = number;
  if (number !== 0) {
    clearNotes(row, col);
  }

  renderBoard();
  validateConflicts();
  showMessage('');
}

function validateConflicts() {
  const cells = [...boardEl.querySelectorAll('.cell')];
  cells.forEach((cell) => cell.classList.remove('invalid'));

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = puzzle[row][col];
      if (value === 0) {
        continue;
      }
      if (value !== solution[row][col]) {
        const idx = row * 9 + col;
        cells[idx].classList.add('invalid');
      }
    }
  }
}

function checkAnswer() {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row][col] !== solution[row][col]) {
        showMessage('まだ間違いがあります。赤い数字を直してみましょう。', 'error');
        validateConflicts();
        return;
      }
    }
  }

  showMessage('クリア！おめでとうございます 🎉', 'ok');
}

function newGame() {
  showMessage('問題を作成中...');
  const solved = createSolvedGrid();
  solution = solved;
  puzzle = createPuzzleFromSolution(solved, blanksByDifficulty[difficultyEl.value]);
  givens = puzzle.map((row) => row.map((cell) => cell !== 0));
  notes = createEmptyNotes();

  const firstOpen = puzzle.flat().findIndex((cell) => cell === 0);
  selectedIndex = firstOpen === -1 ? 0 : firstOpen;

  renderBoard();
  validateConflicts();
  showMessage('新しい問題を作成しました。');
}

function solvePuzzle() {
  puzzle = cloneGrid(solution);
  notes = createEmptyNotes();
  renderBoard();
  validateConflicts();
  showMessage('自動で解きました。', 'ok');
}

numberPadButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setCell(Number(button.dataset.number));
  });
});

memoButton.classList.add('memo-button');
memoButton.addEventListener('click', toggleMemoMode);
document.getElementById('new-game').addEventListener('click', newGame);
document.getElementById('check').addEventListener('click', checkAnswer);
document.getElementById('solve').addEventListener('click', solvePuzzle);

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLSelectElement) {
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    setCell(Number(event.key));
  }
  if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
    setCell(0);
  }
  if (event.key === 'm' || event.key === 'M') {
    toggleMemoMode();
  }
  if (event.key === 'ArrowRight') {
    selectCell((selectedIndex + 1) % 81);
  }
  if (event.key === 'ArrowLeft') {
    selectCell((selectedIndex + 80) % 81);
  }
  if (event.key === 'ArrowUp') {
    selectCell((selectedIndex + 72) % 81);
  }
  if (event.key === 'ArrowDown') {
    selectCell((selectedIndex + 9) % 81);
  }
});

newGame();
