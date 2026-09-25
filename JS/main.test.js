/**
 * Unit tests for JS/main.js
 *
 * main.js is a plain browser script (loaded via <script src>) that drives the
 * TV-noise canvas, the desktop hover preview panel, and the mobile accordion on
 * index-2026-tv.html. It had no test coverage. These tests exercise its logic
 * under jsdom by reproducing the relevant DOM and stubbing the browser APIs the
 * script depends on (matchMedia, requestAnimationFrame, ResizeObserver, and the
 * HTMLMediaElement play/pause methods jsdom does not implement).
 */

const path = require('path');

const MAIN_PATH = path.join(__dirname, 'main.js');

// Markup mirroring the parts of index-2026-tv.html that main.js reads.
function fixture() {
    return `
    <main class="page">
        <section class="work-section">
            <div class="preview-panel" id="previewPanel">
                <div class="tv-error" id="tvError">
                    <canvas class="tv-noise" id="tvNoise"></canvas>
                </div>
                <img class="preview-image" id="previewImage" alt="" />
                <video class="preview-video" id="previewVideo" muted loop preload="none"></video>
                <div class="preview-placeholder" id="previewPlaceholder"></div>
            </div>
            <table class="work-table">
                <tbody>
                    <tr class="work-row" data-index="0" data-preview="tv">
                        <td class="cell-focus">AI tools<span class="cell-summary-mobile">s</span></td>
                    </tr>
                    <tr class="work-expand" data-index="0"><td></td></tr>

                    <tr class="work-row" data-index="2" data-preview="image" data-img="./images/share.png">
                        <td class="cell-focus">Share sheet</td>
                    </tr>
                    <tr class="work-expand" data-index="2"><td></td></tr>

                    <tr class="work-row" data-index="4" data-preview="video" data-video="./videos/notes.mp4">
                        <td class="cell-focus">Notes</td>
                    </tr>
                    <tr class="work-expand" data-index="4">
                        <td>
                            <video class="expand-preview-video" src="./videos/notes.mp4"></video>
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
    </main>`;
}

let rafCallbacks;
let mediaChangeHandlers;

// Install the browser globals main.js relies on, then require it fresh so its
// module-scoped element references and event listeners bind to the fixture.
function loadModule({ mobile = false, html = fixture() } = {}) {
    document.body.innerHTML = html;

    mediaChangeHandlers = [];
    window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: mobile,
        media: query,
        addEventListener: jest.fn((event, handler) => {
            if (event === 'change') mediaChangeHandlers.push(handler);
        }),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
    }));

    rafCallbacks = [];
    global.requestAnimationFrame = jest.fn((cb) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
    });
    global.cancelAnimationFrame = jest.fn();

    global.ResizeObserver = jest.fn().mockImplementation((cb) => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
        _cb: cb,
    }));

    HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = jest.fn();

    let mod;
    jest.isolateModules(() => {
        mod = require(MAIN_PATH);
    });
    return mod;
}

afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
});

describe('isMobile', () => {
    test('returns true when the mobile media query matches', () => {
        const { isMobile } = loadModule({ mobile: true });
        expect(isMobile()).toBe(true);
    });

    test('returns false on desktop widths', () => {
        const { isMobile } = loadModule({ mobile: false });
        expect(isMobile()).toBe(false);
    });
});

describe('showPreview', () => {
    test('tv type shows the tv error and hides the placeholder', () => {
        const { showPreview } = loadModule();
        showPreview('tv');

        expect(document.getElementById('tvError').style.display).toBe('block');
        expect(document.getElementById('previewImage').style.display).toBe('none');
        expect(document.getElementById('previewVideo').style.display).toBe('none');
        expect(document.getElementById('previewPlaceholder').style.display).toBe('none');
        expect(document.getElementById('previewPanel').classList.contains('visible')).toBe(true);
    });

    test('image type sets the image src and shows the image', () => {
        const { showPreview } = loadModule();
        showPreview('image', './images/share.png');

        const img = document.getElementById('previewImage');
        expect(img.style.display).toBe('block');
        expect(img.getAttribute('src')).toBe('./images/share.png');
        expect(document.getElementById('tvError').style.display).toBe('none');
    });

    test('video type shows and plays the video', () => {
        const { showPreview } = loadModule();
        showPreview('video', './videos/notes.mp4');

        const video = document.getElementById('previewVideo');
        expect(video.style.display).toBe('block');
        expect(video.getAttribute('src')).toBe('./videos/notes.mp4');
        expect(video.play).toHaveBeenCalled();
    });

    test('unknown type shows the placeholder and pauses the video', () => {
        const { showPreview } = loadModule();
        showPreview('none');

        expect(document.getElementById('previewPlaceholder').style.display).toBe('block');
        expect(document.getElementById('previewVideo').pause).toHaveBeenCalled();
    });
});

describe('playPreviewVideo', () => {
    test('assigns a new src and registers a one-shot canplay listener', () => {
        const { playPreviewVideo } = loadModule();
        const video = document.getElementById('previewVideo');
        const addSpy = jest.spyOn(video, 'addEventListener');

        playPreviewVideo('./videos/new.mp4');

        expect(video.getAttribute('src')).toBe('./videos/new.mp4');
        expect(video.play).toHaveBeenCalled();
        expect(addSpy).toHaveBeenCalledWith('canplay', expect.any(Function), { once: true });
    });

    test('rewinds instead of reassigning when the src is unchanged', () => {
        const { playPreviewVideo } = loadModule();
        const video = document.getElementById('previewVideo');
        video.src = './videos/same.mp4';
        video.currentTime = 5;

        playPreviewVideo(video.getAttribute('src'));

        expect(video.currentTime).toBe(0);
        expect(video.play).toHaveBeenCalled();
    });
});

describe('hidePreview', () => {
    test('removes the visible class and pauses the video', () => {
        const { hidePreview } = loadModule();
        const panel = document.getElementById('previewPanel');
        panel.classList.add('visible');

        hidePreview();

        expect(panel.classList.contains('visible')).toBe(false);
        expect(document.getElementById('previewVideo').pause).toHaveBeenCalled();
    });
});

describe('positionPreview', () => {
    test('clears the inline top offset on mobile', () => {
        const { positionPreview } = loadModule({ mobile: true });
        const panel = document.getElementById('previewPanel');
        panel.style.top = '123px';

        positionPreview();

        expect(panel.style.top).toBe('');
    });

    test('sets an inline top offset on desktop', () => {
        const { positionPreview } = loadModule({ mobile: false });
        const panel = document.getElementById('previewPanel');

        positionPreview();

        expect(panel.style.top).toMatch(/px$/);
    });
});

describe('drawNoise', () => {
    test('is a no-op when given no canvas', () => {
        const { drawNoise } = loadModule();
        expect(() => drawNoise(null)).not.toThrow();
    });

    test('resizes, observes and schedules the animation loop', () => {
        const { drawNoise } = loadModule();

        const panel = document.createElement('div');
        panel.className = 'preview-panel';
        Object.defineProperty(panel, 'offsetWidth', { value: 3, configurable: true });
        Object.defineProperty(panel, 'offsetHeight', { value: 2, configurable: true });

        const canvas = document.createElement('canvas');
        panel.appendChild(canvas);

        const putImageData = jest.fn();
        const ctx = {
            createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
            putImageData,
        };
        canvas.getContext = jest.fn().mockReturnValue(ctx);

        drawNoise(canvas);

        expect(canvas.width).toBe(3);
        expect(canvas.height).toBe(2);
        expect(ResizeObserver).toHaveBeenCalled();
        expect(putImageData).toHaveBeenCalled();
        expect(requestAnimationFrame).toHaveBeenCalled();
    });

    test('reschedules without drawing when the panel has no size', () => {
        const { drawNoise } = loadModule();

        const panel = document.createElement('div');
        panel.className = 'preview-panel';
        const canvas = document.createElement('canvas');
        panel.appendChild(canvas);

        const putImageData = jest.fn();
        canvas.getContext = jest.fn().mockReturnValue({
            createImageData: jest.fn(),
            putImageData,
        });

        drawNoise(canvas);

        expect(putImageData).not.toHaveBeenCalled();
        expect(requestAnimationFrame).toHaveBeenCalled();
    });
});

describe('DOM event wiring', () => {
    test('hovering a focus cell on desktop shows the matching preview', () => {
        loadModule({ mobile: false });
        const focusCell = document.querySelector('.work-row[data-index="2"] .cell-focus');

        focusCell.dispatchEvent(new Event('mouseenter'));

        const img = document.getElementById('previewImage');
        expect(img.style.display).toBe('block');
        expect(img.getAttribute('src')).toBe('./images/share.png');
    });

    test('leaving a focus cell on desktop hides the preview', () => {
        loadModule({ mobile: false });
        const panel = document.getElementById('previewPanel');
        panel.classList.add('visible');
        const focusCell = document.querySelector('.work-row[data-index="0"] .cell-focus');

        focusCell.dispatchEvent(new Event('mouseleave'));

        expect(panel.classList.contains('visible')).toBe(false);
    });

    test('hovering does nothing on mobile', () => {
        loadModule({ mobile: true });
        const focusCell = document.querySelector('.work-row[data-index="2"] .cell-focus');

        focusCell.dispatchEvent(new Event('mouseenter'));

        expect(document.getElementById('previewPanel').classList.contains('visible')).toBe(false);
    });

    test('tapping a focus cell on mobile opens the matching expand row', () => {
        loadModule({ mobile: true });
        const focusCell = document.querySelector('.work-row[data-index="4"] .cell-focus');
        const expand = document.querySelector('.work-expand[data-index="4"]');

        focusCell.dispatchEvent(new Event('click'));

        expect(expand.classList.contains('open')).toBe(true);
        expect(document.querySelector('.work-row[data-index="4"]').classList.contains('expanded')).toBe(true);
        expect(expand.querySelector('.expand-preview-video').play).toHaveBeenCalled();
    });

    test('tapping an open row again collapses it', () => {
        loadModule({ mobile: true });
        const focusCell = document.querySelector('.work-row[data-index="4"] .cell-focus');
        const expand = document.querySelector('.work-expand[data-index="4"]');

        focusCell.dispatchEvent(new Event('click'));
        expect(expand.classList.contains('open')).toBe(true);

        focusCell.dispatchEvent(new Event('click'));
        expect(expand.classList.contains('open')).toBe(false);
    });

    test('tapping does nothing on desktop', () => {
        loadModule({ mobile: false });
        const focusCell = document.querySelector('.work-row[data-index="4"] .cell-focus');
        const expand = document.querySelector('.work-expand[data-index="4"]');

        focusCell.dispatchEvent(new Event('click'));

        expect(expand.classList.contains('open')).toBe(false);
    });

    test('opening a row shifts the rows below it', () => {
        loadModule({ mobile: true });
        const focusCell = document.querySelector('.work-row[data-index="2"] .cell-focus');

        focusCell.dispatchEvent(new Event('click'));

        // Row 4 sits below the opened row 2, so it gets the shift animation class.
        const below = document.querySelector('.work-row[data-index="4"]');
        expect(below.classList.contains('row-shifted')).toBe(true);
    });
});

describe('mobile media-query change handler', () => {
    test('restarts the mobile summary animation when collapsing to mobile', () => {
        loadModule({ mobile: true });
        const summary = document.querySelector('.cell-summary-mobile');
        summary.style.animation = 'none';

        expect(mediaChangeHandlers.length).toBeGreaterThan(0);
        mediaChangeHandlers.forEach((handler) => handler({ matches: true }));

        expect(summary.style.animation).toBe('');
    });

    test('ignores the change event when leaving mobile', () => {
        loadModule({ mobile: true });
        const summary = document.querySelector('.cell-summary-mobile');
        summary.style.animation = 'none';

        mediaChangeHandlers.forEach((handler) => handler({ matches: false }));

        expect(summary.style.animation).toBe('none');
    });
});
