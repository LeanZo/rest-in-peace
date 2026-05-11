import ripLogo from "@/media/images/REST in Peace - Full.png";

const APP_VERSION = __APP_VERSION__;

export function SettingsAbout() {
  return (
    <div className="p-5 flex flex-col items-center justify-center h-full text-center">
      <img src={ripLogo} alt="REST in Peace" className="w-24 h-24 mb-4" />

      <h3 className="text-lg font-semibold text-text-primary">REST in Peace</h3>
      <p className="text-xs text-text-muted mt-1">Version {APP_VERSION}</p>

      <div className="mt-6 space-y-1.5 text-xs text-text-muted">
        <p>REST API development and testing tool</p>
        <p>Built with React, TypeScript &amp; Tauri</p>
      </div>

      <div className="mt-6 space-y-1.5 text-xs text-text-muted">
        <p>All rights reserved</p>
        <p>Copyright &copy; 2026 Lucas Lean</p>
      </div>
    </div>
  );
}
