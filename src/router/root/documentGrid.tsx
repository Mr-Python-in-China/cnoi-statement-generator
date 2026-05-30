import { type FC } from "react";
import { Link } from "react-router";

import type { RecentlyOpenedEntry } from "@/utils/indexedDB/recentlyOpened";

import "./documentGrid.css";

const DocumentGrid: FC<{
  recentlyOpened: RecentlyOpenedEntry[];
}> = ({ recentlyOpened }) => {
  return (
    <div className="root-document-grid">
      {recentlyOpened.map((meta) => (
        <div key={meta.name}>
          <Link
            to={{
              pathname: "/editor",
              search: `?file=${meta.path.map(encodeURIComponent).join("/")}`,
            }}
          >
            {/*{meta.previewImage ? (
              <BlobImage
                blob={meta.previewImage}
                alt={`Document "${meta.name}" preview`}
              />
            ) : */}
            <div
              style={{
                // @ts-expect-error CSS variable
                "--doc-preview-card-color-hue": 0.625 + "turn",
              }}
            >
              <div>{meta.name}</div>
            </div>
          </Link>
          <div>{meta.name}</div>
        </div>
      ))}
    </div>
  );
};

export default DocumentGrid;
