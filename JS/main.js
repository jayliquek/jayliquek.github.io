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
const previewImage = document.getElementById('previewImage');
const previewVideo = document.getElementById('previewVideo');
const rows         = document.querySelectorAll('.work-row');

function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
}

function showPreview(type, src) {
    tvError.style.display      = type === 'tv' ? 'block' : 'none';
    previewImage.style.display = type === 'image' ? 'block' : 'none';
    previewVideo.style.display = type === 'video' ? 'block' : 'none';
    placeholder.style.display  = ['tv', 'image', 'video'].includes(type) ? 'none' : 'block';

    if (type === 'image' && src) previewImage.src = src;

    if (type === 'video' && src) {
        playPreviewVideo(src);
    } else {
        previewVideo.pause();
    }

    panel.classList.add('visible');
}

function startPreviewVideo() {
    previewVideo.play().catch(() => {});
}

// Play the preview video from the start. The first play() call kicks off
// buffering for a just-set source (preload="none"); if it isn't ready yet the
// 'canplay' listener starts playback the moment enough data has loaded. Using a
// named handler means repeated hovers don't stack duplicate listeners.
function playPreviewVideo(src) {
    if (previewVideo.getAttribute('src') !== src) {
        previewVideo.src = src;
    } else {
        try { previewVideo.currentTime = 0; } catch (e) { /* not seekable yet */ }
    }
    startPreviewVideo();
    previewVideo.addEventListener('canplay', startPreviewVideo, { once: true });
}

function hidePreview() {
    panel.classList.remove('visible');
    previewVideo.pause();
}

// Keep the preview vertically aligned with the "Share sheet on Facebook"
// row (centered), nudged up 40px. Recomputed on load + resize.
function positionPreview() {
    if (isMobile()) { panel.style.top = ''; return; }
    const section   = document.querySelector('.work-section');
    const shareRow  = document.querySelector('.work-row[data-index="2"]');
    if (!section || !shareRow) return;

    const sr = section.getBoundingClientRect();
    const rr = shareRow.getBoundingClientRect();
    const rowCenter = (rr.top + rr.height / 2) - sr.top;
    panel.style.top = (rowCenter - panel.offsetHeight / 2 - 40) + 'px';
}

positionPreview();
window.addEventListener('resize', positionPreview);
window.addEventListener('load', positionPreview);
if (previewImage) previewImage.addEventListener('load', positionPreview);

// Replay the accordion reveal when the layout collapses to mobile
const mobileMQ = window.matchMedia('(max-width: 768px)');
mobileMQ.addEventListener('change', (e) => {
    if (!e.matches) return;
    document.querySelectorAll('.cell-summary-mobile').forEach(el => {
        el.style.animation = 'none';
        void el.offsetWidth; // force reflow
        el.style.animation = '';
    });
});

rows.forEach(row => {
    const focusCell = row.querySelector('.cell-focus');
    if (!focusCell) return;

    focusCell.addEventListener('mouseenter', () => {
        if (isMobile()) return;
        showPreview(row.dataset.preview, row.dataset.img || row.dataset.video);
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

        // Pause any expand videos when collapsing rows
        document.querySelectorAll('.expand-preview-video').forEach(v => v.pause());

        if (!isOpen) {
            expand.classList.add('open');
            row.classList.add('expanded');

            // Autoplay the video preview (if this row has one)
            const vid = expand.querySelector('.expand-preview-video');
            if (vid) {
                vid.currentTime = 0;
                vid.play().catch(() => {});
            }

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


