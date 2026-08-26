import { useState } from "react";

import "./RegistrationForm.css";

import { registerAdmin } from "../services/adminservice";

import { useNavigate } from "react-router-dom";

import {
    showError,
    showSuccess
} from "../services/common/AlertService";

import { useRegistration } from "../context/RegistrationContext";

import Header from "../components/Header/Header";

function RegistrationForm() {
    const {
        formData,
        setFormData,
        errors,
        setErrors
    } = useRegistration();

    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));

        setErrors((prev) => ({
            ...prev,
            [name]: ""
        }));
    };

    const validateForm = () => {
        const newErrors = {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            confirmPassword: ""
        };

        let isValid = true;

        // First Name
        if (!formData.firstName.trim()) {
            newErrors.firstName = "First Name is required";
            isValid = false;
        }

        // Last Name
        if (!formData.lastName.trim()) {
            newErrors.lastName = "Last Name is required";
            isValid = false;
        }

        // Company Email
        const companyEmailRegex =
            /^[a-zA-Z0-9._%+-]+@newvision-software\.com$/i;

        const email = formData.email.trim();

        if (!email) {
            newErrors.email = "Email is required";
            isValid = false;
        } else if (/\s/.test(formData.email)) {
            newErrors.email = "Email cannot contain spaces";
            isValid = false;
        } else if (!companyEmailRegex.test(email)) {
            newErrors.email =
                "Please use your company email (@newvision-software.com)";
            isValid = false;
        }

        // Password
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!formData.password) {
            newErrors.password = "Password is required";
            isValid = false;
        } else if (/\s/.test(formData.password)) {
            newErrors.password =
                "Password cannot contain spaces";
            isValid = false;
        } else if (!passwordRegex.test(formData.password)) {
            newErrors.password =
                "Password must be at least 8 characters and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.";
            isValid = false;
        }

        // Confirm Password
        if (!formData.confirmPassword) {
            newErrors.confirmPassword =
                "Confirm Password is required";
            isValid = false;
        } else if (
            formData.password !== formData.confirmPassword
        ) {
            newErrors.confirmPassword =
                "Passwords do not match. Please make sure both passwords are the same.";
            isValid = false;
        }

        setErrors(newErrors);

        return isValid;
    };

    const handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            const registrationData = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                password: formData.password
            };

            const result = await registerAdmin(registrationData);

            console.log(
                "Registration response:",
                result
            );

            await showSuccess(
                "Success",
                "Registration successful. Waiting for Super Admin approval."
            );

            setFormData({
                firstName: "",
                lastName: "",
                email: "",
                password: "",
                confirmPassword: ""
            });

            setErrors({
                firstName: "",
                lastName: "",
                email: "",
                password: "",
                confirmPassword: ""
            });

            setShowPassword(false);
            setShowConfirmPassword(false);

        } catch (error) {
            console.error(
                "Registration error:",
                error
            );

            showError(
                "Error",
                "Registration failed"
            );
        }
    };

    return (
        <div className="registration-container">

            <Header />

            <div className="registration-card">

                <h1 className="registration-title">
                    Register
                </h1>

                <p className="registration-subtitle">
                    Create Admin Account
                </p>

                <form onSubmit={handleSubmit}>

                    {/* First Name */}
                    <div className="form-group">

                        <label className="form-label">
                            First Name{" "}
                            <span className="required">
                                *
                            </span>
                        </label>

                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Enter first name"
                        />

                        {errors.firstName && (
                            <p className="error-text">
                                {errors.firstName}
                            </p>
                        )}

                    </div>

                    {/* Last Name */}
                    <div className="form-group">

                        <label className="form-label">
                            Last Name{" "}
                            <span className="required">
                                *
                            </span>
                        </label>

                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Enter last name"
                        />

                        {errors.lastName && (
                            <p className="error-text">
                                {errors.lastName}
                            </p>
                        )}

                    </div>

                    {/* Email */}
                    <div className="form-group">

                        <label className="form-label">
                            Email{" "}
                            <span className="required">
                                *
                            </span>
                        </label>

                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="name@newvision-software.com"
                        />

                        {errors.email && (
                            <p className="error-text">
                                {errors.email}
                            </p>
                        )}

                    </div>

                    {/* Password */}
                    <div className="form-group">

                        <label className="form-label">
                            Password{" "}
                            <span className="required">
                                *
                            </span>
                        </label>

                        <div className="password-input-wrapper">

                            <input
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="form-input password-input"
                                placeholder="Enter password"
                            />

                            <button
                                type="button"
                                className="show-password-btn"
                                onClick={() =>
                                    setShowPassword(
                                        (prev) => !prev
                                    )
                                }
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >
                                {showPassword ? (

                                    /* Eye Off */
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

                                    /* Eye */
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

                        {errors.password && (
                            <p className="error-text">
                                {errors.password}
                            </p>
                        )}

                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">

                        <label className="form-label">
                            Confirm Password{" "}
                            <span className="required">
                                *
                            </span>
                        </label>

                        <div className="password-input-wrapper">

                            <input
                                type={
                                    showConfirmPassword
                                        ? "text"
                                        : "password"
                                }
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="form-input password-input"
                                placeholder="Confirm password"
                            />

                            <button
                                type="button"
                                className="show-password-btn"
                                onClick={() =>
                                    setShowConfirmPassword(
                                        (prev) => !prev
                                    )
                                }
                                aria-label={
                                    showConfirmPassword
                                        ? "Hide confirm password"
                                        : "Show confirm password"
                                }
                            >
                                {showConfirmPassword ? (

                                    /* Eye Off */
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

                                    /* Eye */
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

                        {errors.confirmPassword && (
                            <p className="error-text">
                                {errors.confirmPassword}
                            </p>
                        )}

                    </div>

                    {/* Register Button */}
                    <button
                        type="submit"
                        className="register-btn"
                    >
                        Register
                    </button>

                    {/* Login Link */}
                    <p className="registration-login-link">
                        Already registered?{" "}

                        <button
                            type="button"
                            className="registration-login-btn"
                            onClick={() =>
                                navigate("/login")
                            }
                        >
                            Login
                        </button>
                    </p>

                </form>

            </div>

        </div>
    );
}

export default RegistrationForm;