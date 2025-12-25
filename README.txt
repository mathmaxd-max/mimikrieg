Impostor (vanilla HTML/CSS/JS)

How to run
1) Put wordbase.parquet in the SAME folder as index.html (root).
2) Serve the folder with any simple web server (required for fetch()):
   - Python:  python -m http.server 8000
   - Node:    npx serve .
3) Open: http://localhost:8000/

Notes
- The app reads wordbase.parquet in-browser using hyparquet (via CDN).
- Configuration and players persist via localStorage.
