import type { FC } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import ContestEditor from "./contestEditor";
import { name as appName, version as appVersion } from "../package.json";

import "./App.css";

const App: FC = () => {
  return (
    <div className="app">
      <main>
        <ContestEditor />
      </main>
      <footer>
        <div>
          <a
            href="https://github.com/Mr-Python-in-China/cnoi-statement-generator"
            target="_blank"
          >
            <FontAwesomeIcon icon={faGithub} />
            {appName}
          </a>{" "}
          v{appVersion}
        </div>
        <div>Developed by MrPython</div>
      </footer>
    </div>
  );
};
export default App;
