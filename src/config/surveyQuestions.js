export const SURVEY_QUESTION_POOL = [
  // =====================================================
  // CATEGORY 1: FANG & BIG TECH (Questions 1-20)
  // =====================================================
  { id: 1, category: "FANG", question: "Which FANG company do you believe has the strongest growth potential in the next 12 months?", options: ["Meta (Facebook)", "Amazon", "Netflix", "Alphabet (Google)", "Apple"] },
  { id: 2, category: "FANG", question: "How would you rate Apple's current services revenue growth trajectory?", options: ["Excellent - Accelerating", "Good - Steady growth", "Average - Plateauing", "Poor - Declining", "Too early to assess"] },
  { id: 3, category: "FANG", question: "Which company's AI strategy do you find most promising for long-term value creation?", options: ["Google (DeepMind/Gemini)", "Meta (Llama open-source)", "Amazon (AWS/Alexa)", "Apple (On-device AI)", "Microsoft (OpenAI partnership)"] },
  { id: 4, category: "FANG", question: "How concerned are you about regulatory antitrust actions against Big Tech companies?", options: ["Very concerned - Major risk", "Somewhat concerned", "Neutral - Manageable", "Not very concerned", "Not concerned at all"] },
  { id: 5, category: "FANG", question: "Which FANG stock demonstrates the most resilience during market downturns?", options: ["Meta", "Amazon", "Netflix", "Alphabet", "Apple"] },
  { id: 6, category: "FANG", question: "How effective do you view Netflix's ad-supported subscription tier strategy?", options: ["Highly effective - Game changer", "Somewhat effective", "Neutral impact", "Ineffective strategy", "Too early to tell"] },
  { id: 7, category: "FANG", question: "Which company possesses the most sustainable competitive moat?", options: ["Apple (Ecosystem lock-in)", "Amazon (Logistics/Cloud dominance)", "Google (Search data monopoly)", "Meta (Social network effects)", "Netflix (Content library)"] },
  { id: 8, category: "FANG", question: "Which tech giant is best positioned to dominate the AR/VR market by 2030?", options: ["Apple (Vision Pro)", "Meta (Quest/Metaverse)", "Google (Android XR)", "Amazon (Alexa integration)", "Microsoft (HoloLens/Enterprise)"] },
  { id: 9, category: "FANG", question: "How do you assess Amazon's AWS cloud computing competitive position?", options: ["Dominant leader", "Strong but facing competition", "Losing market share", "Innovating rapidly", "Uncertain outlook"] },
  { id: 10, category: "FANG", question: "Which company's advertising business model is most sustainable long-term?", options: ["Google (Search ads)", "Meta (Social ads)", "Amazon (Product ads)", "Apple (Privacy-focused)", "Netflix (Ad-tier emerging)"] },
  { id: 11, category: "FANG", question: "How important is Apple's iPhone upgrade cycle to its overall valuation?", options: ["Critical - Core driver", "Very important", "Moderately important", "Less important now", "Not important - Services matter more"] },
  { id: 12, category: "FANG", question: "Which FANG company has the best capital allocation strategy?", options: ["Apple (Buybacks/Dividends)", "Alphabet (R&D investment)", "Amazon (Reinvestment)", "Meta (Metaverse bet)", "Netflix (Content spending)"] },
  { id: 13, category: "FANG", question: "How do you view Meta's Reality Labs investment in the metaverse?", options: ["Brilliant long-term bet", "Risky but promising", "Wasteful spending", "Necessary innovation", "Too early to judge"] },
  { id: 14, category: "FANG", question: "Which company's data privacy approach do you trust most?", options: ["Apple (Privacy-first)", "Google (Transparent controls)", "Microsoft (Enterprise focus)", "Amazon (Limited collection)", "Meta (Improving)"] },
  { id: 15, category: "FANG", question: "How likely is a major antitrust breakup of any FANG company in the next 5 years?", options: ["Very likely", "Somewhat likely", "Possible but unlikely", "Unlikely", "Very unlikely"] },
  { id: 16, category: "FANG", question: "Which tech CEO do you believe has the best vision for the next decade?", options: ["Tim Cook (Apple)", "Sundar Pichai (Alphabet)", "Andy Jassy (Amazon)", "Mark Zuckerberg (Meta)", "Reed Hastings (Netflix)"] },
  { id: 17, category: "FANG", question: "How do you assess the competitive threat from TikTok to Meta's platforms?", options: ["Existential threat", "Significant challenge", "Manageable competition", "Minor impact", "No real threat"] },
  { id: 18, category: "FANG", question: "Which company's subscription services bundle offers the best value?", options: ["Apple One", "Amazon Prime", "Google One", "Meta (None yet)", "Netflix (Standalone)"] },
  { id: 19, category: "FANG", question: "How important is international expansion to FANG growth?", options: ["Critical - Primary growth driver", "Very important", "Moderately important", "Less important", "Saturated markets"] },
  { id: 20, category: "FANG", question: "Which FANG stock would you hold for the next 10 years?", options: ["Apple", "Amazon", "Alphabet", "Meta", "Netflix"] },

  // =====================================================
  // CATEGORY 2: MARKET OUTLOOK (Questions 21-40)
  // =====================================================
  { id: 21, category: "Market", question: "How confident are you in the US stock market performance over the next 6 months?", options: ["Very bullish - Strong gains expected", "Somewhat bullish", "Neutral - Sideways movement", "Somewhat bearish", "Very bearish - Decline expected"] },
  { id: 22, category: "Market", question: "What is your primary concern for the global economy right now?", options: ["Persistent inflation", "Rising interest rates", "Geopolitical conflicts", "Recession risk", "Tech bubble burst"] },
  { id: 23, category: "Market", question: "How do you expect the Federal Reserve to handle interest rates this year?", options: ["Aggressive rate cuts", "Moderate cuts", "Hold rates steady", "Moderate hikes", "Aggressive hikes"] },
  { id: 24, category: "Market", question: "Which sector do you believe will outperform the broader market this year?", options: ["Healthcare/Biotech", "Energy", "Financials", "Consumer Staples", "Technology will continue leading"] },
  { id: 25, category: "Market", question: "What percentage of your portfolio is currently allocated to international stocks?", options: ["0-10% - US focused", "11-25%", "26-50%", "51-75%", "76-100% - International focused"] },
  { id: 26, category: "Market", question: "How do you view current stock market valuations overall?", options: ["Massively overvalued - Bubble", "Slightly overvalued", "Fairly valued", "Slightly undervalued", "Significantly undervalued"] },
  { id: 27, category: "Market", question: "What is your outlook on emerging markets for the next 12 months?", options: ["Very positive - Strong growth", "Somewhat positive", "Neutral", "Somewhat negative", "Very negative - Avoid"] },
  { id: 28, category: "Market", question: "How likely is a US recession in the next 12 months?", options: ["Very likely - Preparing for it", "Somewhat likely", "Possible but not probable", "Unlikely", "Very unlikely - Economy strong"] },
  { id: 29, category: "Market", question: "Which asset class do you expect to perform best this year?", options: ["US Equities", "International Equities", "Bonds/Fixed Income", "Real Estate", "Commodities/Gold"] },
  { id: 30, category: "Market", question: "How do you assess the current risk of a stock market correction (10%+ drop)?", options: ["Very high - Imminent", "Elevated - Likely soon", "Moderate - Possible", "Low - Unlikely", "Very low - Bull market continues"] },
  { id: 31, category: "Market", question: "What impact do you expect AI developments to have on stock markets?", options: ["Transformative - Massive gains", "Significant positive impact", "Moderate benefit", "Minimal impact", "Overhyped - No real impact"] },
  { id: 32, category: "Market", question: "How do you view the relationship between inflation and stock returns?", options: ["High inflation hurts stocks", "Moderate inflation is fine", "Low inflation is best", "Deflation is worst", "No clear relationship"] },
  { id: 33, category: "Market", question: "Which economic indicator do you watch most closely?", options: ["GDP growth", "Unemployment rate", "CPI/Inflation", "Consumer confidence", "Manufacturing PMI"] },
  { id: 34, category: "Market", question: "How important is dividend income to your investment strategy?", options: ["Critical - Primary focus", "Very important", "Somewhat important", "Not very important", "Irrelevant - Growth focused"] },
  { id: 35, category: "Market", question: "What is your view on small-cap vs large-cap stocks currently?", options: ["Small-caps will outperform", "Large-caps safer", "Equal opportunity", "Depends on sector", "Avoid small-caps entirely"] },
  { id: 36, category: "Market", question: "How do geopolitical tensions affect your investment decisions?", options: ["Major factor - Avoid risk", "Significant consideration", "Moderate factor", "Minor consideration", "Ignore geopolitics"] },
  { id: 37, category: "Market", question: "What is your outlook on the housing market's impact on the economy?", options: ["Crash incoming - Major risk", "Correction likely", "Stabilizing", "Strong - No issues", "Regional variations only"] },
  { id: 38, category: "Market", question: "How do you assess the current credit market conditions?", options: ["Tightening - Risk of defaults", "Normal conditions", "Accommodative", "Too loose - Bubble risk", "Uncertain"] },
  { id: 39, category: "Market", question: "Which currency do you believe will strengthen most this year?", options: ["US Dollar", "Euro", "Japanese Yen", "British Pound", "Emerging market currencies"] },
  { id: 40, category: "Market", question: "How important is market timing to your investment success?", options: ["Critical - Essential skill", "Very important", "Somewhat important", "Less important than selection", "Impossible - Don't try"] },

  // =====================================================
  // CATEGORY 3: INVESTMENT HABITS (Questions 41-60)
  // =====================================================
  { id: 41, category: "Habits", question: "How often do you actively check your investment portfolio performance?", options: ["Multiple times daily", "Once per day", "Once per week", "Once per month", "Rarely - Buy and hold"] },
  { id: 42, category: "Habits", question: "What is your primary source for financial news and market analysis?", options: ["Social media (X/Reddit/StockTwits)", "Financial news sites (Bloomberg/CNBC)", "Podcasts and YouTube", "Friends and family recommendations", "Brokerage research reports"] },
  { id: 43, category: "Habits", question: "How do you typically react to a sudden 10% portfolio drop?", options: ["Buy more - See it as opportunity", "Hold steady - Wait it out", "Sell some - Reduce risk", "Sell all - Exit completely", "Panic and make emotional decisions"] },
  { id: 44, category: "Habits", question: "What percentage of your income do you currently invest monthly?", options: ["0-5% - Just starting", "6-15%", "16-25%", "26-40%", "40%+ - Aggressive saver"] },
  { id: 45, category: "Habits", question: "How do you approach investment research before buying?", options: ["Extensive - Days of research", "Moderate - Few hours", "Basic - Quick check", "Minimal - Follow trends", "None - Impulse buys"] },
  { id: 46, category: "Habits", question: "What is your preferred investment vehicle?", options: ["Individual stocks", "ETFs and index funds", "Mutual funds", "Cryptocurrency", "Bonds and fixed income"] },
  { id: 47, category: "Habits", question: "How important are ESG (Environmental, Social, Governance) factors in your investment decisions?", options: ["Critical - Deal breaker", "Very important", "Somewhat important", "Not very important", "Completely irrelevant"] },
  { id: 48, category: "Habits", question: "Do you use dollar-cost averaging for your investments?", options: ["Always - Strict schedule", "Usually - Most investments", "Sometimes - Selective", "Rarely - Lump sum preferred", "Never - Market time instead"] },
  { id: 49, category: "Habits", question: "How do you handle investment losses?", options: ["Learn and adjust strategy", "Hold and wait for recovery", "Sell immediately - Cut losses", "Average down - Buy more", "Ignore and don't check"] },
  { id: 50, category: "Habits", question: "What role does emotional discipline play in your investing?", options: ["Critical - Most important factor", "Very important", "Somewhat important", "Less important than analysis", "Overrated - Emotions help intuition"] },
  { id: 51, category: "Habits", question: "How often do you rebalance your portfolio?", options: ["Quarterly - Strict schedule", "Semi-annually", "Annually", "Only when significantly off target", "Never - Let it run"] },
  { id: 52, category: "Habits", question: "Do you set stop-loss orders on your investments?", options: ["Always - On every position", "Usually - On risky stocks", "Sometimes - Selective", "Rarely - Trust my picks", "Never - Long-term holder"] },
  { id: 53, category: "Habits", question: "How do you approach investment taxes?", options: ["Tax-loss harvesting actively", "Consider tax implications", "Somewhat aware", "Minimal consideration", "Ignore taxes completely"] },
  { id: 54, category: "Habits", question: "What is your biggest investment mistake so far?", options: ["Selling too early", "Holding too long", "Not diversifying enough", "Following hype", "Not investing sooner"] },
  { id: 55, category: "Habits", question: "How do you evaluate investment advice from others?", options: ["Verify independently always", "Consider source credibility", "Sometimes follow blindly", "Often trust others", "Always follow tips"] },
  { id: 56, category: "Habits", question: "What time of day do you prefer to make investment decisions?", options: ["Market open - First hour", "Mid-day - After morning volatility", "Market close - Last hour", "After hours - No pressure", "Weekends - When relaxed"] },
  { id: 57, category: "Habits", question: "How do you track your investment performance?", options: ["Detailed spreadsheet", "Brokerage app only", "Mental tracking", "Annual review only", "Don't track closely"] },
  { id: 58, category: "Habits", question: "What is your approach to investment fees?", options: ["Minimize at all costs", "Important consideration", "Somewhat important", "Willing to pay for quality", "Fees don't matter much"] },
  { id: 59, category: "Habits", question: "How do you handle market volatility?", options: ["See it as opportunity", "Stay calm and hold", "Somewhat stressful", "Very stressful", "Panic and sell"] },
  { id: 60, category: "Habits", question: "What is your investment education approach?", options: ["Continuous learning - Courses/books", "Regular reading - News/articles", "Occasional learning", "Learn from mistakes", "No formal education"] },

  // =====================================================
  // CATEGORY 4: TECHNOLOGY & INNOVATION (Questions 61-80)
  // =====================================================
  { id: 61, category: "Tech", question: "Which emerging technology will have the biggest financial market impact by 2030?", options: ["Artificial Intelligence/Machine Learning", "Quantum Computing", "Blockchain/Web3/Crypto", "Biotechnology/Genomics", "Renewable Energy Tech"] },
  { id: 62, category: "Tech", question: "How do you view the current valuation of AI-related stocks?", options: ["Massively overvalued - Bubble", "Slightly overvalued", "Fairly valued", "Slightly undervalued", "Significantly undervalued"] },
  { id: 63, category: "Tech", question: "Which tech sector excites you most for long-term investment?", options: ["AI and Machine Learning", "Cloud Computing", "Cybersecurity", "Fintech", "Clean Tech/Green Energy"] },
  { id: 64, category: "Tech", question: "How important is cloud computing growth to your tech investment thesis?", options: ["Critical - Core holding", "Very important", "Somewhat important", "Not very important", "Don't follow cloud sector"] },
  { id: 65, category: "Tech", question: "What is your view on cryptocurrency as an investment asset?", options: ["Essential portfolio component", "Good diversification", "Speculative but promising", "Too risky - Avoid", "Complete scam"] },
  { id: 66, category: "Tech", question: "Which company is leading the AI race?", options: ["OpenAI/Microsoft", "Google/DeepMind", "Meta", "Amazon", "Apple"] },
  { id: 67, category: "Tech", question: "How do you assess the commercial viability of quantum computing?", options: ["Ready now - Invest heavily", "5 years away", "10 years away", "20+ years - Too early", "Never practical"] },
  { id: 68, category: "Tech", question: "What is your outlook on electric vehicle stocks?", options: ["Massive growth ahead", "Moderate growth", "Saturated market", "Declining interest", "Bubble about to burst"] },
  { id: 69, category: "Tech", question: "How important is semiconductor/chip stocks to your portfolio?", options: ["Core holding - Critical", "Important sector", "Somewhat important", "Not very important", "Avoid - Too cyclical"] },
  { id: 70, category: "Tech", question: "Which tech trend do you believe is most overhyped?", options: ["Metaverse", "NFTs", "Cryptocurrency", "AI hype", "Space tech"] },
  { id: 71, category: "Tech", question: "How do you view the future of remote work technology stocks?", options: ["Permanent shift - Strong growth", "Hybrid future - Moderate", "Return to office - Decline", "Cyclical - Depends on economy", "Uncertain"] },
  { id: 72, category: "Tech", question: "What is your assessment of 5G infrastructure investment opportunity?", options: ["Massive opportunity", "Good long-term play", "Moderate potential", "Overinvested already", "Not interesting"] },
  { id: 73, category: "Tech", question: "How do you view autonomous vehicle technology investment?", options: ["Revolutionary - Invest now", "Promising but risky", "Too early - Wait", "Overhyped - Avoid", "Never practical"] },
  { id: 74, category: "Tech", question: "Which tech regulation concern worries you most?", options: ["Data privacy laws", "Antitrust actions", "AI regulation", "Content moderation", "International restrictions"] },
  { id: 75, category: "Tech", question: "How important is R&D spending when evaluating tech stocks?", options: ["Critical - Must innovate", "Very important", "Somewhat important", "Less important than profits", "Irrelevant"] },
  { id: 76, category: "Tech", question: "What is your view on space technology investments?", options: ["Next frontier - Invest heavily", "Interesting but risky", "Too speculative", "Long-term only", "Not investable yet"] },
  { id: 77, category: "Tech", question: "How do you assess cybersecurity stocks currently?", options: ["Essential - Must own", "Strong sector", "Growing but expensive", "Saturated", "Not interesting"] },
  { id: 78, category: "Tech", question: "Which tech business model do you prefer?", options: ["SaaS subscriptions", "E-commerce", "Advertising", "Hardware sales", "Marketplace/platform"] },
  { id: 79, category: "Tech", question: "How do you view the future of social media stocks?", options: ["Strong growth continues", "Mature but stable", "Declining engagement", "Regulatory risk high", "Avoid entirely"] },
  { id: 80, category: "Tech", question: "What is your assessment of tech stock concentration risk?", options: ["Very dangerous - Diversify", "Somewhat risky", "Manageable", "Not a concern", "Concentration is good"] },

  // =====================================================
  // CATEGORY 5: RISK MANAGEMENT (Questions 81-95)
  // =====================================================
  { id: 81, category: "Risk", question: "If your $10,000 investment dropped to $7,000 in one month, what would you do?", options: ["Buy more at discount", "Hold and wait", "Sell some to reduce risk", "Sell all immediately", "Lose sleep over it"] },
  { id: 82, category: "Risk", question: "What is your maximum acceptable loss on a single investment?", options: ["0% - No loss tolerance", "5-10% - Conservative", "10-20% - Moderate", "20-30% - Aggressive", "30%+ - Very aggressive"] },
  { id: 83, category: "Risk", question: "How would you describe your investment time horizon?", options: ["Day trading - Less than 1 week", "Short term - 1-12 months", "Medium term - 1-5 years", "Long term - 5-10 years", "Generational - 10+ years"] },
  { id: 84, category: "Risk", question: "How diversified is your current investment portfolio?", options: ["Very diversified - 20+ positions", "Well diversified - 10-20", "Moderately diversified - 5-10", "Concentrated - 3-5", "Single stock focus"] },
  { id: 85, category: "Risk", question: "What percentage of your portfolio is in high-risk investments?", options: ["0-10% - Very conservative", "11-25% - Conservative", "26-50% - Balanced", "51-75% - Aggressive", "76-100% - Very aggressive"] },
  { id: 86, category: "Risk", question: "How do you handle investment uncertainty?", options: ["Research more before deciding", "Diversify to reduce risk", "Accept uncertainty as normal", "Avoid uncertain investments", "Embrace uncertainty for returns"] },
  { id: 87, category: "Risk", question: "What is your biggest fear as an investor?", options: ["Losing all my money", "Missing great opportunities", "Making wrong decisions", "Market crash", "Not understanding investments"] },
  { id: 88, category: "Risk", question: "How do you approach leverage/margin in investing?", options: ["Never use leverage", "Rarely - Very cautious", "Sometimes - Selective", "Often - Comfortable with risk", "Always - Maximize returns"] },
  { id: 89, category: "Risk", question: "What is your emergency fund strategy before investing?", options: ["12+ months saved", "6-12 months", "3-6 months", "1-3 months", "No emergency fund"] },
  { id: 90, category: "Risk", question: "How do you assess your risk tolerance accurately?", options: ["Professional assessment", "Self-evaluation", "Learn from experience", "Guess based on feelings", "Don't assess - Just invest"] },
  { id: 91, category: "Risk", question: "What role does insurance play in your financial plan?", options: ["Comprehensive coverage", "Important protection", "Somewhat important", "Minimal coverage", "No insurance"] },
  { id: 92, category: "Risk", question: "How do you handle sequence of returns risk in retirement?", options: ["Very concerned - Plan carefully", "Somewhat concerned", "Moderately aware", "Not very concerned", "Don't think about it"] },
  { id: 93, category: "Risk", question: "What is your approach to black swan events?", options: ["Hedge against them", "Diversify broadly", "Accept as unavoidable", "Ignore - Too rare", "Hope for the best"] },
  { id: 94, category: "Risk", question: "How important is capital preservation vs growth?", options: ["Preservation critical - Safety first", "Mostly preservation", "Balanced approach", "Mostly growth", "Growth only - Risk it all"] },
  { id: 95, category: "Risk", question: "What is your biggest regret as an investor?", options: ["Being too conservative", "Being too aggressive", "Not starting sooner", "Following bad advice", "Not learning enough"] },

  // =====================================================
  // CATEGORY 6: ERAX PLATFORM FEEDBACK (Questions 96-110)
  // =====================================================
  { id: 96, category: "EraX", question: "How would you rate your overall EraX investment dashboard experience?", options: ["Excellent - Best platform", "Good - Very satisfied", "Average - Meets expectations", "Poor - Needs improvement", "Very poor - Frustrating"] },
  { id: 97, category: "EraX", question: "Which feature would you most like to see added to EraX?", options: ["Automated trading bots", "Cryptocurrency integration", "Social trading/copy trading", "Advanced charting tools", "Tax reporting automation"] },
  { id: 98, category: "EraX", question: "How likely are you to recommend EraX to friends and family?", options: ["Very likely - Already recommending", "Somewhat likely", "Neutral - Depends", "Unlikely", "Very unlikely"] },
  { id: 99, category: "EraX", question: "What is the most important factor when choosing an investment platform?", options: ["Security and safety", "Low fees and commissions", "User interface quality", "Asset variety", "Customer support"] },
  { id: 100, category: "EraX", question: "How do you rate EraX's customer support?", options: ["Excellent - Fast and helpful", "Good - Usually helpful", "Average - Hit or miss", "Poor - Slow response", "Very poor - Unhelpful"] },
  { id: 101, category: "EraX", question: "What improvement would most enhance your EraX experience?", options: ["Better mobile app", "More investment options", "Lower fees", "Better educational content", "Faster transactions"] },
  { id: 102, category: "EraX", question: "How often do you use EraX's educational resources?", options: ["Daily - Very helpful", "Weekly - Useful", "Monthly - Sometimes", "Rarely - Don't need", "Never - Already knowledgeable"] },
  { id: 103, category: "EraX", question: "How do you rate EraX's fee structure?", options: ["Very competitive - Best rates", "Good - Fair pricing", "Average - Industry standard", "Expensive - Higher than competitors", "Very expensive - Considering alternatives"] },
  { id: 104, category: "EraX", question: "What is your favorite EraX feature?", options: ["Investment dashboard", "Survey rewards system", "Portfolio tracking", "Community chat", "Easy deposits/withdrawals"] },
  { id: 105, category: "EraX", question: "How important is mobile app quality to you?", options: ["Critical - Use it daily", "Very important", "Somewhat important", "Prefer desktop", "Don't use mobile"] },
  { id: 106, category: "EraX", question: "How do you rate EraX's security measures?", options: ["Excellent - Feel very safe", "Good - Trust the platform", "Average - Adequate", "Concerned - Want more", "Very concerned - Don't trust"] },
  { id: 107, category: "EraX", question: "What would make EraX your primary investment platform?", options: ["Lower fees", "More assets", "Better returns", "Better UX", "Already is primary"] },
  { id: 108, category: "EraX", question: "How do you compare EraX to competitors?", options: ["EraX is best", "EraX is good but others better", "Equal to competitors", "Behind competitors", "Haven't tried others"] },
  { id: 109, category: "EraX", question: "What is your biggest frustration with EraX?", options: ["Limited investment options", "High fees", "Slow transactions", "Complex interface", "No frustrations - Love it"] },
  { id: 110, category: "EraX", question: "How likely are you to continue using EraX long-term?", options: ["Definitely - Long-term user", "Very likely", "Probably - Satisfied", "Uncertain - Depends", "Unlikely - Looking elsewhere"] }
];

export const SURVEY_METADATA = {
  title: "EraX Daily Market Insights",
  description: "Help shape the future of investing. Your insights unlock your daily returns.",
  questionsPerSession: 10,
  estimatedTime: "3-4 minutes",
  reward: "100% return on investment",
  totalQuestions: 110,
  categories: ["FANG", "Market", "Habits", "Tech", "Risk", "EraX"]
};