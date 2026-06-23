/**
 * 2027 Batch — 4th Year training programs.
 * Transcribed from the official timetable + day-wise syllabus sheets.
 *
 * Three cohorts:
 *   1. AI Ready Engineer
 *   2. Placement Training Phase 1  (CSE, CSE - AI ML, CSE - DS, ISE)
 *   3. Placement Training Batch 2  (ECE, CIVIL)
 *
 * @typedef {Object} TimetableSlot
 * @property {string} time
 * @property {string} activity
 *
 * @typedef {Object} Timetable
 * @property {string} batch
 * @property {TimetableSlot[]} slots
 *
 * @typedef {Object} SyllabusDay
 * @property {number} day
 * @property {string} aptitude
 * @property {string} coding
 * @property {string} [ai]
 *
 * @typedef {Object} Assessment
 * @property {string} title
 * @property {string} timing
 * @property {string} description
 *
 * @typedef {Object} Program
 * @property {string} slug
 * @property {string} title
 * @property {string} tagline
 * @property {string} description
 * @property {string[]} tracks
 * @property {number} durationDays
 * @property {Assessment[]} assessments
 * @property {Timetable[]} timetables
 * @property {SyllabusDay[]} syllabus
 */

const COMM_SKILLS = "Communication Skills through MyNA";

/** Shared assessment block — same for every cohort. */
const ASSESSMENTS = [
  {
    title: "Pre-Assessment Test",
    timing: "On Day 1",
    description:
      "A baseline test taken on Day 1, before the sessions begin, to gauge each participant's starting level.",
  },
  {
    title: "Daily Test",
    timing: "9:00 AM – 9:30 AM, every day",
    description:
      "A 30-minute test held at the start of the day, before classes begin, to reinforce the previous day's learning across the tracks.",
  },
  {
    title: "Grand Test",
    timing: "Day 6 & Day 12",
    description:
      "Two milestone tests — Grand Test-1 at the mid-point (Day 6) and Grand Test-2 at the finish (Day 12) — to benchmark cumulative progress.",
  },
];

/** Placement Training timetable — identical for Batch 1 and Batch 2. */
const PLACEMENT_TIMETABLE_SLOTS = [
  { time: "9:00 AM – 11:00 AM", activity: "Aptitude" },
  { time: "11:00 AM – 12:00 PM", activity: COMM_SKILLS },
  { time: "12:00 PM – 1:00 PM", activity: "Lunch" },
  { time: "1:00 PM – 4:00 PM", activity: "Coding" },
];

/** Placement Training day-wise syllabus — shared by both batches. */
const PLACEMENT_SYLLABUS = [
  { day: 1, aptitude: "Percentages & Ratio-Proportion", coding: "C MCQs" },
  { day: 2, aptitude: "Profit & Loss", coding: "Pseudo Code MCQs" },
  { day: 3, aptitude: "Time, Speed & Distance", coding: "Data Structure MCQs" },
  { day: 4, aptitude: "Time & Work", coding: "OOPs" },
  { day: 5, aptitude: "Averages & Mixtures", coding: "Problem Solving on Numbers" },
  { day: 6, aptitude: "Simple & Compound Interest", coding: "Grand Test-1" },
  { day: 7, aptitude: "Permutations & Combinations", coding: "Problem Solving on Arrays" },
  { day: 8, aptitude: "Probability", coding: "Problem Solving on Arrays" },
  { day: 9, aptitude: "Series Completion", coding: "Problem Solving on Strings" },
  { day: 10, aptitude: "Coding-Decoding", coding: "Problem Solving on Strings" },
  { day: 11, aptitude: "Direction Sense", coding: "Two Pointer & Sliding Window" },
  { day: 12, aptitude: "Blood Relations", coding: "Grand Test-2" },
];

/** @type {Program[]} */
export const programs = [
  {
    slug: "ai-ready-engineer",
    title: "AI Ready Engineer",
    tagline: "4th Year · Batch 1",
    description:
      "A 12-day intensive that blends quantitative aptitude, core coding, applied Artificial Intelligence, and communication skills — taking 4th-year engineers from fundamentals to building and showcasing their own AI-powered application.",
    tracks: ["Aptitude", "Coding", "AI", "Communication Skills"],
    durationDays: 12,
    assessments: ASSESSMENTS,
    timetables: [
      {
        batch: "AI Ready Engineer",
        slots: [
          { time: "9:00 AM – 11:00 AM", activity: "Coding" },
          { time: "11:00 AM – 12:00 PM", activity: "AI" },
          { time: "12:00 PM – 1:00 PM", activity: "Lunch" },
          { time: "1:00 PM – 2:00 PM", activity: COMM_SKILLS },
          { time: "2:00 PM – 4:00 PM", activity: "Aptitude" },
        ],
      },
    ],
    syllabus: [
      { day: 1, aptitude: "Percentages & Ratio-Proportion", coding: "C MCQs", ai: "Introduction to Artificial Intelligence" },
      { day: 2, aptitude: "Profit & Loss", coding: "C MCQs", ai: "Prompt Engineering Fundamentals" },
      { day: 3, aptitude: "Time, Speed & Distance", coding: "Pseudo Code MCQs", ai: "AI for Learning & Research" },
      { day: 4, aptitude: "Time & Work", coding: "Pseudo Code MCQs", ai: "AI for Content Creation" },
      { day: 5, aptitude: "Averages & Mixtures", coding: "Data Structure MCQs", ai: "AI Image Generation" },
      { day: 6, aptitude: "Simple & Compound Interest", coding: "Grand Test-1", ai: "AI Video Generation" },
      { day: 7, aptitude: "Permutations & Combinations", coding: "OOPs", ai: "AI for Presentations" },
      { day: 8, aptitude: "Probability", coding: "OOPs", ai: "AI for Coding" },
      { day: 9, aptitude: "Series Completion", coding: "Problem Solving on Numbers", ai: "AI for Career Preparation" },
      { day: 10, aptitude: "Coding-Decoding", coding: "Problem Solving on Arrays", ai: "AI Automation" },
      { day: 11, aptitude: "Direction Sense", coding: "Problem Solving on Strings", ai: "Building an AI-Powered Application" },
      { day: 12, aptitude: "Blood Relations", coding: "Grand Test-2", ai: "Project Showcase" },
    ],
  },
  {
    slug: "placement-training-batch-1",
    title: "Placement Training Phase 1",
    tagline: "4th Year · Phase 1",
    description:
      "Placement bootcamp for the CSE, CSE (AI & ML), CSE (Data Science), and ISE departments — combining quantitative aptitude, a deep coding ramp, and communication skills (through MyNA).",
    tracks: ["Aptitude", "Coding", "Communication Skills"],
    durationDays: 12,
    assessments: ASSESSMENTS,
    timetables: [
      { batch: "Placement Training Phase 1", slots: PLACEMENT_TIMETABLE_SLOTS },
    ],
    syllabus: PLACEMENT_SYLLABUS,
  },
  {
    slug: "placement-training-batch-2",
    title: "Placement Training Batch 2",
    tagline: "4th Year · Batch 2",
    description:
      "Placement bootcamp for the ECE and Civil departments — combining quantitative aptitude, a deep coding ramp, and communication skills (through MyNA).",
    tracks: ["Aptitude", "Coding", "Communication Skills"],
    durationDays: 12,
    assessments: ASSESSMENTS,
    timetables: [
      { batch: "Placement Training Batch 2", slots: PLACEMENT_TIMETABLE_SLOTS },
    ],
    syllabus: PLACEMENT_SYLLABUS,
  },
];

/**
 * @param {string} slug
 * @returns {Program | undefined}
 */
export function getProgram(slug) {
  return programs.find((p) => p.slug === slug);
}
