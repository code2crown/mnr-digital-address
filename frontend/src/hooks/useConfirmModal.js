import { useState } from "react";

export default function useConfirmModal() {
  const [confirmData, setConfirmData] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  function askConfirmation({ title, message, onConfirm }) {
    setConfirmData({
      open: true,
      title,
      message,
      onConfirm,
    });
  }

  function closeConfirm() {
    setConfirmData((p) => ({ ...p, open: false }));
  }

  return { confirmData, askConfirmation, closeConfirm };
}
