import { useState, useEffect } from "react";
import { Modal } from "@/primitives/modal";
import { SettingsList, type SettingsCategory } from "./settings-list";
import { SettingsGeneral } from "./settings-general";
import { SettingsUpdates } from "./settings-updates";
import { SettingsAbout } from "./settings-about";

interface SettingsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: SettingsCategory;
}

export function SettingsManager({ isOpen, onClose, initialCategory }: SettingsManagerProps) {
  const [selected, setSelected] = useState<SettingsCategory>("general");

  useEffect(() => {
    if (isOpen && initialCategory) {
      setSelected(initialCategory);
    }
  }, [isOpen, initialCategory]);

  useEffect(() => {
    if (!isOpen) setSelected("general");
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="xl">
      <div className="flex h-[420px] -m-5 border-t border-border-subtle">
        <div className="w-48 shrink-0 border-r border-border-subtle">
          <SettingsList selected={selected} onSelect={setSelected} />
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto">
          {selected === "general" && <SettingsGeneral />}
          {selected === "updates" && <SettingsUpdates />}
          {selected === "about" && <SettingsAbout />}
        </div>
      </div>
    </Modal>
  );
}
