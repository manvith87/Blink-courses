import { useAuth } from "../context/AuthContext.jsx";
import { trackCourseClick } from "../api.js";

export default function RoadmapModal({ open, loading, error, domain, onClose }) {
  const { token } = useAuth();
  if (!open) return null;

  function handleCourseClick(course) {
    const courseId = course.id || course._id || course.external_id;
    trackCourseClick(courseId, token);
  }

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target.classList.contains("modal-overlay")) onClose();
      }}
    >
      <div className="modal-card roadmap-card">
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
          &times;
        </button>

        {loading && <p className="modal-sub">Loading the roadmap…</p>}

        {!loading && error && <div className="form-msg error show">{error}</div>}

        {!loading && !error && domain && (
          <div>
            <h2 className="modal-title">{domain.name}</h2>
            <p className="modal-sub">{domain.description}</p>

            <div className="roadmap-timeline">
              {domain.steps.map((step, i) => (
                <div className="roadmap-step" key={step.id}>
                  <div className="roadmap-step-marker">
                    <span className="bulb"></span>
                    {i < domain.steps.length - 1 && <span className="roadmap-step-line"></span>}
                  </div>
                  <div className="roadmap-step-body">
                    <div className="roadmap-step-num">Step {i + 1}</div>
                    <h3 className="roadmap-step-title">{step.title}</h3>
                    {step.description && <p className="roadmap-step-desc">{step.description}</p>}

                    <div className="roadmap-course-list">
                      {step.courses.map((course) => (
                        <a
                          key={course.id}
                          className="roadmap-course"
                          href={course.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleCourseClick(course)}
                        >
                          <span className="platform-tag">{course.platform}</span>
                          <span className="roadmap-course-title">{course.title}</span>
                          <span className="arrow">→</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
