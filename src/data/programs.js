/**
 * 2027 Batch — 4th Year training programs.
 * Transcribed from the official timetable + day-wise syllabus sheets.
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

const TIME_SLOTS = [
  "9:00 AM – 11:00 AM",
  "11:00 AM – 12:00 PM",
  "12:00 PM – 1:00 PM",
  "1:00 PM – 2:00 PM",
  "2:00 PM – 4:00 PM",
];

/** @type {Program[]} */
export const programs = [
  {
    slug: "ai-ready-engineer",
    title: "AI Ready Engineer",
    tagline: "4th Year",
    description:
      "An intensive Program that blends quantitative aptitude, core coding, and hands-on Artificial Intelligence — taking 4th-year engineers from fundamentals to building and showcasing their own AI-powered application.",
    tracks: ["Aptitude", "Coding", "AI"],
    durationDays: 12,
    assessments: [
      {
        title: "Pre-Assessment Test",
        timing: "On Day 1",
        description:
          "A baseline test taken on Day 1, before the sessions begin, to gauge each participant's starting level across the tracks.",
      },
      {
        title: "Daily Test",
        timing: "8:00 PM – 9:00 PM, every day",
        description:
          "An end-of-day assessment that reinforces the day's aptitude, coding, and AI learning.",
      },
      {
        title: "Grand Test",
        timing: "Day 6 & Day 12",
        description:
          "Two milestone tests — Grand Test-1 at the mid-point (Day 6) and Grand Test-2 at the finish (Day 12) — to benchmark cumulative progress.",
      },
    ],
    timetables: [
      {
        batch: "AI Ready Engineer",
        slots: [
          { time: TIME_SLOTS[0], activity: "Coding" },
          { time: TIME_SLOTS[1], activity: "AI" },
          { time: TIME_SLOTS[2], activity: "Lunch" },
          { time: TIME_SLOTS[3], activity: "AI" },
          { time: TIME_SLOTS[4], activity: "Aptitude" },
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
    slug: "placement-training",
    title: "Placement Training - Phase 1",
    tagline: "4th Year · Phase 1",
    description:
      "A focused 12-day placement bootcamp combining quantitative & logical aptitude with a deep coding ramp — from C and data structures through arrays, strings, and the two-pointer / sliding-window patterns interviewers love.",
    tracks: ["Aptitude", "Coding"],
    durationDays: 12,
    assessments: [
      {
        title: "Pre-Assessment Test",
        timing: "On Day 1",
        description:
          "A baseline test taken on Day 1, before the sessions begin, to gauge each participant's starting level in aptitude and coding.",
      },
      {
        title: "Daily Test",
        timing: "8:00 PM – 9:00 PM, every day",
        description:
          "An end-of-day assessment that reinforces the day's aptitude and coding learning.",
      },
      {
        title: "Grand Test",
        timing: "Day 6 & Day 12",
        description:
          "Two milestone tests — Grand Test-1 at the mid-point (Day 6) and Grand Test-2 at the finish (Day 12) — to benchmark cumulative progress.",
      },
    ],
    timetables: [
      {
        batch: "Placement Training (Phase 1)",
        slots: [
          { time: TIME_SLOTS[0], activity: "Aptitude" },
          { time: TIME_SLOTS[1], activity: "Coding" },
          { time: TIME_SLOTS[2], activity: "Lunch" },
          { time: TIME_SLOTS[3], activity: "Coding" },
          { time: TIME_SLOTS[4], activity: "Coding" },
        ],
      },
    ],
    syllabus: [
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
    ],
  },
];

/**
 * @param {string} slug
 * @returns {Program | undefined}
 */
export function getProgram(slug) {
  return programs.find((p) => p.slug === slug);
}
