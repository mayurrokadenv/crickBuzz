import type { TabType } from "../../Pages/Admin/Admin";
import "./AdminTabs.css";

interface Props {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

export default function AdminTabs({ activeTab, onTabChange }: Props) {
    return (
        <div className="admin-tabs">
            <button
                onClick={() => onTabChange("commentary")}
                className={activeTab === "commentary" ? "active" : ""}
            >
                Commentary
            </button>
            <button
                onClick={() => onTabChange("teams")}
                className={activeTab === "teams" ? "active" : ""}
            >
                Teams & Players
            </button>
            <button
                onClick={() => onTabChange("fixtures")}
                className={activeTab === "fixtures" ? "active" : ""}
            >
                Fixtures
            </button>
            <button
                onClick={() => onTabChange("series")}
                className={activeTab === "series" ? "active" : ""}
            >
                Series
            </button>
        </div>
    );
}