import { App, Button } from "antd";
import { useEffect } from "react";

const backupReminderKey = "cnoi-backup-warning-confirmed";

const BackupReminder = () => {
  const { notification } = App.useApp();

  useEffect(() => {
    if (localStorage.getItem(backupReminderKey) === "1") return;

    notification.warning({
      key: "backup-warning",
      placement: "bottomRight",
      type: "warning",
      title: "请及时备份文档",
      description:
        "浏览器可能在空间不足时清理本地数据。建议定期导出 JSON 备份，避免文档丢失。近期将上线云存储功能以解决问题。",
      closable: false,
      duration: false,
      actions: (
        <Button
          type="primary"
          onClick={() => {
            localStorage.setItem(backupReminderKey, "1");
            notification.destroy("backup-warning");
          }}
        >
          我知道了
        </Button>
      ),
    });
  }, [notification]);

  return null;
};

export default BackupReminder;
