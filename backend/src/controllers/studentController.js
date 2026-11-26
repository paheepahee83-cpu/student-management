
const bcrypt = require("bcryptjs");

const pool = require("../config/db");

const {
    createStudent,
    getAllStudents,
    getStudentById,
    getStudentByUserId,
    updateStudent,
    deleteStudent
} = require("../models/studentModel");


// STUDENT INPUT VALIDATION
const validateStudentInput = (data, isCreating = false) => {

    const errors = {};

    const {
        registrationNo,
        firstName,
        lastName,
        email,
        phoneNumber,
        password
    } = data;

    // Registration Number
    if (!registrationNo || !registrationNo.trim()) {
        errors.registrationNo = "Registration number is required.";
    } else if (!/^[A-Za-z0-9_-]+$/.test(registrationNo.trim())) {
        errors.registrationNo = "Registration number can contain only letters, numbers, hyphens and underscores.";
    }

    // First Name
    if (!firstName || !firstName.trim()) {
        errors.firstName = "First name is required.";
    } else if (!/^[A-Za-z\s]{3,}$/.test(firstName.trim())) {
        errors.firstName = "First name must contain at least 3 letters.";
    }

    // Last Name
    if (!lastName || !lastName.trim()) {
        errors.lastName = "Last name is required.";
    } else if (!/^[A-Za-z\s]{3,}$/.test(lastName.trim())) {
        errors.lastName = "Last name must contain at least 3 letters.";
    }

    // Email
    if (!email || !email.trim()) {
        errors.email = "Email address is required.";
    } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
        errors.email = "Please enter a valid email address.";
    }

    // Phone Number
    if (!phoneNumber || !phoneNumber.trim()) {
        errors.phoneNumber = "Phone number is required.";
    } else if (!/^\d{10}$/.test(phoneNumber.trim())) {
        errors.phoneNumber = "Phone number must contain exactly 10 digits.";
    }

    // Password (only when creating)
    if (isCreating && (!password || !password.trim())) {
        errors.password = "Password is required.";
    }

    return errors;
};


// CREATE STUDENT
const addStudent = async (req, res) => {

    const {
        registrationNo,
        firstName,
        lastName,
        email,
        phoneNumber,
        password
    } = req.body;

    let connection;

    try {

        // Validate student input
        const errors = validateStudentInput(req.body, true);

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please correct the student information.",
                errors
            });
        }

        // Get database connection
        connection = await pool.getConnection();

        // Start transaction
        await connection.beginTransaction();

        // Check duplicate username
        const [existingUser] = await connection.execute(
            `SELECT user_id
             FROM users
             WHERE username = ?
             LIMIT 1`,
            [registrationNo.trim()]
        );

        if (existingUser.length > 0) {

            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "Registration number is already registered."
            });
        }

        // Check duplicate email
        const [existingStudent] = await connection.execute(
            `SELECT student_id
             FROM students
             WHERE email = ?
             LIMIT 1`,
            [email.trim()]
        );

        if (existingStudent.length > 0) {

            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "Email address is already registered."
            });
        }

        // Hash student password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user account
        const [userResult] = await connection.execute(
            `INSERT INTO users
            (username, password_hash, role)
            VALUES (?, ?, 'STUDENT')`,
            [
                registrationNo.trim(),
                passwordHash
            ]
        );

        const userId = userResult.insertId;

        // Create student profile
        const createdStudent = await createStudent(
            connection,
            userId,
            registrationNo.trim(),
            firstName.trim(),
            lastName.trim(),
            email.trim(),
            phoneNumber.trim()
        );

        const studentId =
            createdStudent?.insertId ??
            createdStudent?.studentId ??
            createdStudent;

        // Commit transaction
        await connection.commit();

        return res.status(201).json({
            success: true,
            message: "Student account and profile created successfully.",
            student: {
                studentId,
                userId,
                registrationNo: registrationNo.trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                phoneNumber: phoneNumber.trim(),
                role: "STUDENT"
            }
        });

    } catch (error) {

        if (connection) {
            await connection.rollback();
        }

        console.error("Create student error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create student."
        });

    } finally {

        if (connection) {
            connection.release();
        }
    }
};


// GET ALL STUDENTS
const getStudents = async (req, res) => {

    try {

        const students = await getAllStudents();

        return res.status(200).json({
            success: true,
            count: students.length,
            students
        });

    } catch (error) {

        console.error("Get students error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve students."
        });
    }
};


// GET STUDENT BY ID
const getStudent = async (req, res) => {

    try {

        const studentId = req.params.id;

        if (!/^[1-9]\d*$/.test(studentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }

        const student = await getStudentById(studentId);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        return res.status(200).json({
            success: true,
            student
        });

    } catch (error) {

        console.error("Get student error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve student."
        });
    }
};


// UPDATE STUDENT
const editStudent = async (req, res) => {

    try {

        const studentId = req.params.id;

        if (!/^[1-9]\d*$/.test(studentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }

        const {
            registrationNo,
            firstName,
            lastName,
            email,
            phoneNumber
        } = req.body;

        // Validate student input
        const errors = validateStudentInput(req.body, false);

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please correct the student information.",
                errors
            });
        }

        // Check student exists
        const existingStudent = await getStudentById(studentId);

        if (!existingStudent) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        // Check duplicate registration number
        const [existingUser] = await pool.execute(
            `SELECT user_id
             FROM users
             WHERE username = ?
             AND user_id != ?
             LIMIT 1`,
            [
                registrationNo.trim(),
                existingStudent.user_id
            ]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Registration number is already registered."
            });
        }

        // Check duplicate email
        const [existingEmail] = await pool.execute(
            `SELECT student_id
             FROM students
             WHERE email = ?
             AND student_id != ?
             LIMIT 1`,
            [
                email.trim(),
                studentId
            ]
        );

        if (existingEmail.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email address is already registered."
            });
        }

        // Update student
        const result = await updateStudent(
            studentId,
            registrationNo.trim(),
            firstName.trim(),
            lastName.trim(),
            email.trim(),
            phoneNumber.trim()
        );

        return res.status(200).json({
            success: true,
            message: "Student updated successfully.",
            affectedRows: result.affectedRows
        });

    } catch (error) {

        console.error("Update student error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update student."
        });
    }
};


// DELETE STUDENT
const removeStudent = async (req, res) => {

    try {

        const studentId = req.params.id;

        if (!/^[1-9]\d*$/.test(studentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }

        const student = await getStudentById(studentId);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        const result = await deleteStudent(studentId);

        return res.status(200).json({
            success: true,
            message: "Student deleted successfully.",
            affectedRows: result.affectedRows
        });

    } catch (error) {

        console.error("Delete student error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete student."
        });
    }
};


// GET CURRENT STUDENT'S OWN PROFILE
const getMyProfile = async (req, res) => {

    try {

        const student = await getStudentByUserId(
            req.user.userId
        );

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found."
            });
        }

        return res.status(200).json({
            success: true,
            student
        });

    } catch (error) {

        console.error("Get my profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve profile."
        });
    }
};


// EXPORT CONTROLLERS
module.exports = {
    addStudent,
    getStudents,
    getStudent,
    getMyProfile,
    editStudent,
    removeStudent
};
