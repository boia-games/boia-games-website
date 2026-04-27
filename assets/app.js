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
const chars = "+.*-~`'°·:;|/\\><";
function makeRain(el, density) {
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
    const sy = window.scrollY;
    rainL.style.transform = `translateY(${(-sy * 0.35).toFixed(1)}px)`;
    rainR.style.transform = `translateY(${(-sy * 0.55).toFixed(1)}px)`;
}
window.addEventListener('scroll', driftRain, { passive: true });

// re-shuffle the rain occasionally so it feels alive but not noisy
setInterval(() => {
    makeRain(rainL, 0.28);
    makeRain(rainR, 0.22);
}, 4200);

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

// ---------- drag-and-drop scribble frames ----------
// each .ascii-frame can be grabbed and pushed around like a post-it note.
// position is stored on the element via --dx / --dy custom properties so it
// composes cleanly with the static tilt rotation defined in CSS.
document.querySelectorAll('.ascii-frame').forEach(frame => {
    let active = false;
    let startPx = 0, startPy = 0;
    let baseDx = 0, baseDy = 0;

    frame.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;              // only left-click drags
        if (e.target.closest('a')) return;       // let link clicks through

        active = true;
        startPx = e.clientX;
        startPy = e.clientY;
        baseDx = parseFloat(frame.style.getPropertyValue('--dx')) || 0;
        baseDy = parseFloat(frame.style.getPropertyValue('--dy')) || 0;
        frame.setPointerCapture(e.pointerId);
        frame.classList.add('dragging');
        e.preventDefault();
    });

    frame.addEventListener('pointermove', (e) => {
        if (!active) return;
        const dx = baseDx + (e.clientX - startPx);
        const dy = baseDy + (e.clientY - startPy);
        frame.style.setProperty('--dx', dx + 'px');
        frame.style.setProperty('--dy', dy + 'px');
    });

    function endDrag(e) {
        if (!active) return;
        active = false;
        frame.classList.remove('dragging');
        try { frame.releasePointerCapture(e.pointerId); } catch (_) { }
    }
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);

    // when a post collapses, snap the frame back to its anchor spot
    const details = frame.closest('details');
    if (details) {
        details.addEventListener('toggle', () => {
            if (!details.open) {
                frame.style.setProperty('--dx', '0px');
                frame.style.setProperty('--dy', '0px');
            }
        });
    }
});