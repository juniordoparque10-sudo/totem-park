import ReactDOM from "react-dom/client";
import MaintenanceScreen from "./MaintenanceScreen";
import PlayerStartupSplash from "./PlayerStartupSplash";

const screen = new URLSearchParams(window.location.search).get("screen");

ReactDOM.createRoot(document.getElementById("root")).render(
  screen === "maintenance" ? <MaintenanceScreen orientation="landscape" /> : <PlayerStartupSplash />,
);
