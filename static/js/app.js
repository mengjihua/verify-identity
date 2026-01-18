document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultBox = document.getElementById('result');
    const inputDisplay = document.getElementById('inputDisplay');
    const resultDisplay = document.getElementById('resultDisplay');
    const methodDisplay = document.getElementById('methodDisplay');
    const copyBtn = document.getElementById('copyBtn');
    const resultStatus = document.getElementById('resultStatus');
    const suggestionsBox = document.getElementById('suggestions');
    const themeToggle = document.getElementById('themeToggle');
    const captchaInput = document.getElementById('captchaInput');
    const captchaModal = document.getElementById('captchaModal');
    const captchaModalClose = document.getElementById('captchaModalClose');
    const captchaSubmitBtn = document.getElementById('captchaSubmit');
    const captchaError = document.getElementById('captchaError');
    const openCaptchaBtn = document.getElementById('openCaptchaBtn');
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const helpClose = document.getElementById('helpClose');
    const particleField = document.getElementById('particleField');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistory');
    const exportHistoryBtn = document.getElementById('exportHistory');
    const luckyBtn = document.getElementById('luckyBtn');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageIndicator = document.getElementById('pageIndicator');

    const PAGE_SIZE = 5;
    const HISTORY_LIMIT = 30;
    const SUGGESTION_LIMIT = 5;
    const THEME_KEY = 'identity-theme';
    const PARTICLE_COUNT = 14;
    let currentPage = 1;
    let pendingInput = null;
    let lastCaptcha = '';

    const samples = [
        '没计划', '梦计划', '孙悟空', '猪八戒', '沙僧', '唐三藏', '哪吒', '杨戬', '嫦娥', '牛魔王', '红孩儿'
    ];
    const history = loadHistory();

    initTheme();
    initParticles();
    // Captcha is provided out-of-band; no auto-fetch on load

    renderHistory();

    // 搜索按钮点击事件
    searchBtn.addEventListener('click', () => performSearch());

    // 回车键搜索
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // 全局快捷键：Ctrl/Cmd + K 聚焦输入
    document.addEventListener('keydown', (e) => {
        const isMac = navigator.platform.toLowerCase().includes('mac');
        if ((isMac ? e.metaKey : e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });

    // 输入联想
    searchInput.addEventListener('input', () => {
        const val = searchInput.value.trim();
        showSuggestions(val);
    });

    searchInput.addEventListener('focus', () => {
        const val = searchInput.value.trim();
        showSuggestions(val);
    });

    document.addEventListener('click', (e) => {
        if (!suggestionsBox) return;
        if (!suggestionsBox.contains(e.target) && e.target !== searchInput) {
            suggestionsBox.classList.add('hidden');
        }
    });

    // 随机体验
    luckyBtn.addEventListener('click', () => {
        const pick = samples[Math.floor(Math.random() * samples.length)];
        performSearch(pick);
    });

    if (openCaptchaBtn) {
        openCaptchaBtn.addEventListener('click', () => {
            openCaptchaModal(searchInput.value.trim());
        });
    }

    if (captchaModalClose) {
        captchaModalClose.addEventListener('click', () => {
            pendingInput = null;
            closeCaptchaModal();
        });
    }

    if (captchaSubmitBtn) {
        captchaSubmitBtn.addEventListener('click', handleCaptchaSubmit);
    }

    if (captchaInput) {
        captchaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleCaptchaSubmit();
            }
        });
    }

    // 清空历史
    clearHistoryBtn.addEventListener('click', function() {
        history.length = 0;
        currentPage = 1;
        renderHistory();
        saveHistory();
    });

    if (exportHistoryBtn) {
        exportHistoryBtn.addEventListener('click', () => {
            if (!history.length) {
                alert('暂无可导出的记录');
                return;
            }
            const header = ['输入', '结果', '命中方式', '时间'];
            const rows = history.map(item => [
                item.input,
                item.result,
                item.method === 'alias' ? '规则匹配' : '智能分配',
                item.timestamp ? new Date(item.timestamp).toISOString() : ''
            ]);
            const csv = [header, ...rows]
                .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
                .join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `identity-history-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // 分页按钮
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage -= 1;
            renderHistory();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
        if (currentPage < totalPages) {
            currentPage += 1;
            renderHistory();
        }
    });

    // 主题切换
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const next = document.body.classList.contains('light') ? 'dark' : 'light';
            applyTheme(next);
        });
    }

    // 帮助弹窗
    if (helpBtn && helpModal && helpClose) {
        helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
        helpClose.addEventListener('click', () => helpModal.classList.add('hidden'));
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) helpModal.classList.add('hidden');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') helpModal.classList.add('hidden');
        });
    }

    function performSearch(prefill, providedCaptcha) {
        const input = typeof prefill === 'string' ? prefill : searchInput.value.trim();
        
        if (!input) {
            alert('请输入名字或别名');
            return;
        }

        const captchaVal = (typeof providedCaptcha === 'string' ? providedCaptcha : lastCaptcha || '').trim();
        if (!captchaVal) {
            openCaptchaModal(input);
            return;
        }

        if (suggestionsBox) {
            suggestionsBox.classList.add('hidden');
        }

        toggleLoading(true);

        fetch('/api/identify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input: input, captcha: captchaVal })
        })
        .then(async response => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data.error) {
                throw new Error(data.error || '查询失败');
            }
            displayResult(data.input, data.result, data.method);
            searchInput.value = '';
            searchInput.focus();
            if (captchaInput) captchaInput.value = '';
            lastCaptcha = captchaVal;
            pendingInput = null;
            closeCaptchaModal();
        })
        .catch(error => {
            console.error('Error:', error);
            const msg = error.message || '查询失败，请重试';
            if (msg.includes('验证码')) {
                lastCaptcha = '';
                pendingInput = input;
                const modalHidden = captchaModal && captchaModal.classList.contains('hidden');
                if (modalHidden) {
                    openCaptchaModal(input);
                }
                showCaptchaError(msg);
                if (captchaInput) captchaInput.focus();
            } else {
                alert(msg);
                closeCaptchaModal();
            }
        })
        .finally(() => {
            toggleLoading(false);
        });
    }

    function displayResult(input, result, method) {
        inputDisplay.textContent = `查询: ${input}`;
        resultDisplay.textContent = result;
        if (methodDisplay) {
            const methodLabel = method === 'alias' ? '规则匹配' : '智能分配';
            methodDisplay.textContent = `命中方式: ${methodLabel}`;
            methodDisplay.classList.remove('hidden');
        }
        resultBox.classList.remove('hidden');
        resultBox.classList.add('fade-in');
        addToHistory({ input, result, method });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const text = resultDisplay.textContent || '';
            if (!text) return;
            try {
                await navigator.clipboard.writeText(text);
                copyBtn.textContent = '已复制';
                setTimeout(() => (copyBtn.textContent = '复制结果'), 1200);
            } catch (e) {
                console.warn('Copy failed', e);
            }
        });
    }

    function addToHistory(item) {
        // 去重：相同输入放到最前
        const dupIndex = history.findIndex(h => h.input === item.input);
        if (dupIndex !== -1) {
            history.splice(dupIndex, 1);
        }
        history.unshift({ ...item, timestamp: Date.now() });
        if (history.length > HISTORY_LIMIT) {
            history.pop();
        }
        currentPage = 1;
        renderHistory();
        saveHistory();
    }

    function renderHistory() {
        if (!historyList) return;
        const totalItems = history.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;

        if (totalItems === 0) {
            historyList.textContent = '暂无记录';
            historyList.classList.add('empty-state');
            updatePagination(0, 0);
            return;
        }

        historyList.classList.remove('empty-state');
        historyList.innerHTML = '';

        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageItems = history.slice(start, end);

        const today = [];
        const earlier = [];
        pageItems.forEach(item => {
            (isToday(item.timestamp) ? today : earlier).push(item);
        });

        const groups = [
            { label: '今日', items: today },
            { label: '更早', items: earlier }
        ];

        groups.forEach(group => {
            if (!group.items.length) return;
            const header = document.createElement('div');
            header.className = 'history-group-title';
            header.textContent = group.label;
            historyList.appendChild(header);

            group.items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'history-card';
                card.addEventListener('click', () => performSearch(item.input));

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'history-delete';
                deleteBtn.textContent = '×';
                deleteBtn.title = '删除此记录';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = history.findIndex(h => h.input === item.input && h.result === item.result && h.method === item.method && h.timestamp === item.timestamp);
                    if (idx !== -1) {
                        history.splice(idx, 1);
                        if ((currentPage - 1) * PAGE_SIZE >= history.length && currentPage > 1) {
                            currentPage -= 1;
                        }
                        renderHistory();
                        saveHistory();
                    }
                });

                const title = document.createElement('div');
                title.className = 'history-title';
                title.textContent = item.result;

                const desc = document.createElement('div');
                desc.className = 'history-desc';
                desc.textContent = `${item.input}`;

                const meta = document.createElement('div');
                meta.className = 'history-meta';
                const methodLabel = item.method === 'alias' ? '规则匹配' : '智能分配';
                const badge = document.createElement('span');
                badge.className = `method-badge ${item.method === 'alias' ? 'alias' : 'fallback'}`;
                badge.textContent = methodLabel;
                meta.appendChild(badge);

                const timeText = document.createElement('span');
                timeText.className = 'history-time';
                timeText.textContent = formatTime(item.timestamp);
                meta.appendChild(timeText);

                card.appendChild(deleteBtn);
                card.appendChild(title);
                card.appendChild(desc);
                card.appendChild(meta);
                historyList.appendChild(card);
            });
        });

        updatePagination(currentPage, totalPages);
    }

    function toggleLoading(loading) {
        if (loading) {
            searchBtn.disabled = true;
            luckyBtn.disabled = true;
            searchBtn.textContent = '查询中...';
            resultBox.classList.add('loading');
            if (resultStatus) {
                resultStatus.textContent = '查询中...';
                resultStatus.classList.remove('hidden');
            }
        } else {
            searchBtn.disabled = false;
            luckyBtn.disabled = false;
            searchBtn.textContent = '查询';
            resultBox.classList.remove('loading');
            if (resultStatus) {
                resultStatus.classList.add('hidden');
            }
        }
    }

    function updatePagination(page, totalPages) {
        if (!pageIndicator) return;
        pageIndicator.textContent = `${totalPages === 0 ? 0 : page} / ${totalPages}`;
        if (prevPageBtn) prevPageBtn.disabled = page <= 1 || totalPages === 0;
        if (nextPageBtn) nextPageBtn.disabled = page >= totalPages || totalPages === 0;
    }

    function saveHistory() {
        try {
            localStorage.setItem('identity-history', JSON.stringify(history));
        } catch (e) {
            console.warn('Cannot save history', e);
        }
    }

    function loadHistory() {
        try {
            const raw = localStorage.getItem('identity-history');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.slice(0, HISTORY_LIMIT).map(item => ({
                        ...item,
                        timestamp: item.timestamp || Date.now()
                    }));
                }
            }
        } catch (e) {
            console.warn('Cannot load history', e);
        }
        return [];
    }

    function showSuggestions(query) {
        if (!suggestionsBox) return;
        const trimmed = query.trim();
        if (!trimmed) {
            suggestionsBox.classList.add('hidden');
            suggestionsBox.innerHTML = '';
            return;
        }
        const pool = buildSuggestionPool();
        const lower = trimmed.toLowerCase();
        const matches = pool.filter(item => item.toLowerCase().includes(lower) && item !== trimmed).slice(0, SUGGESTION_LIMIT);
        if (!matches.length) {
            suggestionsBox.classList.add('hidden');
            suggestionsBox.innerHTML = '';
            return;
        }
        suggestionsBox.innerHTML = '';
        matches.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-item';
            btn.textContent = text;
            btn.addEventListener('click', () => {
                searchInput.value = text;
                suggestionsBox.classList.add('hidden');
                performSearch(text);
            });
            suggestionsBox.appendChild(btn);
        });
        suggestionsBox.classList.remove('hidden');
    }

    function buildSuggestionPool() {
        const set = new Set();
        history.forEach(h => set.add(h.input));
        samples.forEach(s => set.add(s));
        return Array.from(set);
    }

    function isToday(timestamp) {
        const d = new Date(timestamp);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    }

    function formatTime(timestamp) {
        const d = new Date(timestamp);
        const pad = (n) => (n < 10 ? `0${n}` : n);
        return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function initTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        const initial = saved === 'light' ? 'light' : 'dark';
        applyTheme(initial);
    }

    function openCaptchaModal(input) {
        pendingInput = input || '';
        if (!captchaModal) return;
        captchaModal.classList.remove('hidden');
        hideCaptchaError();
        if (captchaInput) {
            captchaInput.value = '';
            setTimeout(() => captchaInput.focus(), 30);
        }
    }

    function closeCaptchaModal() {
        if (!captchaModal) return;
        captchaModal.classList.add('hidden');
    }

    function handleCaptchaSubmit() {
        if (!captchaInput) return;
        const val = captchaInput.value.trim();
        if (!val) {
            showCaptchaError('请输入验证码');
            captchaInput.focus();
            return;
        }
        const queued = pendingInput || searchInput.value.trim();
        if (!queued) {
            showCaptchaError('请输入查询内容');
            return;
        }
        performSearch(queued, val);
    }

    function showCaptchaError(msg) {
        if (!captchaError) return;
        captchaError.textContent = msg;
        captchaError.classList.remove('hidden');
    }

    function hideCaptchaError() {
        if (!captchaError) return;
        captchaError.classList.add('hidden');
    }

    function applyTheme(theme) {
        document.body.classList.toggle('light', theme === 'light');
        localStorage.setItem(THEME_KEY, theme);
        if (themeToggle) {
            themeToggle.textContent = theme === 'light' ? '🌙 切换到深色' : '🌗 切换主题';
        }
    }

    function initParticles() {
        if (!particleField) return;
        const colors = ['#7B61FF', '#41B8FF'];
        const particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const dot = document.createElement('span');
            dot.className = 'particle';
            const size = 4 + Math.random() * 4;
            dot.style.width = `${size}px`;
            dot.style.height = `${size}px`;
            dot.style.background = colors[i % 2];
            dot.style.left = `${Math.random() * 100}%`;
            dot.style.top = `${Math.random() * 100}%`;
            dot.style.animationDuration = `${8 + Math.random() * 6}s`;
            dot.style.animationDelay = `${Math.random() * 2}s`;
            particleField.appendChild(dot);
            particles.push(dot);
        }

        const handleMouse = (e) => {
            const rect = particleField.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;
            const x = relX / rect.width - 0.5;
            const y = relY / rect.height - 0.5;
            particleField.style.setProperty('--mx', x.toFixed(2));
            particleField.style.setProperty('--my', y.toFixed(2));

            particles.forEach(dot => {
                const dx = relX - dot.offsetLeft;
                const dy = relY - dot.offsetTop;
                const dist = Math.hypot(dx, dy) / Math.max(rect.width, rect.height);
                const proximity = Math.max(0, 0.28 - dist);
                const scale = 1 + proximity * 1.2;
                const bright = 1 + proximity * 1.2;
                dot.style.setProperty('--p-scale', scale.toFixed(2));
                dot.style.setProperty('--p-bright', bright.toFixed(2));
                dot.style.opacity = (0.45 + proximity * 0.35).toFixed(2);
            });
        };

        document.addEventListener('mousemove', handleMouse);
        particleField.addEventListener('mouseleave', () => {
            particles.forEach(dot => {
                dot.style.removeProperty('--p-scale');
                dot.style.removeProperty('--p-bright');
                dot.style.opacity = '';
            });
        });
    }

    function initPopularList() {}
});
