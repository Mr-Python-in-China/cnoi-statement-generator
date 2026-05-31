import { Suspense, use, type FC } from "react";
import { Link } from "react-router";

import BlobImage from "@/components/BlobImage";

import "./documentGrid.css";
import {
  getRecentlyOpened,
  type RecentlyOpenedEntry,
} from "@/utils/.client/indexedDB/recentlyOpened";

const DocumentGridImpl: FC<{
  recentlyOpenedPromise: Promise<RecentlyOpenedEntry[]>;
}> = ({ recentlyOpenedPromise }) => {
  const recentlyOpened = use(recentlyOpenedPromise);

  return (
    <div className="root-document-grid">
      {recentlyOpened.map((meta) => (
        <Link
          key={meta.name}
          to={{
            pathname: "/editor",
            search: `?file=${encodeURIComponent(meta.path.map(encodeURIComponent).join("/"))}`,
          }}
          className="root-document-grid-item"
        >
          <div className="root-document-grid-item-preview-container">
            <div className="root-document-grid-item-preview-wrapper">
              {meta.previewImage ? (
                <BlobImage
                  className="root-document-grid-item-preview"
                  blob={meta.previewImage}
                  alt={`Document "${meta.name}" preview`}
                />
              ) : (
                <div
                  className="root-document-grid-item-preview-fallback"
                  style={{
                    // @ts-expect-error CSS variable
                    "--doc-preview-card-color-hue": 0.625 + "turn",
                  }}
                >
                  <div>{meta.name}</div>
                </div>
              )}
            </div>
          </div>
          <div className="root-document-grid-item-name">{meta.name}</div>
        </Link>
      ))}
    </div>
  );
};

const DocumentGrid: FC = () => {
  const recentlyOpenedPromise = getRecentlyOpened();
  return (
    <Suspense>
      <DocumentGridImpl recentlyOpenedPromise={recentlyOpenedPromise} />
    </Suspense>
  );
};

export default DocumentGrid;
