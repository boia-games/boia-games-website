// ---------- theme toggle ----------
const root = document.documentElement;
const toggleBtn = document.getElementById('themeToggle');
const lightLabel = toggleBtn.querySelector('[data-theme-label="light"]');
const darkLabel = toggleBtn.querySelector('[data-theme-label="dark"]');

function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
        darkLabel.innerHTML = '<b>dark</b>';
        lightLabel.innerHTML = 'light';
    } else {
        lightLabel.innerHTML = '<b>light</b>';
        darkLabel.innerHTML = 'dark';
    }
}

// initial: saved preference, else system, else light
let saved = null;
try { saved = localStorage.getItem('boia-theme'); } catch (e) { }
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(saved || (prefersDark ? 'dark' : 'light'));

toggleBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('boia-theme', next); } catch (e) { }
});

// follow system changes only if the user hasn't picked one yet
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    let s = null; try { s = localStorage.getItem('boia-theme'); } catch (err) { }
    if (!s) applyTheme(e.matches ? 'dark' : 'light');
});

// ---------- sway sections on scroll ----------
const sections = document.querySelectorAll('section');
const logoBox = document.getElementById('logoBox');

function sway() {
    const vh = window.innerHeight;
    sections.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const off = (center - vh / 2) / vh; // -1..1 roughly
        const dir = (i % 2 === 0) ? -1 : 1;
        const x = dir * off * 10;
        const rot = dir * off * 0.8;
        s.style.transform = `translateX(${x.toFixed(2)}px) rotate(${rot.toFixed(3)}deg)`;
    });

    // logo gets a slow rotational wobble tied to scroll
    const sy = window.scrollY;
    if (logoBox) {
        const a = -1.5 + Math.sin(sy / 110) * 1.6;
        const tx = Math.sin(sy / 220) * 4;
        logoBox.style.transform = `translateX(${tx.toFixed(2)}px) rotate(${a.toFixed(2)}deg)`;
    }
}
window.addEventListener('scroll', sway, { passive: true });
window.addEventListener('resize', sway);
sway();

// ---------- ascii rain in margins ----------
// rain only exists on pages that include #rainL / #rainR (currently the homepage).
// guard everything so the rest of the script still runs on pages without it.
const chars = "+.*-~`'°·:;|/\\><";
function makeRain(el, density) {
    if (!el) return;
    const lines = 120;
    const cols = 4;
    let out = "";
    for (let i = 0; i < lines; i++) {
        let line = "";
        for (let j = 0; j < cols; j++) {
            line += Math.random() < density
                ? chars[Math.floor(Math.random() * chars.length)]
                : " ";
        }
        out += line + "\n";
    }
    el.textContent = out;
}
const rainL = document.getElementById('rainL');
const rainR = document.getElementById('rainR');
makeRain(rainL, 0.28);
makeRain(rainR, 0.22);

function driftRain() {
    if (!rainL && !rainR) return;
    const sy = window.scrollY;
    if (rainL) rainL.style.transform = `translateY(${(-sy * 0.35).toFixed(1)}px)`;
    if (rainR) rainR.style.transform = `translateY(${(-sy * 0.55).toFixed(1)}px)`;
}
window.addEventListener('scroll', driftRain, { passive: true });

// re-shuffle the rain occasionally so it feels alive but not noisy
if (rainL || rainR) {
    setInterval(() => {
        makeRain(rainL, 0.28);
        makeRain(rainR, 0.22);
    }, 4200);
}

// ---------- cursor trail ----------
let lastTrail = 0;
const trailChars = ['.', '·', '+', '*', '~'];
document.addEventListener('mousemove', (e) => {
    const now = performance.now();
    if (now - lastTrail < 55) return;
    lastTrail = now;
    const t = document.createElement('span');
    t.className = 'trail';
    t.textContent = trailChars[Math.floor(Math.random() * trailChars.length)];
    t.style.left = (e.clientX + (Math.random() * 8 - 4)) + 'px';
    t.style.top = (e.clientY + (Math.random() * 8 - 4)) + 'px';
    document.body.appendChild(t);
    requestAnimationFrame(() => {
        t.style.opacity = '0';
        t.style.transform = `translateY(${(8 + Math.random() * 10).toFixed(1)}px)`;
    });
    setTimeout(() => t.remove(), 750);
});

// ---------- last touched stamp ----------
const d = new Date(document.lastModified || Date.now());
const pad = n => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const el = document.getElementById('stamp');
if (el) el.textContent = `last touched — ${stamp}`;

// ---------- tiny easter egg: type "boia" anywhere ----------
let buf = "";
document.addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    buf = (buf + e.key).slice(-4).toLowerCase();
    if (buf === 'boia') {
        const ghost = document.createElement('div');
        ghost.textContent = 'x_x';
        Object.assign(ghost.style, {
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) rotate(-6deg)',
            fontSize: '120px',
            fontFamily: 'monospace',
            color: 'var(--ink)',
            zIndex: 10000,
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });
        document.body.appendChild(ghost);
        requestAnimationFrame(() => { ghost.style.opacity = '1'; });
        setTimeout(() => { ghost.style.opacity = '0'; }, 1200);
        setTimeout(() => ghost.remove(), 1700);
        buf = "";
    }
});

// respect reduced motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.removeEventListener('scroll', sway);
    window.removeEventListener('scroll', driftRain);
    sections.forEach(s => s.style.transform = '');
    if (logoBox) logoBox.style.transform = '';
}

// ---------- drag-and-drop scribble posts ----------
// each <details.scribble-item> can be dragged both collapsed and expanded.
// summary click still toggles; only true pointer movement starts a drag.
const scribbleItems = Array.from(document.querySelectorAll('.scribble-item'));
const scribblePosKey = `boia-scribble-pos:${window.location.pathname}`;
let scribblePosStore = {};
try {
    const raw = localStorage.getItem(scribblePosKey);
    scribblePosStore = raw ? JSON.parse(raw) : {};
} catch (_) {
    scribblePosStore = {};
}

function saveScribblePositions() {
    try { localStorage.setItem(scribblePosKey, JSON.stringify(scribblePosStore)); } catch (_) { }
}

function updatePageBounds() {
    if (!scribbleItems.length) return;
    let maxBottom = 0;
    scribbleItems.forEach(item => {
        const rect = item.getBoundingClientRect();
        const bottom = rect.bottom + window.scrollY;
        if (bottom > maxBottom) maxBottom = bottom;
    });
    
    let spacer = document.getElementById('scribble-spacer');
    if (!spacer) {
        spacer = document.createElement('div');
        spacer.id = 'scribble-spacer';
        spacer.style.position = 'absolute';
        spacer.style.left = '0';
        spacer.style.width = '1px';
        spacer.style.height = '1px';
        spacer.style.pointerEvents = 'none';
        document.body.appendChild(spacer);
    }
    spacer.style.top = `${maxBottom + 200}px`;
    window.dispatchEvent(new Event('resize'));
}

// Call on load after elements are laid out
window.addEventListener('load', updatePageBounds);
setTimeout(updatePageBounds, 100);

scribbleItems.forEach((item, index) => {
    const itemId = item.dataset.postId || item.querySelector('.s-date')?.textContent?.trim() || `item-${index}`;
    item.dataset.postId = itemId;
    const savedPos = scribblePosStore[itemId];
    if (savedPos) {
        item.style.setProperty('--dx', `${savedPos.dx || 0}px`);
        item.style.setProperty('--dy', `${savedPos.dy || 0}px`);
    }

    let active = false;
    let moved = false;
    let startPx = 0, startPy = 0;
    let baseDx = 0, baseDy = 0;
    let pointerType = 'mouse';
    let pointerId = null;
    let dragStartTarget = null;

    item.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.target.closest('a')) return;
        if (!e.target.closest('summary') && !e.target.closest('.ascii-frame')) return;

        active = true;
        moved = false;
        pointerId = e.pointerId;
        pointerType = e.pointerType || 'mouse';
        dragStartTarget = e.target.closest('summary') || e.target.closest('.ascii-frame') || item;
        startPx = e.pageX;
        startPy = e.pageY;
        baseDx = parseFloat(item.style.getPropertyValue('--dx')) || 0;
        baseDy = parseFloat(item.style.getPropertyValue('--dy')) || 0;
        item.classList.add('no-toggle');
        item.style.touchAction = 'none';
        try { dragStartTarget.setPointerCapture(pointerId); } catch (_) { }
    });

    item.addEventListener('pointermove', (e) => {
        if (!active || e.pointerId !== pointerId) return;
        const moveX = e.pageX - startPx;
        const moveY = e.pageY - startPy;

        const threshold = (pointerType === 'touch') ? 10 : (pointerType === 'pen' ? 7 : 4);
        if (!moved && (Math.abs(moveX) > threshold || Math.abs(moveY) > threshold)) {
            moved = true;
            item.classList.add('dragging');
        }
        if (!moved) return;

        item.style.setProperty('--dx', (baseDx + moveX) + 'px');
        item.style.setProperty('--dy', (baseDy + moveY) + 'px');
        e.preventDefault();
    });

    function endDrag(e) {
        if (!active || e.pointerId !== pointerId) return;
        if (moved) {
            // prevent this pointerup from also triggering summary toggle click
            item.dataset.suppressSummaryClick = '1';
            setTimeout(() => { delete item.dataset.suppressSummaryClick; }, 0);
            const dx = parseFloat(item.style.getPropertyValue('--dx')) || 0;
            const dy = parseFloat(item.style.getPropertyValue('--dy')) || 0;
            scribblePosStore[itemId] = { dx, dy };
            saveScribblePositions();
            updatePageBounds();
            const posStatus = document.getElementById('drawSavedStatus');
            if (posStatus) {
                posStatus.textContent = 'position saved';
                posStatus.classList.add('show');
                setTimeout(() => posStatus.classList.remove('show'), 1000);
            }
        }
        active = false;
        moved = false;
        item.classList.remove('dragging');
        item.classList.remove('no-toggle');
        item.style.touchAction = '';
        try { dragStartTarget.releasePointerCapture(pointerId); } catch (_) { }
        pointerId = null;
        dragStartTarget = null;
    }

    item.addEventListener('pointerup', endDrag);
    item.addEventListener('pointercancel', endDrag);

    const summary = item.querySelector('summary');
    if (summary) {
        summary.addEventListener('click', (e) => {
            if (item.dataset.suppressSummaryClick === '1') {
                e.preventDefault();
                e.stopPropagation();
            } else {
                setTimeout(updatePageBounds, 50);
            }
        });
    }
});

// ---------- scribbles draw overlay ----------
const drawCanvas = document.getElementById('drawCanvas');
const drawToolbar = document.getElementById('drawToolbar');
if (drawCanvas && drawToolbar) {
    const drawKey = `boia-scribble-drawing:${window.location.pathname}`;
    const ctx = drawCanvas.getContext('2d');
    const qs = (id) => document.getElementById(id);
    const savedStatus = qs('drawSavedStatus');
    let savedTimer = null;

    let mode = 'off';
    let color = 'black';
    let size = 10;
    let drawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentStroke = null;
    let strokes = [];

    function flashSaved(text = 'saved') {
        if (!savedStatus) return;
        savedStatus.textContent = text;
        savedStatus.classList.add('show');
        if (savedTimer) clearTimeout(savedTimer);
        savedTimer = setTimeout(() => {
            savedStatus.classList.remove('show');
        }, 1000);
    }

    function colorValue(c) {
        if (c === 'red') return '#c31432';
        return root.getAttribute('data-theme') === 'dark' ? '#f4f4f4' : '#161616';
    }

    function resizeCanvas() {
        drawCanvas.style.display = 'none';
        const ratio = window.devicePixelRatio || 1;
        const w = document.documentElement.scrollWidth;
        const h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
        drawCanvas.style.display = 'block';

        drawCanvas.width = Math.floor(w * ratio);
        drawCanvas.height = Math.floor(h * ratio);
        drawCanvas.style.width = `${w}px`;
        drawCanvas.style.height = `${h}px`;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.imageSmoothingEnabled = false;
        renderAll();
    }

    function saveDrawing() {
        try {
            localStorage.setItem(drawKey, JSON.stringify(strokes));
            flashSaved('scribble saved');
        } catch (_) { }
    }

    function restoreDrawing() {
        let raw = null;
        try { raw = localStorage.getItem(drawKey); } catch (_) { raw = null; }
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) strokes = parsed;
        } catch (_) {
            strokes = [];
        }
        renderAll();
    }

    function setTooling() {
        drawCanvas.style.pointerEvents = mode === 'off' ? 'none' : 'auto';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = size;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colorValue(color);
        ctx.globalAlpha = 0.92;

        const states = [
            ['drawPen', mode === 'pen'],
            ['drawEraser', mode === 'eraser'],
            ['drawBlack', color === 'black'],
            ['drawRed', color === 'red'],
            ['drawThin', size === 6],
            ['drawMid', size === 10],
            ['drawThick', size === 16]
        ];
        states.forEach(([id, on]) => {
            const elBtn = qs(id);
            if (elBtn) elBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function drawStroke(stroke) {
        if (!stroke || !stroke.points || stroke.points.length < 2) return;
        const points = stroke.points;
        const roughness = Math.max(1.1, stroke.size * 0.08);
        const ink = colorValue(stroke.color);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.92;
        ctx.lineWidth = stroke.size;
        ctx.strokeStyle = ink;
        for (let pass = 0; pass < 2; pass++) {
            const ox = (pass === 0 ? -0.5 : 0.5) * roughness;
            const oy = (pass === 0 ? 0.3 : -0.3) * roughness;
            ctx.beginPath();
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                const wobbleX = Math.sin(i * 0.65 + pass) * roughness * 0.15;
                const wobbleY = Math.cos(i * 0.5 + pass) * roughness * 0.15;
                const x = p.x + ox + wobbleX;
                const y = p.y + oy + wobbleY;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    function renderAll() {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        strokes.forEach(drawStroke);
    }

    function pointToSegmentDistance(px, py, ax, ay, bx, by) {
        const abx = bx - ax;
        const aby = by - ay;
        const apx = px - ax;
        const apy = py - ay;
        const abLenSq = abx * abx + aby * aby || 1;
        let t = (apx * abx + apy * aby) / abLenSq;
        t = Math.max(0, Math.min(1, t));
        const cx = ax + abx * t;
        const cy = ay + aby * t;
        const dx = px - cx;
        const dy = py - cy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function strokeTouched(stroke, x, y, threshold) {
        if (!stroke.points || stroke.points.length < 2) return false;
        for (let i = 1; i < stroke.points.length; i++) {
            const a = stroke.points[i - 1];
            const b = stroke.points[i];
            if (pointToSegmentDistance(x, y, a.x, a.y, b.x, b.y) <= threshold) return true;
        }
        return false;
    }

    function eraseAt(x, y) {
        const before = strokes.length;
        strokes = strokes.filter((stroke) => {
            const threshold = Math.max(8, stroke.size * 0.9, size * 0.9);
            return !strokeTouched(stroke, x, y, threshold);
        });
        if (strokes.length !== before) {
            renderAll();
            saveDrawing();
        }
    }

    function beginDraw(e) {
        if (mode === 'off') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        drawing = true;
        lastX = e.pageX;
        lastY = e.pageY;
        if (mode === 'pen') {
            currentStroke = { color, size, points: [{ x: lastX, y: lastY }] };
            strokes.push(currentStroke);
        } else if (mode === 'eraser') {
            eraseAt(lastX, lastY);
        }
        drawCanvas.setPointerCapture(e.pointerId);
        e.preventDefault();
    }

    function moveDraw(e) {
        if (!drawing) return;
        const x = e.pageX;
        const y = e.pageY;
        if (mode === 'eraser') {
            eraseAt(x, y);
        } else {
            if (currentStroke) {
                currentStroke.points.push({ x, y });
                renderAll();
            }
        }
        lastX = x;
        lastY = y;
        e.preventDefault();
    }

    function endDraw(e) {
        if (!drawing) return;
        drawing = false;
        try { drawCanvas.releasePointerCapture(e.pointerId); } catch (_) { }
        if (mode === 'pen' && currentStroke && currentStroke.points.length < 2) {
            strokes.pop();
        }
        currentStroke = null;
        saveDrawing();
    }

    resizeCanvas();
    restoreDrawing();
    setTooling();
    window.addEventListener('resize', resizeCanvas);

    drawCanvas.addEventListener('pointerdown', beginDraw);
    drawCanvas.addEventListener('pointermove', moveDraw);
    drawCanvas.addEventListener('pointerup', endDraw);
    drawCanvas.addEventListener('pointercancel', endDraw);

    qs('drawPen')?.addEventListener('click', () => {
        mode = mode === 'pen' ? 'off' : 'pen';
        setTooling();
    });
    qs('drawEraser')?.addEventListener('click', () => {
        mode = mode === 'eraser' ? 'off' : 'eraser';
        setTooling();
    });
    qs('drawBlack')?.addEventListener('click', () => { color = 'black'; mode = 'pen'; setTooling(); });
    qs('drawRed')?.addEventListener('click', () => { color = 'red'; mode = 'pen'; setTooling(); });
    qs('drawThin')?.addEventListener('click', () => { size = 6; setTooling(); });
    qs('drawMid')?.addEventListener('click', () => { size = 10; setTooling(); });
    qs('drawThick')?.addEventListener('click', () => { size = 16; setTooling(); });
    qs('drawResetClear')?.addEventListener('click', () => {
        // clear drawing layer
        strokes = [];
        renderAll();
        try { localStorage.removeItem(drawKey); } catch (_) { }

        // reset draggable post offsets and fold
        scribbleItems.forEach((item) => {
            item.style.setProperty('--dx', '0px');
            item.style.setProperty('--dy', '0px');
            item.removeAttribute('open');
        });
        scribblePosStore = {};
        saveScribblePositions();
        updatePageBounds();
        flashSaved('reset done');
    });

    // keep black pen visible in dark mode too
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        renderAll();
    });
}