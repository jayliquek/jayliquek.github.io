// ── TV noise canvas ──────────────────────────────────────────────
const noiseCanvas = document.getElementById('tvNoise');

function drawNoise(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const panel = canvas.closest('.preview-panel');

    function resize() {
        canvas.width  = panel.offsetWidth;
        canvas.height = panel.offsetHeight;
    }

    function tick() {
        const w = canvas.width;
        const h = canvas.height;
        if (!w || !h) { requestAnimationFrame(tick); return; }
        const img = ctx.createImageData(w, h);
        const d = img.data;

        for (let i = 0; i < d.length; i += 4) {
            const v = Math.random() > 0.82 ? Math.floor(Math.random() * 255) : 0;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = v > 0 ? 180 : 0;
        }

        ctx.putImageData(img, 0, 0);
        requestAnimationFrame(tick);
    }

    resize();
    new ResizeObserver(resize).observe(panel);
    tick();
}

if (noiseCanvas) drawNoise(noiseCanvas);


// ── Desktop hover preview ─────────────────────────────────────────
const panel        = document.getElementById('previewPanel');
const tvError      = document.getElementById('tvError');
const placeholder  = document.getElementById('previewPlaceholder');
const rows         = document.querySelectorAll('.work-row');

function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
}

function showPreview(type) {
    if (type === 'tv') {
        tvError.style.display     = 'block';
        placeholder.style.display = 'none';
    } else {
        tvError.style.display     = 'none';
        placeholder.style.display = 'block';
    }
    panel.classList.add('visible');
}

function hidePreview() {
    panel.classList.remove('visible');
}

rows.forEach(row => {
    const focusCell = row.querySelector('.cell-focus');
    if (!focusCell) return;

    focusCell.addEventListener('mouseenter', () => {
        if (isMobile()) return;
        showPreview(row.dataset.preview);
    });

    focusCell.addEventListener('mouseleave', () => {
        if (isMobile()) return;
        hidePreview();
    });

    focusCell.addEventListener('click', () => {
        if (!isMobile()) return;
        const idx    = row.dataset.index;
        const expand = document.querySelector(`.work-expand[data-index="${idx}"]`);
        const isOpen = expand.classList.contains('open');

        document.querySelectorAll('.work-expand').forEach(e => e.classList.remove('open'));
        rows.forEach(r => r.classList.remove('expanded', 'row-shifted'));
        document.querySelectorAll('.work-expand').forEach(e => e.classList.remove('row-shifted'));

        if (!isOpen) {
            expand.classList.add('open');
            row.classList.add('expanded');

            // Animate rows and dividers below the expanded one
            let found = false;
            document.querySelectorAll('.work-row, .work-expand').forEach(el => {
                if (found && el !== expand) {
                    el.classList.remove('row-shifted');
                    void el.offsetWidth; // force reflow to restart animation
                    el.classList.add('row-shifted');
                }
                if (el === row) found = true;
            });
        }
    });
});


