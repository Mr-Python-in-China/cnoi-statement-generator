import type { FC } from "react";
import { useEffect, useState } from "react";

const BlobImage: FC<{
  blob?: Blob;
  alt?: string;
  className?: string;
}> = ({ blob, alt, className }) => {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  if (!url) {
    return <div className={className} aria-hidden="true" />;
  }

  return <img src={url} alt={alt ?? ""} className={className} />;
};

export default BlobImage;
