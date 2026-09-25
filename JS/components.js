// Shared layout components.
//
// The site is a plain static site with no build step, so the navigation bar and
// footer used to be copy-pasted into ~18 HTML files. They now live here as small
// custom elements. Each element renders into the same class-based markup the CSS
// already targets (`.navbar`, `.footer`, `.selfplug`, ...), and the host uses
// `display: contents` so it adds no box of its own — the rendered DOM matches the
// old hand-written markup for layout purposes.
//
// Loaded synchronously from <head>, so the elements are defined before the parser
// reaches them and upgrade in place with no flash of unstyled content.

(function () {
    // Ensure the custom-element hosts don't affect layout.
    const style = document.createElement('style');
    style.textContent = 'site-nav, back-nav, site-footer { display: contents; }';
    document.head.appendChild(style);

    const NAV = `
        <div class="navbar">
            <div class="navbar-name">
                <ul>
                    <li class="home"><a href="index.html">Jay Li Quek</a></li>
                </ul>
            </div>
            <div class="navbar-links">
                <ul>
                    <li class="one"><a href="index.html#about">About</a></li>
                    <li class="two"><a href="index.html#work">Work</a></li>
                    <li class="three"><a href="blog.html">Blog</a></li>
                    <hr />
                </ul>
            </div>
        </div>`;

    const BACK_NAV = `
        <div class="navbar">
            <div class="navbar-name">
                <a href="index.html">back</a>
            </div>
        </div>`;

    const FOOTER = `
        <footer class="footer">
            <div class="leftfoot">
                <p>Reach me</p>
            </div>
            <div class="rightfoot">
                <p>My mom used to tell me not to talk to strangers, but the internet has some pretty cool people. If you have a thought or just want to say hello, feel free to drop me an email.  </p>
                <br>
                <br>
                <a href="mailto: jayliquek@gmail.com" class="hoverlink">jayliquek@gmail.com</a><br><br>
                <a href="https://www.linkedin.com/in/jayliquek/" class="hoverlink">Linkedin</a>
            </div>
        </footer>
        <div class="selfplug">
            <p>Designed &amp; developed by Jay Li</p>
        </div>`;

    function define(tag, html) {
        customElements.define(tag, class extends HTMLElement {
            connectedCallback() {
                if (!this.rendered) {
                    this.innerHTML = html;
                    this.rendered = true;
                }
            }
        });
    }

    define('site-nav', NAV);
    define('back-nav', BACK_NAV);
    define('site-footer', FOOTER);
})();
