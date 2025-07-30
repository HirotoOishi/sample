class Timer {
    constructor() {
        // DOM要素の取得
        this.timeDisplay = document.getElementById('timeDisplay');
        this.minutesInput = document.getElementById('minutes');
        this.secondsInput = document.getElementById('seconds');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.progressRing = document.querySelector('.progress-ring-progress');
        this.container = document.querySelector('.container');

        // タイマーの状態管理
        this.isRunning = false;
        this.isPaused = false;
        this.totalSeconds = 0;
        this.currentSeconds = 0;
        this.timerInterval = null;

        // プログレスリングの設定
        this.radius = 130;
        this.circumference = 2 * Math.PI * this.radius;
        this.progressRing.style.strokeDasharray = this.circumference;

        // イベントリスナーの設定
        this.initEventListeners();
        
        // 初期値の設定
        this.updateDisplay();
        this.updateProgress();

        // 音声コンテキストの初期化
        this.initAudio();
    }

    initEventListeners() {
        // メインボタンのイベントリスナー
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());

        // 時間入力のイベントリスナー
        this.minutesInput.addEventListener('input', () => this.updateFromInputs());
        this.secondsInput.addEventListener('input', () => this.updateFromInputs());

        // プリセットボタンのイベントリスナー
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const minutes = parseInt(e.target.dataset.minutes);
                const seconds = parseInt(e.target.dataset.seconds);
                this.setTime(minutes, seconds);
            });
        });

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isRunning) {
                    this.pause();
                } else {
                    this.start();
                }
            } else if (e.code === 'Escape') {
                this.reset();
            }
        });
    }

    initAudio() {
        // 音声通知用のオーディオコンテキストの初期化
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    updateFromInputs() {
        if (!this.isRunning) {
            const minutes = parseInt(this.minutesInput.value) || 0;
            const seconds = parseInt(this.secondsInput.value) || 0;
            this.setTime(minutes, seconds);
        }
    }

    setTime(minutes, seconds) {
        this.minutesInput.value = minutes;
        this.secondsInput.value = seconds;
        this.totalSeconds = minutes * 60 + seconds;
        this.currentSeconds = this.totalSeconds;
        this.updateDisplay();
        this.updateProgress();
    }

    start() {
        if (this.currentSeconds <= 0) {
            this.updateFromInputs();
        }

        if (this.currentSeconds <= 0) {
            this.playNotificationSound('error');
            return;
        }

        this.isRunning = true;
        this.isPaused = false;
        
        // ボタンの状態更新
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.startBtn.textContent = '実行中...';

        // 入力フィールドを無効化
        this.minutesInput.disabled = true;
        this.secondsInput.disabled = true;

        this.timerInterval = setInterval(() => {
            this.currentSeconds--;
            this.updateDisplay();
            this.updateProgress();

            if (this.currentSeconds <= 0) {
                this.complete();
            }
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        this.isPaused = true;
        clearInterval(this.timerInterval);

        // ボタンの状態更新
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.startBtn.textContent = '再開';
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.timerInterval);

        // 入力値から時間を復元
        this.updateFromInputs();

        // ボタンの状態更新
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.startBtn.textContent = '開始';

        // 入力フィールドを有効化
        this.minutesInput.disabled = false;
        this.secondsInput.disabled = false;

        // アニメーションを削除
        this.container.classList.remove('timer-finished');
    }

    complete() {
        this.isRunning = false;
        clearInterval(this.timerInterval);

        // ボタンの状態更新
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.startBtn.textContent = '開始';

        // 入力フィールドを有効化
        this.minutesInput.disabled = false;
        this.secondsInput.disabled = false;

        // 完了アニメーション
        this.container.classList.add('timer-finished');

        // 音声通知
        this.playNotificationSound('complete');

        // ブラウザ通知
        this.showNotification();

        // 5秒後にアニメーションを停止
        setTimeout(() => {
            this.container.classList.remove('timer-finished');
        }, 5000);
    }

    updateDisplay() {
        const minutes = Math.floor(this.currentSeconds / 60);
        const seconds = this.currentSeconds % 60;
        this.timeDisplay.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateProgress() {
        if (this.totalSeconds === 0) {
            this.progressRing.style.strokeDashoffset = this.circumference;
            return;
        }

        const progress = (this.totalSeconds - this.currentSeconds) / this.totalSeconds;
        const offset = this.circumference - (progress * this.circumference);
        this.progressRing.style.strokeDashoffset = offset;

        // 残り時間に応じて色を変更
        if (progress > 0.8) {
            this.progressRing.style.stroke = '#f44336'; // 赤
        } else if (progress > 0.6) {
            this.progressRing.style.stroke = '#ff9800'; // オレンジ
        } else {
            this.progressRing.style.stroke = '#4CAF50'; // 緑
        }
    }

    playNotificationSound(type = 'complete') {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            if (type === 'complete') {
                // 完了音：上昇する音階
                const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
                frequencies.forEach((freq, index) => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    
                    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + index * 0.2);
                    osc.type = 'sine';
                    
                    gain.gain.setValueAtTime(0, this.audioContext.currentTime + index * 0.2);
                    gain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + index * 0.2 + 0.1);
                    gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + index * 0.2 + 0.4);
                    
                    osc.start(this.audioContext.currentTime + index * 0.2);
                    osc.stop(this.audioContext.currentTime + index * 0.2 + 0.4);
                });
            } else if (type === 'error') {
                // エラー音：低い音
                oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                oscillator.type = 'sawtooth';
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.3);
            }
        } catch (e) {
            console.warn('Could not play notification sound:', e);
        }
    }

    showNotification() {
        // ブラウザ通知の表示
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification('タイマー完了！', {
                    body: '設定した時間が経過しました。',
                    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40NzcgMiAyIDYuNDc3IDIgMTJTNi40NzcgMjIgMTIgMjJTMjIgMTcuNTIzIDIyIDEyUzE3LjUyMyAyIDEyIDJaIiBmaWxsPSIjNENBRjUwIi8+CjxwYXRoIGQ9Ik0xNiA5TDEwLjUgMTQuNUw4IDEyIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K'
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        this.showNotification();
                    }
                });
            }
        }

        // ページタイトルの点滅
        let originalTitle = document.title;
        let isFlashing = true;
        const flashInterval = setInterval(() => {
            document.title = isFlashing ? '⏰ タイマー完了！' : originalTitle;
            isFlashing = !isFlashing;
        }, 1000);

        // 10秒後にタイトルを元に戻す
        setTimeout(() => {
            clearInterval(flashInterval);
            document.title = originalTitle;
        }, 10000);
    }
}

// DOMが読み込まれたらタイマーを初期化
document.addEventListener('DOMContentLoaded', () => {
    new Timer();
    
    // 通知の許可を求める
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});