import { faHome } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "antd";
import errorGIF from "assets/preview-error.webp";
import { type FC } from "react";
import { Link } from "react-router";

import "./errorPage.css";

const ErrorPage: FC<{ children: string }> = ({ children }) => {
  return (
    <div className="error">
      <img src={errorGIF} alt="Error" width="200px" />
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
