# Bubbles Agent Workshop

This repository demonstrates a simple static web demo consisting of `index.html`, `styles.css`, and `app.js`. The demo shows a button that, when clicked, updates a status text to **"Build check passed"**.

## Files
- **index.html** – basic HTML skeleton loading the CSS and JavaScript.
- **styles.css** – minimal styling for layout and visual clarity.
- **app.js** – contains a DOMContentLoaded listener that attaches a click handler to the button with id `check` and updates the element with id `status`.

## Local preview
```bash
python3 -m http.server 8000
```
Open `http://localhost:8000` in a browser to view the demo.

## Verify syntax
```bash
node --check app.js
```
The command should exit with no errors, confirming the JavaScript is syntactically valid.

## Publishing
Push the repository to GitHub and enable **GitHub Pages** on the `main` branch root. GitHub Pages will serve the static site directly from the repository.

> Note: Generating the source files and previewing them locally demonstrates functionality, but does not guarantee successful deployment on GitHub Pages or other hosting platforms. Additional configuration may be required for a live site.
