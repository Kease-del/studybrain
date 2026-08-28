// This landing page uses plain CSS (App.css) - no PostCSS plugins are needed.
// An explicit empty config prevents PostCSS/Vite from walking UP the directory
// tree to the parent StudyBrain/ postcss.config.js, which would load Tailwind
// and emit a misleading "content option is missing or empty" warning.
export default {}
