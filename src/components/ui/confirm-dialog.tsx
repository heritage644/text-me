import { Button } from "./button";
import { Modal } from "./modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      compact
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={onClose}>
            Cancel
          </Button>
          <Button variant={destructive ? "danger" : "primary"} block loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-fg-muted">{description}</p>
    </Modal>
  );
}
