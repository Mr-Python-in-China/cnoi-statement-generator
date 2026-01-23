import { type FC } from "react";
import { Link } from "react-router";
import { Button } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";

import errorGIF from "assets/preview-error.webp";
import "./errorPage.css";

const ErrorPage: FC<{ children: string }> = ({ children }) => {
  return (
    <div className="error">
      <img src={errorGIF} alt="Not Found" width="200px" />
      <div>{children}</div>
      <Link to="/">
        <Button type="primary" icon={<FontAwesomeIcon icon={faHome} />}>
          返回主页
        </Button>
      </Link>
    </div>
  );
};

export default ErrorPage;
