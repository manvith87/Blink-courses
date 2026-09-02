// Defines each domain's roadmap: an ordered sequence of steps, each
// pointing at real courses (by their stable external_id from
// lib/staticCourses.js) already sitting in the database. Edit this
// file and re-run `npm run seed` to change what a roadmap shows.

module.exports = [
  {
    slug: "machine-learning",
    name: "Machine Learning",
    description: "Math, code, and models — in the order that actually makes sense.",
    steps: [
      {
        title: "Math & programming foundations",
        description: "The prerequisites almost every ML course quietly assumes you already have.",
        courseIds: ["coursera-python-everybody", "coursera-ds-math", "ocw-1806"],
      },
      {
        title: "Core machine learning",
        description: "Regression, classification, and the classic algorithms, from first principles.",
        courseIds: ["coursera-ml-specialization"],
      },
      {
        title: "Deep learning & AI",
        description: "Neural networks, and the search/optimization ideas behind modern AI.",
        courseIds: ["udemy-pytorch", "edx-cs50-ai"],
      },
      {
        title: "Stay curious",
        description: "A plain-language tour of what AI can (and can't) do, for context.",
        courseIds: ["eoa"],
      },
    ],
  },
  {
    slug: "web-development",
    name: "Web Development",
    description: "From your first HTML tag to a deployed, working project.",
    steps: [
      {
        title: "Foundations",
        description: "HTML, CSS, and how the web actually works under the hood.",
        courseIds: ["fcc-rwd", "edx-cs50"],
      },
      {
        title: "Programming core",
        description: "Real programming skills — logic, data structures, a second language.",
        courseIds: ["fcc-jsads", "coursera-python-everybody"],
      },
      {
        title: "Build & ship",
        description: "Put it together into an actual project-based course.",
        courseIds: ["udemy-complete-web-dev"],
      },
    ],
  },
  {
    slug: "data-science",
    name: "Data Science",
    description: "Query it, model it, chart it, explain it.",
    steps: [
      {
        title: "Foundations",
        description: "Programming and the math underneath every data science course.",
        courseIds: ["coursera-python-everybody", "coursera-ds-math"],
      },
      {
        title: "Statistics",
        description: "Distributions, sampling, and hypothesis testing.",
        courseIds: ["khan-stats"],
      },
      {
        title: "Tools of the trade",
        description: "The spreadsheets, SQL, and BI tools data teams actually use daily.",
        courseIds: ["coursera-google-data-analytics", "udemy-sql-analysis", "coursera-excel-business"],
      },
      {
        title: "Go further",
        description: "Once the basics click, this is the natural next step.",
        courseIds: ["coursera-ml-specialization"],
      },
    ],
  },
  {
    slug: "business",
    name: "Business & Startups",
    description: "The parts of running a company nobody teaches for free — except here.",
    steps: [
      {
        title: "Money basics",
        description: "How markets work, and the spreadsheet skills to back it up.",
        courseIds: ["coursera-financial-markets", "coursera-excel-business"],
      },
      {
        title: "Build something",
        description: "Opportunity spotting, growth strategy, and founding teams.",
        courseIds: ["coursera-entrepreneurship"],
      },
      {
        title: "Get the word out",
        description: "Search, social, and analytics basics for reaching actual customers.",
        courseIds: ["google-digital"],
      },
    ],
  },
  {
    slug: "design",
    name: "Design",
    description: "Make things people actually enjoy using.",
    steps: [
      {
        title: "Visual foundations",
        description: "Color, layout, and typography — the building blocks of every design.",
        courseIds: ["khan-design"],
      },
      {
        title: "UX practice",
        description: "Wireframing, research basics, and a real design-sprint walkthrough.",
        courseIds: ["udemy-ux-fundamentals"],
      },
    ],
  },
];
