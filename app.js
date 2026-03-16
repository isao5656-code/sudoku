const boardEl = document.getElementById('board');
const difficultyEl = document.getElementById('difficulty');
const messageEl = document.getElementById('message');
const numberPadButtons = [...document.querySelectorAll('.number-pad button')];

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const blanksByDifficulty = {
  easy: 35,
  normal: 45,
  hard: 53,
};

let puzzle = [];
let solution = [];
let selectedIndex = 0;

function showMessage(text, type = '') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
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

      const fixed = value !== 0 && value === solution[row][col];
      if (fixed) {
        cell.classList.add('fixed');
      }

      if (idx === selectedIndex) {
        cell.classList.add('selected');
      }

      cell.textContent = value === 0 ? '' : String(value);
      cell.addEventListener('click', () => selectCell(idx));
      boardEl.append(cell);
    }
  }
}

function selectCell(index) {
  selectedIndex = index;
  renderBoard();
}

function setCell(number) {
  const row = Math.floor(selectedIndex / 9);
  const col = selectedIndex % 9;
  const current = puzzle[row][col];
  const isFixed = current !== 0 && current === solution[row][col];

  if (isFixed) {
    showMessage('固定マスは変更できません。', 'error');
    return;
  }

  puzzle[row][col] = number;
  renderBoard();
  validateConflicts();
  showMessage('');
}

function validateConflicts() {
  const cells = [...boardEl.querySelectorAll('.cell')];
  cells.forEach((cell) => cell.classList.remove('invalid'));

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const val = puzzle[row][col];
      if (val === 0) {
        continue;
      }
      if (val !== solution[row][col]) {
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

  const firstOpen = puzzle.flat().findIndex((cell) => cell === 0);
  selectedIndex = firstOpen === -1 ? 0 : firstOpen;

  renderBoard();
  validateConflicts();
  showMessage('新しい問題を作成しました。');
}

function solvePuzzle() {
  puzzle = cloneGrid(solution);
  renderBoard();
  showMessage('自動で解きました。', 'ok');
}

numberPadButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setCell(Number(button.dataset.number));
  });
});

document.getElementById('new-game').addEventListener('click', newGame);
document.getElementById('check').addEventListener('click', checkAnswer);
document.getElementById('solve').addEventListener('click', solvePuzzle);

document.addEventListener('keydown', (event) => {
  if (/^[1-9]$/.test(event.key)) {
    setCell(Number(event.key));
  }
  if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
    setCell(0);
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
