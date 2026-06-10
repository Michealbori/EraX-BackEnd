import express from "express";
import {
  createInvestment,
  getUserInvestments,
  earlyWithdrawal,
  getSurveyQuestions,
  submitSurvey,
  claimInterest
} from "../controllers/investment.controller.js";

const router = express.Router();

router.post("/create", createInvestment);
router.get("/user/:email", getUserInvestments);
router.post("/early-withdrawal/:id", earlyWithdrawal);
router.get("/survey-questions/:investmentId", getSurveyQuestions);
router.post("/submit-survey/:id", submitSurvey);
router.post("/claim-interest/:id", claimInterest);

export default router;