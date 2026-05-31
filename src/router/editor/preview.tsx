import { Alert } from "antd";
import errorImg from "assets/preview-error.webp";
import loadingImg from "assets/preview-loading.webp";
import { memo, useEffect, useImperativeHandle, useRef, useState } from "react";

import useTemplateManager from "@/components/templateManagerContext";
import { setRecentlyOpenedPreviewImage } from "@/utils/.client/indexedDB/recentlyOpened";

import {
  useEditorContent,
  useEditorDoc,
  useEditorEvents,
} from "./editorContext";

import "./preview.css";

const PreviewContainer = memo<{
  svg: string;
  ref?: React.Ref<HTMLDivElement>;
}>(({ svg, ref: refParam }) => {
  const { path } = useEditorDoc();
  const editorEvents = useEditorEvents();
  const ref = useRef<HTMLDivElement>(null);
  const pathRef = useRef(path);
  const svgRef = useRef(svg);
  useImperativeHandle(refParam, () => ref.current!, []);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);
  useEffect(() => {
    svgRef.current = svg;
  }, [svg]);
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
  useEffect(() => {
    const handleSaved = () => {
      const currentPath = pathRef.current;
      const currentSvg = svgRef.current;
      if (!currentPath) return;
      if (!ref.current?.shadowRoot) return;
      if (typeof currentSvg !== "string" || currentSvg.length === 0) return;
      const svgDom = ref.current.shadowRoot.children[0] as
        | SVGElement
        | undefined;
      const firstPage = svgDom?.querySelector(
        ".typst-page",
      ) as SVGGElement | null;
      if (!svgDom || !firstPage) return;
      const viewWidth = Number(firstPage.getAttribute("data-page-width"));
      const viewHeight = Number(firstPage.getAttribute("data-page-height"));
      const scale = 400 / Math.max(viewWidth, viewHeight);
      const canvas = document.createElement("canvas");
      canvas.width = viewWidth * scale;
      canvas.height = viewHeight * scale;
      const clonedSvgDom = svgDom.cloneNode(true) as SVGElement;
      const pages = clonedSvgDom.querySelectorAll(".typst-page");
      pages.forEach((page, index) => {
        if (index > 0) page.remove();
      });
      clonedSvgDom.querySelectorAll("script, foreignObject").forEach((node) => {
        node.remove();
      });
      clonedSvgDom.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);
      clonedSvgDom.setAttribute("width", String(canvas.width));
      clonedSvgDom.setAttribute("height", String(canvas.height));

      const svgBlob = new Blob(
        [new XMLSerializer().serializeToString(clonedSvgDom)],
        {
          type: "image/svg+xml",
        },
      );
      const url = URL.createObjectURL(svgBlob);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.addEventListener(
        "load",
        () => {
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (!blob) return;
            URL.revokeObjectURL(url);
            setRecentlyOpenedPreviewImage(currentPath, blob);
          }, "image/webp");
        },
        { once: true },
      );
      img.src = url;
    };
    editorEvents.on("documentSaved", handleSaved);
    return () => editorEvents.off("documentSaved", handleSaved);
  }, [editorEvents]);

  return <div className="contest-editor-preview-container" ref={ref} />;
});

const Preview = memo(() => {
  const { content } = useEditorContent();
  const { compiler } = useTemplateManager();
  const [error, setError] = useState<string>();
  const [svg, setSvg] = useState<string | 0 | 1>(1); // 0: error; 1: loading
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  useEffect(() => {
    let mounted = true;
    lastUpdateTimeRef.current = Date.now();
    compiler.typstInitPromise.catch(() => {
      if (!mounted) return;
      setSvg(0);
    });
    compiler.typstInitPromise
      .then(() => new Promise((resolve) => setTimeout(resolve, 100)))
      .then(() => {
        if (!mounted) return;
        const now = Date.now();
        if (now - lastUpdateTimeRef.current < 100) return;
        lastUpdateTimeRef.current = now;
        compiler
          .compileToSvgDebounced(content)
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
  }, [compiler, content]);
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
  return (
    <div className="contest-editor-preview">
      {error && (
        <Alert
          className="contest-editor-preview-error"
          title="渲染预览时出错"
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
});

export default Preview;
