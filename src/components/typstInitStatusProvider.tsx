import { type FC, type ReactNode, useEffect, useState } from "react";
import { App, Button, Progress, Space } from "antd";
import { fontAccessConfirmResolve } from "@/compiler";
import { TypstInitStatusContext } from "./typstInitStatusContext";
import useTemplateManager from "./templateManagerContext";

const LoadedTextHelper: FC<{
  loaded: number;
  total: number | undefined;
}> = ({ loaded, total }) => {
  return (
    <>
      {(loaded / (1024 * 1024)).toFixed(1)} MiB
      {total !== undefined
        ? ` / ${(total / (1024 * 1024)).toFixed(1)} MiB`
        : ""}
    </>
  );
};
const ProgressBarHelper: FC<{
  status: "pending" | "fulfilled" | "rejected";
  percent: number;
}> = ({ status, percent }) => (
  <Progress
    status={
      status === "rejected"
        ? "exception"
        : status === "fulfilled"
          ? "success"
          : "active"
    }
    percent={percent}
    format={(x) => (x || 0).toFixed(0) + "%"}
  />
);

const TypstInitStatusProvider: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const { compiler } = useTemplateManager();

  const [status, setStatus] = useState(compiler.typstInitStatus);

  const { notification } = App.useApp();

  useEffect(() => {
    const initProgressKey = crypto.randomUUID();
    const fontAccessRequestKey = crypto.randomUUID();
    const mountTime = performance.now();
    let rafId: number | undefined = undefined;
    const loop = () => {
      const { typstInitStatus, typstInitInfo } = compiler;
      setStatus(typstInitStatus);
      const elapsed = performance.now() - mountTime;
      const progressBars = (
        <>
          <div>
            下载 Typst 编译器（
            <LoadedTextHelper {...typstInitInfo.compiler} />）
            <ProgressBarHelper {...typstInitInfo.compiler} />
            下载字体资源（
            <LoadedTextHelper {...typstInitInfo.font} />）
            <ProgressBarHelper {...typstInitInfo.font} />
            下载第三方包（
            <LoadedTextHelper {...typstInitInfo.package} />）
            <ProgressBarHelper {...typstInitInfo.package} />
          </div>
        </>
      );

      if (typstInitStatus === "pending") {
        rafId = requestAnimationFrame(loop);
        if (elapsed >= 1000)
          notification.info({
            key: initProgressKey,
            placement: "bottomRight",
            title: "Typst 正在初始化",
            description: progressBars,
            closable: false,
            duration: false,
          });
      } else if (typstInitStatus === "rejected")
        notification.error({
          key: initProgressKey,
          placement: "bottomRight",
          title: "Typst 初始化失败",
          description: <>{progressBars}请前往控制台查看错误。</>,
          closable: false,
          duration: false,
          actions: (
            <Space>
              <Button
                onClick={async () => {
                  await window.caches.delete("typst-assets");
                  window.location.reload();
                }}
                type="default"
              >
                清空缓存
              </Button>
              <Button onClick={() => window.location.reload()} type="primary">
                刷新
              </Button>
            </Space>
          ),
        });
      else if (typstInitStatus === "fulfilled")
        if (elapsed >= 1000)
          notification.success({
            key: initProgressKey,
            placement: "bottomRight",
            title: "Typst 初始化完成",
            description: progressBars,
            duration: 3,
          });
      if (fontAccessConfirmResolve)
        notification.info({
          key: fontAccessRequestKey,
          placement: "bottomRight",
          title: "请求访问本机字体",
          description:
            "Typst 需要加载字体。允许访问本机字体后，已有的字体将直接从本地加载，减少资源下载。",
          closable: false,
          duration: false,
          actions: [
            <Button
              key="confirm"
              type="primary"
              onClick={() => fontAccessConfirmResolve?.()}
            >
              确认
            </Button>,
          ],
        });
      else notification.destroy(fontAccessRequestKey);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      notification.destroy(initProgressKey);
      notification.destroy(fontAccessRequestKey);
    };
  }, [compiler, notification]);

  return (
    <TypstInitStatusContext.Provider value={status}>
      {children}
    </TypstInitStatusContext.Provider>
  );
};

export default TypstInitStatusProvider;
