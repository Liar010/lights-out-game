class LightsOutGame {
    constructor() {
        this.gridSize = 5;
        this.board = [];
        this.initialBoard = [];
        this.moves = 0;
        this.level = 1;
        this.timer = 0;
        this.timerInterval = null;
        this.gameMode = 'classic';
        this.bestRecords = this.loadBestRecords();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createNewGame();
        this.updateBestRecords();
    }

    setupEventListeners() {
        document.getElementById('newGame').addEventListener('click', () => this.createNewGame());
        document.getElementById('reset').addEventListener('click', () => this.resetGame());
        document.getElementById('gridSize').addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
            this.createNewGame();
        });
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.gameMode = e.target.dataset.mode;
                this.updateModeDescription();
                this.createNewGame();
                this.updateBestRecords();
            });
        });

    }

    createNewGame() {
        this.stopTimer();
        this.moves = 0;
        this.board = this.generateBoard();
        this.initialBoard = this.board.map(row => [...row]);
        this.renderBoard();
        this.updateDisplay();
        this.startTimer();
    }

    generateBoard() {
        const board = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(false));
        
        const clickCount = Math.floor(Math.random() * (this.gridSize * this.gridSize)) + this.gridSize;
        const positions = [];
        
        for (let i = 0; i < clickCount; i++) {
            const row = Math.floor(Math.random() * this.gridSize);
            const col = Math.floor(Math.random() * this.gridSize);
            positions.push([row, col]);
        }
        
        positions.forEach(([row, col]) => {
            this.toggleLight(board, row, col);
        });
        
        const hasLights = board.some(row => row.some(cell => cell));
        if (!hasLights) {
            return this.generateBoard();
        }
        
        return board;
    }

    toggleLight(board, row, col) {
        const positions = [
            [row, col],
            [row - 1, col],
            [row + 1, col],
            [row, col - 1],
            [row, col + 1]
        ];
        
        positions.forEach(([r, c]) => {
            if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
                board[r][c] = !board[r][c];
            }
        });
    }

    renderBoard() {
        const boardElement = document.getElementById('gameBoard');
        boardElement.innerHTML = '';
        boardElement.className = `game-board size-${this.gridSize}`;
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = `cell ${this.board[row][col] ? 'on' : 'off'}`;
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                cell.addEventListener('click', () => this.handleCellClick(row, col));
                boardElement.appendChild(cell);
            }
        }
    }

    handleCellClick(row, col) {
        if (this.gameMode === 'perfect' && this.moves >= this.getMinMoves()) {
            this.showModal('手数制限', `このモードでは${this.getMinMoves()}手以内でクリアする必要があります！`);
            return;
        }
        
        this.toggleLight(this.board, row, col);
        this.moves++;
        this.renderBoard();
        this.updateDisplay();
        
        if (this.checkWin()) {
            this.handleWin();
        }
    }

    checkWin() {
        return this.board.every(row => row.every(cell => !cell));
    }

    handleWin() {
        this.stopTimer();
        this.level++;
        
        const currentTime = this.gameMode === 'timeAttack' ? 300 - this.timer : this.timer;
        
        this.saveBestRecord(currentTime);
        this.updateBestRecords();
        
        const message = `レベル ${this.level - 1} クリア！\n手数: ${this.moves}\nタイム: ${this.formatTime(currentTime)}`;
        this.showModal('クリア！', message);
        
        setTimeout(() => {
            this.createNewGame();
        }, 2000);
    }


    resetGame() {
        this.moves = 0;
        this.board = this.initialBoard.map(row => [...row]);
        this.renderBoard();
        this.updateDisplay();
    }

    updateModeDescription() {
        const descriptions = {
            classic: '通常モード：自分のペースでパズルを解く',
            timeAttack: '5分間でできるだけ多くクリアしよう！',
            perfect: `最小手数（${this.getMinMoves()}手）以内でクリアを目指す`
        };
        document.getElementById('modeDesc').textContent = descriptions[this.gameMode];
    }

    saveBestRecord(currentTime) {
        const key = `${this.gameMode}-${this.gridSize}`;
        const currentRecord = this.bestRecords[key];
        const currentScore = this.calculateScore(currentTime);
        
        if (!currentRecord || currentScore > currentRecord.score) {
            this.bestRecords[key] = {
                moves: this.moves,
                time: currentTime,
                score: currentScore,
                date: new Date().toISOString()
            };
            localStorage.setItem('lightsOutBestRecords', JSON.stringify(this.bestRecords));
        }
    }

    calculateScore(time) {
        const baseScore = 1000;
        const movePenalty = this.moves * 10;
        const timePenalty = time * 2;
        const sizeBonus = this.gridSize * 50;
        
        if (this.gameMode === 'perfect' && this.moves <= this.getMinMoves()) {
            return baseScore * 2 - timePenalty + sizeBonus;
        }
        
        return Math.max(0, baseScore - movePenalty - timePenalty + sizeBonus);
    }

    loadBestRecords() {
        const saved = localStorage.getItem('lightsOutBestRecords');
        return saved ? JSON.parse(saved) : {};
    }

    updateBestRecords() {
        const content = document.getElementById('bestRecordsContent');
        const modes = [
            { key: 'classic', label: 'クラシック' },
            { key: 'timeAttack', label: 'タイムアタック' },
            { key: 'perfect', label: 'パーフェクト' }
        ];
        const sizes = [3, 5, 7];
        
        const records = [];
        modes.forEach(mode => {
            sizes.forEach(size => {
                const key = `${mode.key}-${size}`;
                if (this.bestRecords[key]) {
                    records.push({
                        mode: mode.label,
                        size: size,
                        ...this.bestRecords[key]
                    });
                }
            });
        });
        
        if (records.length === 0) {
            content.innerHTML = '<div class="best-record-empty">まだ記録がありません</div>';
            return;
        }
        
        content.innerHTML = records.map(record => `
            <div class="best-record-item">
                <div class="best-record-mode">
                    <span class="mode-label">${record.mode}</span>
                    <span class="size-label">${record.size}×${record.size}</span>
                </div>
                <div class="best-record-score">
                    <span class="moves">${record.moves}手</span>
                    <span class="time">${this.formatTime(record.time)}</span>
                </div>
            </div>
        `).join('');
    }

    getMinMoves() {
        return Math.ceil(this.gridSize * this.gridSize / 3);
    }

    startTimer() {
        if (this.gameMode === 'timeAttack') {
            this.timer = 300; // 5分 = 300秒
            this.timerInterval = setInterval(() => {
                this.timer--;
                document.getElementById('timer').textContent = this.formatTime(this.timer);
                
                if (this.timer <= 0) {
                    this.stopTimer();
                    this.showModal('時間切れ！', `タイムアップ！\nクリア数: ${this.stats.totalClears}`);
                    this.stats.streak = 0;
                    this.saveStats();
                    this.createNewGame();
                }
            }, 1000);
        } else {
            this.timer = 0;
            this.timerInterval = setInterval(() => {
                this.timer++;
                document.getElementById('timer').textContent = this.formatTime(this.timer);
            }, 1000);
        }
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        document.getElementById('level').textContent = this.level;
        
        if (this.gameMode === 'perfect') {
            const remainingMoves = this.getMinMoves() - this.moves;
            document.getElementById('moves').textContent = `${this.moves} (残${Math.max(0, remainingMoves)})`;
        } else {
            document.getElementById('moves').textContent = this.moves;
        }
    }


    showModal(title, message) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        document.getElementById('modal').classList.add('active');
    }

    closeModal() {
        document.getElementById('modal').classList.remove('active');
    }

}

document.addEventListener('DOMContentLoaded', () => {
    const game = new LightsOutGame();
    game.updateModeDescription();
    game.updateBestRecords();
});