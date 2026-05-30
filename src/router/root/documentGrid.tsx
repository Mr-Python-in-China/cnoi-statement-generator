import { Suspense, use, type FC } from "react";
import { Link } from "react-router";

import {
  getRecentlyOpened,
  type RecentlyOpenedEntry,
} from "@/utils/.client/indexedDB/recentlyOpened";

import "./documentGrid.css";

const DocumentGridImpl: FC<{
  recentlyOpenedPromise: Promise<RecentlyOpenedEntry[]>;
}> = ({ recentlyOpenedPromise }) => {
  const recentlyOpened = use(recentlyOpenedPromise);

  return (
    <div className="root-document-grid">
      {recentlyOpened.map((meta) => (
        <div key={meta.name}>
          <Link
            to={{
              pathname: "/editor",
              search: `?file=${encodeURIComponent(meta.path.map(encodeURIComponent).join("/"))}`,
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

const DocumentGrid: FC = () => {
  const recentlyOpenedPromise = getRecentlyOpened();
  return (
    <Suspense>
      <DocumentGridImpl recentlyOpenedPromise={recentlyOpenedPromise} />
    </Suspense>
  );
};

export default DocumentGrid;
