import { App, Button } from "antd";
import { useEffect, type FC } from "react";

const eventTarget = new EventTarget();
let unresolvedCnt = 0;

export const requestUserAction = () =>
  new Promise<void>((resolve) => {
    ++unresolvedCnt;
    console.debug(
      "Requesting user action. Total unresolved requests:",
      unresolvedCnt,
    );
    const f = () => {
      --unresolvedCnt;
      console.debug(
        "User action received, resolving one request. Remaining:",
        unresolvedCnt,
      );
      resolve();
    };
    eventTarget.addEventListener("userAction", f, {
      once: true,
    });
    eventTarget.dispatchEvent(new Event("requestUserAction"));
  });

const RequestUserActionHolder: FC = () => {
  const { notification } = App.useApp();
  useEffect(() => {
    let key: string | undefined = undefined;
    let disposed = false;
    const h = () => {
      const resolve = () => {
        if (key) notification.destroy(key);
        console.debug("User action received, dispatching userAction event");
        eventTarget.dispatchEvent(new Event("userAction"));
      };
      if (window.navigator.userActivation?.isActive) {
        resolve();
        return;
      }
      if (key) return;
      key = "request-user-action";
      notification.info({
        key,
        title: "点击页面任意位置以继续加载",
        description: "由于浏览器限制，你需要在页面执行操作后才可使用某些功能。",
        closable: false,
        duration: false,
        placement: "bottomRight",
        actions: (
          <Button type="primary" onClick={() => resolve()}>
            继续
          </Button>
        ),
      });
      (function t() {
        if (window.navigator.userActivation?.isActive) resolve();
        else if (!disposed) requestAnimationFrame(t);
      })();
    };
    eventTarget.addEventListener("requestUserAction", h);
    if (unresolvedCnt > 0) h();
    return () => {
      eventTarget.removeEventListener("requestUserAction", h);
      if (key) notification.destroy(key);
      disposed = true;
    };
  }, [notification]);
  return null;
};

export default RequestUserActionHolder;
