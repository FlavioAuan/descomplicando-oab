// Styles for apostila HTML, scoped under .apostila-body (admin viewer, print and student reader)
export const APOSTILA_CSS = `
  *{box-sizing:border-box}
  .apostila-body{font-family:Georgia,serif;color:#111;line-height:1.75;font-size:15px}
  .apostila-body h1{font-size:22px;color:#1a3a5c;border-bottom:3px solid #1a56db;padding-bottom:10px;margin-bottom:24px}
  .apostila-body h2{font-size:17px;color:#1a3a5c;margin-top:36px;margin-bottom:10px;padding-left:12px;border-left:4px solid #1a56db}
  .apostila-body h3{font-size:15px;color:#2d4a6e;margin-top:20px;margin-bottom:8px}
  .apostila-body h4{font-size:14px;color:#2d4a6e;margin-top:16px;margin-bottom:6px}
  .apostila-body p{margin:10px 0;text-align:justify}
  .apostila-body ul,.apostila-body ol{padding-left:24px;margin:10px 0}
  .apostila-body li{margin:5px 0}
  .apostila-body strong{color:#1a3a5c;font-weight:700}
  .apostila-body em{color:#555;font-style:italic}
  .apostila-body blockquote{border-left:3px solid #93c5fd;padding:10px 16px;margin:14px 0;background:#eff6ff;color:#1e40af;border-radius:0 6px 6px 0}
  .apostila-body table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}
  .apostila-body th{background:#1a3a5c;color:#fff;padding:8px 12px;text-align:left;font-weight:600}
  .apostila-body td{padding:7px 12px;border:1px solid #dbeafe}
  .apostila-body tr:nth-child(even) td{background:#f0f7ff}
  .apostila-body hr{border:none;border-top:1px solid #e2e8f0;margin:24px 0}
`
