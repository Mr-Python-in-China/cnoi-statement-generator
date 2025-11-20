import { memo, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ContestData } from "@/types/contestData";
import { compileToSvgDebounced } from "@/compiler";
import { Alert } from "antd";
import { isEqual } from "lodash";
import { typstInitPromise } from "@/compiler";

import loadingImg from "assets/preview-loading.webp";
import errorImg from "assets/preview-error.webp";
import "./preview.css";

const PreviewContainer = memo<{
  svg: string;
  ref?: React.Ref<HTMLDivElement>;
}>(({ svg, ref: refParam }) => {
  const ref = useRef<HTMLDivElement>(null);
  useImperativeHandle(refParam, () => ref.current!, []);
  useEffect(() => {
    const host = ref.current;
    if (!host || host.shadowRoot) return;
    host.attachShadow({ mode: "open" });
  }, []);
  useEffect(() => {
    if (!ref.current?.shadowRoot) return;
    ref.current.shadowRoot.innerHTML =
      svg + "<style>.typst-doc{width:100%;height:auto;}</style>";
  }, [svg]);
  return <div className="contest-editor-preview-container" ref={ref} />;
});

const Preview = memo<{ data: ContestData<{ withMarkdown: true }> }>(
  ({ data }) => {
    const [error, setError] = useState<string>();
    const [svg, setSvg] = useState<string | 0 | 1>(1); // 0: error; 1: loading
    const containerRef = useRef<HTMLDivElement>(null);
    const lastUpdateTimeRef = useRef<number>(Date.now());
    useEffect(() => {
      let mounted = true;
      lastUpdateTimeRef.current = Date.now();
      typstInitPromise.catch(() => {
        if (!mounted) return;
        setSvg(0);
      });
      typstInitPromise
        .then(() => new Promise((resolve) => setTimeout(resolve, 100)))
        .then(() => {
          if (!mounted) return;
          const now = Date.now();
          if (now - lastUpdateTimeRef.current < 100) return;
          lastUpdateTimeRef.current = now;
          compileToSvgDebounced(data)
            .then((res) => {
              if (!res || !mounted) return;
              setSvg(res);
              setError(undefined);
            })
            .catch((e) => {
              if (!mounted) return;
              setSvg((x) => (x == 1 ? 0 : x));
              if (e instanceof Error) setError(e.message);
              else setError(String(e));
              console.error("Rendering failed.", e);
            });
        });
      return () => {
        mounted = false;
      };
    }, [data]);
    useEffect(() => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      let scrollRatio = container.scrollTop / container.scrollWidth;
      let preventScroll = false; // Prevent scroll event triggered by resize
      const handleScroll = () => {
        if (preventScroll) preventScroll = false;
        else scrollRatio = container.scrollTop / container.scrollWidth;
      };
      containerRef.current.addEventListener("scroll", handleScroll, {
        passive: true,
      });
      const handleResize = () => {
        const scrollTop = scrollRatio * container.scrollWidth;
        // If scroll to the bottom, we need to update scrollRatio, else prevent it
        if (scrollTop + container.clientHeight - 1 <= container.scrollHeight)
          preventScroll = true;
        container.scrollTop = scrollTop;
      };
      const ro = new ResizeObserver(handleResize);
      ro.observe(container);
      return () => {
        container.removeEventListener("scroll", handleScroll);
        ro.disconnect();
      };
    }, []);
    // const s =
    //   typeof svg === "string" &&
    //   svg
    //     .replace(
    //       /<style type="text\/css">/g,
    //       '<style type="text/css">.contest-editor-preview-container{',
    //     )
    //     .replace(/<\/style>/g, "}</style>");
    return (
      <div className="contest-editor-preview">
        {error && (
          <Alert
            className="contest-editor-preview-error"
            message="渲染预览时出错"
            description={
              <>
                <div>{error}</div>
                <div>
                  如果你认为这是网站的错误，请{" "}
                  <a
                    href="https://github.com/Mr-Python-in-China/cnoi-statement-generator/issues"
                    target="_blank"
                  >
                    提交 issue
                  </a>
                  。
                </div>
              </>
            }
            type="error"
            closable={false}
            showIcon
          />
        )}
        <PreviewContainer
          svg={typeof svg === "string" ? svg : ""}
          ref={containerRef}
        />
        <img
          src={loadingImg}
          alt="加载预览中"
          style={{
            display: svg === 1 ? "block" : "none",
          }}
        />
        <img
          src={errorImg}
          alt="预览加载失败"
          style={{ display: svg === 0 ? "block" : "none" }}
        />
      </div>
    );
  },
  isEqual,
);

export default Preview;
