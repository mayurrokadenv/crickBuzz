import react from "react";
import "./RegistrationForm.css";
import { registerAdmin } from "../services/adminservice";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess } from "../services/common/AlertService";
import { useRegistration } from "../context/RegistrationContext";
import Header from "../components/Header/Header";

function RegistrationForm() {
    const {
    formData,
    setFormData,
    errors,
    setErrors,
    resetForm
} = useRegistration();
    
    

    const navigate = useNavigate();

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

        if (!formData.firstName.trim()) {
            newErrors.firstName = "First Name is required";
            isValid = false;
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = "Last Name is required";
            isValid = false;
        }

        const companyEmailRegex =
            /^[a-zA-Z0-9._%+-]+@newvision-software\.com$/;

        if (!companyEmailRegex.test(formData.email)) {
            newErrors.email =
                "Please use your company email (@newvision-software.com)";
            isValid = false;
        }

        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!passwordRegex.test(formData.password)) {
            newErrors.password =
                "Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character";
            isValid = false;
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword =
                "Passwords do not match";
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
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password
            };

            const result = await registerAdmin(registrationData);

            console.log("Registration response:", result);

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

        } catch (error) {
            console.error("Registration error:", error);
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

                    <div className="form-group">
                        <label className="form-label">
                            First Name
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

                    <div className="form-group">
                        <label className="form-label">
                            Last Name
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

                    <div className="form-group">
                        <label className="form-label">
                            Email
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

                    <div className="form-group">
                        <label className="form-label">
                            Password
                        </label>

                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Enter password"
                        />

                        {errors.password && (
                            <p className="error-text">
                                {errors.password}
                            </p>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Confirm Password
                        </label>

                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Confirm password"
                        />

                        {errors.confirmPassword && (
                            <p className="error-text">
                                {errors.confirmPassword}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="register-btn"
                    >
                        Register
                    </button>

                    <p className="registration-login-link">
                        Already registered ?{" "}
                        <button
                            type="button"
                            className="registration-login-btn"
                            onClick={() => navigate("/login")}
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