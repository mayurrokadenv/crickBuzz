import "./Header.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
        logout
    } = useAuth();

    const isAdminRoute =
        location.pathname === "/admin" ||
        location.pathname.startsWith("/admin/");

    // Check if we're on the match details page (second page)
    const isMatchDetailsPage = location.pathname.startsWith("/match/");
    const isMatchFixturePage = location.pathname.startsWith("/fixture/");
    const matchOrigin =
        location.state?.dashboard === "nvian" || location.state?.dashboard === "live"
            ? location.state.dashboard
            : null;
    
    // Show back button on match details OR fixture pages
    const shouldShowBackButton = isMatchDetailsPage || isMatchFixturePage;

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const handleBack = () => {
        navigate(-1); // Go back to previous page
    };

    const backimage = "./public/backbutton.svg";

    return (
        <header className="header card">

            <div className="header__left">

                <div className="header__logo">
                    {/* Show back button only on match details page */}
                    {shouldShowBackButton && (
                        <button 
                            className="header__back-btn" 
                            onClick={handleBack}
                            aria-label="Go back"
                        >
                           <img
                            src="/backbutton.svg"
                            alt="Back"
                            width={32}
                            height={32}
                        />
                        </button>
                    )}
                    <span className="header__live-dot"></span>

                    <span className="header__live-text">
                        LIVE
                    </span>

                    <h2 className="header__title">
                        MATCHCAST
                    </h2>
                </div>

                <div className="header__time">
                    <span className="header__time-dot"></span>
                    <span>19:29</span>
                </div>

            </div>

            <nav className="header__nav">

                <button
                    className={`header__nav-btn ${
                        location.pathname === "/nvian" ||
                        (shouldShowBackButton && matchOrigin === "nvian")
                            ? "active"
                            : ""
                    }`}
                    onClick={() => navigate("/nvian")}
                >
                    NVian Dashboard
                </button>

                <button
                    className={`header__nav-btn ${
                        location.pathname === "/" ||
                        (shouldShowBackButton && matchOrigin === "live")
                            ? "active"
                            : ""
                    }`}
                    onClick={() => navigate("/")}
                >
                    Live Dashboard
                </button>

                {(isAdmin || isSuperAdmin) && (
                    <button
                        className={`header__nav-btn ${
                            isAdminRoute ? "active" : ""
                        }`}
                        onClick={() => navigate("/admin/fixtures")}
                    >
                        Admin Console
                    </button>
                )}

                {isSuperAdmin && (
                    <button
                        className={`header__nav-btn ${
                            location.pathname === "/superadmin" ? "active" : ""
                        }`}
                        onClick={() => navigate("/superadmin")}
                    >
                        Super Admin
                    </button>
                )}

                {/* User is not logged in */}
                {!isAuthenticated && (
                    <div className="header__auth">
                        <button
                            className="header__login-btn"
                            onClick={() => navigate("/login")}
                        >
                            Login
                        </button>

                        <button
                            className="header__register-btn"
                            onClick={() => navigate("/register")}
                        >
                            Register
                        </button>
                    </div>
                )}

                {/* User is logged in */}
                {isAuthenticated && (
                    <div className="header__auth">
                        <span className="header__role">
                            {isSuperAdmin
                                ? "Super Admin"
                                : isAdmin
                                    ? "Admin"
                                    : "User"}
                        </span>

                        <button
                            className="header__logout-btn"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                )}

            </nav>

        </header>
    );
}

export default Header;