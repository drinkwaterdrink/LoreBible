import React from "react";
import { LoreBibleDocument } from "../types";
import { ExportDrawer } from "./ExportDrawer";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LoreBibleDocument;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  return <ExportDrawer isOpen={isOpen} onClose={onClose} document={document} />;
};

export { ExportDrawer };
