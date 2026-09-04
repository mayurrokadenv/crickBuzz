import { useState } from "react";
import { loginAdmin } from "../services/adminservice";
import { useAuth } from "../context/AuthContext";
import "../styles/Login.css";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header/Header";

function Login() {
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));

        setError("");
    };

    const handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        const email = formData.email.trim();
        const password = formData.password.trim();

        const companyEmailRegex =
            /^[a-zA-Z0-9._%+-]+@newvision-software\.com$/i;

        // Both fields empty
        if (!email && !password) {
            setError("Email and Password are required");
            return;
        }

        // Email empty
        if (!email) {
            setError("Please enter your email address");
            return;
        }

        // Email contains spaces
        if (/\s/.test(formData.email)) {
            setError("Email cannot contain spaces");
            return;
        }

        // Only company email allowed
        if (!companyEmailRegex.test(email)) {
            setError(
                "Please use your company email (@newvision-software.com)"
            );
            return;
        }

        // Password empty
        if (!password) {
            setError("Please enter your password");
            return;
        }

        // Password contains spaces
        if (/\s/.test(formData.password)) {
            setError("Password cannot contain spaces");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await loginAdmin({
                email: formData.email,
                password: formData.password
            });

            login(response.token, response.role);

            navigate("/");
        } catch (error) {
            console.error("Login Error:", error);
            setError("Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-container">
            <Header />

            <section className="login-card">

                <h1 className="login-title">
                    Login
                </h1>

                <p className="login-subtitle">
                    Login to your Admin Account
                </p>

                <form onSubmit={handleSubmit}>

                    {/* Email */}
                    <div className="login-form-group">
                        <label className="login-form-label">
                            Email <span className="required">*</span>
                        </label>

                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="login-form-input"
                            placeholder="Enter your email"
                        />
                    </div>

                    {/* Password */}
                    <div className="login-form-group">
                        <label className="login-form-label">
                            Password <span className="required">*</span>
                        </label>

                        <div className="password-input-wrapper">

                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="login-form-input password-input"
                                placeholder="Enter your password"
                            />

                            <button
                                type="button"
                                className="show-password-btn"
                                onClick={() =>
                                    setShowPassword((prev) => !prev)
                                }
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >
                                {showPassword ? (
                                    // Eye with slash
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M3 3l18 18" />
                                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                        <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 9 4 10 8a11.8 11.8 0 0 1-4.1 5.4" />
                                        <path d="M6.6 6.6A11.8 11.8 0 0 0 2 12c1 4 5 8 10 8a10.8 10.8 0 0 0 3.4-.5" />
                                    </svg>
                                ) : (
                                    // Eye
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="3"
                                        />
                                    </svg>
                                )}
                            </button>

                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="login-error">
                            {error}
                        </p>
                    )}

                    {/* Login Button */}
                    <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                    {/* Register */}
                    <span className="login-register-link">
                        Don't have an account ?{" "}
                        <Link to="/register">
                            Register
                        </Link>
                    </span>

                </form>

            </section>
        </main>
    );
}

export default Login;