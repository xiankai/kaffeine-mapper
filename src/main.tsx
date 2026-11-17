import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { finishSignIn } from "./services/googleExport";
import "./index.css";

if (finishSignIn(location.hash))
  history.replaceState(null, "", `${location.pathname}#/import`);

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

navigator.serviceWorker?.register("./sw.js").catch(() => undefined);
