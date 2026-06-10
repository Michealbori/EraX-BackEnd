import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d"
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { email, password, fullName, firstName, lastName } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email"
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: fullName || `${firstName || ''} ${lastName || ''}`.trim(),
      firstName,
      lastName,
      isAdmin: false,
      isVerified: false
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified
      },
      token
    });

  } catch (error) {
    console.error("❌ REGISTER ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register user",
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    user.lastIp = req.ip || req.connection.remoteAddress;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        balances: user.balances
      },
      token
    });

  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error("❌ GET PROFILE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update fields
    user.fullName = req.body.fullName || user.fullName;
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin
      }
    });

  } catch (error) {
    console.error("❌ UPDATE PROFILE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
};