
import { useEffect, useState } from "react";
import { LuX, LuEye, LuEyeOff } from "react-icons/lu";

import apiRequest from "../services/api";

import "../styles/studentFormModal.css";

function StudentFormModal({
    show,
    editingStudent,
    onClose,
    onSuccess,
    onAuthError
}) {

    const initialFormData = {
        registrationNo: "",
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        password: ""
    };

    const [formData, setFormData] = useState(initialFormData);

    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const [showPassword, setShowPassword] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (!show) return;

        if (editingStudent) {
            setFormData({
                registrationNo: editingStudent.registration_no || "",
                firstName: editingStudent.first_name || "",
                lastName: editingStudent.last_name || "",
                email: editingStudent.email || "",
                phoneNumber: editingStudent.phone_number || "",
                password: ""
            });
        } else {
            setFormData(initialFormData);
        }

        setShowPassword(false);
        setFormError("");
        setFieldErrors({});

    }, [editingStudent, show]);

    // Validate student form
    const validateForm = () => {

        const errors = {};

        const {
            registrationNo,
            firstName,
            lastName,
            email,
            phoneNumber,
            password
        } = formData;

        // Registration Number
        if (!registrationNo.trim()) {
            errors.registrationNo = "Registration number is required.";
        } else if (!/^[A-Za-z0-9_-]+$/.test(registrationNo.trim())) {
            errors.registrationNo =
                "Only letters, numbers, hyphens and underscores are allowed.";
        }

        // First Name
        if (!firstName.trim()) {
            errors.firstName = "First name is required.";
        } else if (!/^[A-Za-z\s]{3,}$/.test(firstName.trim())) {
            errors.firstName =
                "First name must contain at least 3 letters.";
        }

        // Last Name
        if (!lastName.trim()) {
            errors.lastName = "Last name is required.";
        } else if (!/^[A-Za-z\s]{3,}$/.test(lastName.trim())) {
            errors.lastName =
                "Last name must contain at least 3 letters.";
        }

        // Email
        if (!email.trim()) {
            errors.email = "Email address is required.";
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            errors.email = "Please enter a valid email address.";
        }

        // Phone Number
        if (!phoneNumber.trim()) {
            errors.phoneNumber = "Phone number is required.";
        } else if (!/^\d{10}$/.test(phoneNumber.trim())) {
            errors.phoneNumber =
                "Phone number must contain exactly 10 digits.";
        }

        // Password (Add Student only)
        if (!editingStudent && !password.trim()) {
            errors.password = "Password is required.";
        }

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;
    };

    // Handle Input Changes
    const handleInputChange = (event) => {

        const { name, value } = event.target;

        setFormData(previous => ({
            ...previous,
            [name]: value
        }));

        // Clear the changed field's error
        setFieldErrors(previous => ({
            ...previous,
            [name]: ""
        }));

        setFormError("");
    };

    // Handle Close
    const handleClose = () => {

        if (formLoading) return;

        setFormError("");
        setFieldErrors({});

        onClose();
    };

    // Handle Form Submission
    const handleSubmit = async (event) => {

        event.preventDefault();

        setFormError("");

        // Frontend validation
        if (!validateForm()) {
            return;
        }

        try {

            setFormLoading(true);

            const studentData = {
                registrationNo: formData.registrationNo.trim(),
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                phoneNumber: formData.phoneNumber.trim()
            };

            if (editingStudent) {

                await apiRequest(
                    `/api/students/${editingStudent.student_id}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(studentData)
                    }
                );

            } else {

                await apiRequest(
                    "/api/students/",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            ...studentData,
                            password: formData.password
                        })
                    }
                );
            }

            onSuccess();
            handleClose();

        } catch (error) {

            console.error("Student save error:", error);

            if (error.status === 401) {
                onAuthError();
                return;
            }

            if (error.status === 403) {
                setFormError(
                    "You do not have permission to modify students."
                );
                return;
            }

            // Handle backend validation errors
            if (error.status === 400 && error.errors) {

                setFieldErrors(error.errors);

                setFormError(
                    error.message || "Please correct the student information."
                );

                return;
            }

            setFormError(
                error.message || "Failed to save student."
            );

        } finally {

            setFormLoading(false);
        }
    };

    if (!show) return null;

    // Reusable Input Field
    const renderInput = (name, label, type = "text") => (

        <div className="form-group">

            <label htmlFor={name}>
                {label}
            </label>

            <input
                id={name}
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleInputChange}
                disabled={formLoading}
                className={fieldErrors[name] ? "is-invalid" : ""}
                aria-invalid={Boolean(fieldErrors[name])}
                aria-describedby={
                    fieldErrors[name] ? `${name}-error` : undefined
                }
            />

            {fieldErrors[name] && (
                <small
                    id={`${name}-error`}
                    className="field-error"
                >
                    {fieldErrors[name]}
                </small>
            )}

        </div>
    );

    return (

        <div
            className="modal-overlay"
            onClick={handleClose}
        >

            <div
                className="modal-content student-form-card"
                onClick={(e) => e.stopPropagation()}
            >

                <div className="form-card-header">

                    <div>
                        <h3>
                            {editingStudent
                                ? "Edit Student"
                                : "Add New Student"
                            }
                        </h3>

                        <p>
                            {editingStudent
                                ? "Update student information."
                                : "Create a new student account."
                            }
                        </p>
                    </div>

                    <button
                        type="button"
                        className="close-form-button"
                        onClick={handleClose}
                        disabled={formLoading}
                        aria-label="Close"
                    >
                        <LuX size={20} />
                    </button>

                </div>

                {formError && (
                    <div className="dashboard-error">
                        {formError}
                    </div>
                )}

                <form
                    className="student-form"
                    onSubmit={handleSubmit}
                    noValidate
                >

                    {renderInput(
                        "registrationNo",
                        "Registration Number"
                    )}

                    {renderInput(
                        "firstName",
                        "First Name"
                    )}

                    {renderInput(
                        "lastName",
                        "Last Name"
                    )}

                    {renderInput(
                        "email",
                        "Email",
                        "email"
                    )}

                    {renderInput(
                        "phoneNumber",
                        "Phone Number"
                    )}

                    {!editingStudent && (

                        <div className="form-group">

                            <label htmlFor="password">
                                Password
                            </label>

                            <div className="password-input-wrapper">

                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    disabled={formLoading}
                                    className={
                                        fieldErrors.password
                                            ? "is-invalid"
                                            : ""
                                    }
                                    aria-invalid={Boolean(fieldErrors.password)}
                                />

                                <button
                                    type="button"
                                    className="password-toggle-button"
                                    onClick={() =>
                                        setShowPassword(previous => !previous)
                                    }
                                    disabled={formLoading}
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPassword
                                        ? <LuEyeOff size={20} />
                                        : <LuEye size={20} />
                                    }
                                </button>

                            </div>

                            {fieldErrors.password && (
                                <small className="field-error">
                                    {fieldErrors.password}
                                </small>
                            )}

                        </div>
                    )}

                    <div className="form-actions">

                        <button
                            type="button"
                            className="cancel-button"
                            onClick={handleClose}
                            disabled={formLoading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="save-button"
                            disabled={formLoading}
                        >
                            {formLoading
                                ? "Saving..."
                                : editingStudent
                                    ? "Update Student"
                                    : "Create Student"
                            }
                        </button>

                    </div>

                </form>

            </div>
        </div>
    );
}

export default StudentFormModal;
