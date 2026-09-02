// Coursera's Catalog API is public and needs no key.
// Docs: https://build.coursera.org/app-platform/catalog/

const cache = require("./cache");

const BASE_URL = "https://api.coursera.org/api/courses.v1";

async function searchCourses(query, limit = 12) {
  const cacheKey = `coursera:${query || ""}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    limit: String(Math.max(limit, 20)),
    fields: "slug,partnerIds,photoUrl",
    includes: "partners",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let res;
  try {
    res = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) BlinkCourseFinder/2.0",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Coursera API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const partnersById = {};
  (data.linked?.["partners.v1"] || []).forEach((p) => {
    partnersById[p.id] = p.name;
  });

  let elements = data.elements || [];
  if (query && query.trim() && query.trim().toLowerCase() !== "free") {
    const qLower = query.trim().toLowerCase();
    const filtered = elements.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(qLower)) ||
        (c.slug && c.slug.toLowerCase().includes(qLower))
    );
    if (filtered.length > 0) {
      elements = filtered;
    }
  }

  const results = elements.slice(0, limit).map((course) => ({
    id: `coursera-${course.id}`,
    title: course.name,
    platform: "Coursera",
    partner: (course.partnerIds || []).map((id) => partnersById[id]).filter(Boolean)[0] || null,
    access: "Free to audit (confirm on course page)",
    url: `https://www.coursera.org/learn/${course.slug}`,
  }));

  cache.set(cacheKey, results);
  return results;
}

module.exports = { searchCourses };
