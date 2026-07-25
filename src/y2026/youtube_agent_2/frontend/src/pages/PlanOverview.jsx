import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import AddCourseModal from "../components/AddCourseModal";
import AiCourseModal from "../components/AiCourseModal";
import { updatePlan } from "../store/plansSlice";
import {
  deleteCourses,
  replacePlan,
  updateCourseLabels,
  updateCourseMetadata,
  updatePlanLabels,
} from "../api/client";
import EditMetadataDrawer from "../components/EditMetadataDrawer";
import { EditIcon, LabelIcon, WorkspaceIcon } from "../components/Icons";
import {
  CourseViewDropdown,
  LearningPlanDropdown,
} from "../components/LearningPathNav";
import {
  rememberLearningLocation,
  selectPlanPageState,
  updatePlanPage,
} from "../store/learningUiSlice";

function JsonActionIcon({ name }) {
  const paths = {
    download: "M12 3v12m0 0 4-4m-4 4-4-4M5 20h14",
    load: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M12 18v-6m0 0-3 3m3-3 3 3",
    edit: "m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function LearningPlanOverviewDrawer({
  plan,
  sourceChannels,
  onClose,
  onPlanUpdated,
}) {
  const [tab, setTab] = React.useState("visual");
  const [editingJson, setEditingJson] = React.useState(false);
  const [jsonDraft, setJsonDraft] = React.useState(() =>
    JSON.stringify(plan, null, 2),
  );
  const [jsonError, setJsonError] = React.useState("");
  const [jsonMessage, setJsonMessage] = React.useState("");
  const [uploadingJson, setUploadingJson] = React.useState(false);
  const [updatingLabel, setUpdatingLabel] = React.useState("");
  const [labelError, setLabelError] = React.useState("");
  const jsonFileInputRef = React.useRef(null);

  React.useEffect(() => {
    if (!editingJson) setJsonDraft(JSON.stringify(plan, null, 2));
  }, [plan, editingJson]);

  const modules = plan.courses?.flatMap((course) => course.modules || []) || [];
  const videos = modules.flatMap((module) => module.videos || []);
  const watched = videos.filter(
    (video) => video.watched || video.labels?.includes("watched"),
  ).length;
  const bookmarked = videos.filter((video) =>
    video.labels?.includes("bookmarked"),
  ).length;
  const markedForDelete = videos.filter((video) =>
    video.labels?.includes("mark_for_delete"),
  ).length;
  const progress = videos.length
    ? Math.round((watched / videos.length) * 100)
    : 0;
  const togglePlanLabel = async (label) => {
    const labels = plan.labels?.includes(label)
      ? plan.labels.filter((item) => item !== label)
      : [...(plan.labels || []), label];
    setUpdatingLabel(label);
    setLabelError("");
    try {
      const response = await updatePlanLabels(plan.id, labels);
      onPlanUpdated(response.plan);
    } catch (error) {
      setLabelError(`Unable to update plan status: ${error.message}`);
    } finally {
      setUpdatingLabel("");
    }
  };
  const downloadJson = () => {
    const file = new Blob([JSON.stringify(plan, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(plan.name || "learning-plan").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "learning-plan"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const startJsonEdit = () => {
    setJsonDraft(JSON.stringify(plan, null, 2));
    setJsonError("");
    setJsonMessage("");
    setEditingJson(true);
  };

  const cancelJsonEdit = () => {
    setJsonDraft(JSON.stringify(plan, null, 2));
    setJsonError("");
    setEditingJson(false);
  };

  const loadJsonFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setJsonError("The JSON file must be 10 MB or smaller.");
      setJsonMessage("");
      return;
    }

    setJsonError("");
    setJsonMessage("");
    try {
      const contents = await file.text();
      setJsonDraft(contents);
      setEditingJson(true);
      try {
        const parsed = JSON.parse(contents);
        setJsonDraft(JSON.stringify(parsed, null, 2));
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
          setJsonError("File loaded, but it must contain one learning-plan object.");
        } else if (parsed.id !== plan.id) {
          setJsonError(`File loaded, but its plan id must be “${plan.id}” before upload.`);
        } else {
          setJsonMessage(`Loaded ${file.name}. Review the JSON before uploading.`);
        }
      } catch (error) {
        setJsonError(`File loaded with invalid JSON: ${error.message}`);
      }
    } catch (error) {
      setJsonError(`Unable to read ${file.name}: ${error.message}`);
    }
  };

  const uploadJson = async () => {
    setJsonError("");
    setJsonMessage("");
    let replacement;
    try {
      replacement = JSON.parse(jsonDraft);
    } catch (error) {
      setJsonError(`Invalid JSON: ${error.message}`);
      return;
    }
    if (!replacement || Array.isArray(replacement) || typeof replacement !== "object") {
      setJsonError("The uploaded JSON must be one learning-plan object.");
      return;
    }
    if (replacement.id !== plan.id) {
      setJsonError("The plan id cannot be changed when uploading JSON.");
      return;
    }
    if (!window.confirm("Upload this JSON and replace the complete learning plan? Courses omitted from the JSON will be removed.")) return;

    setUploadingJson(true);
    try {
      const response = await replacePlan(plan.id, replacement);
      onPlanUpdated(response.plan);
      setJsonDraft(JSON.stringify(response.plan, null, 2));
      setEditingJson(false);
      setJsonMessage("Learning plan JSON uploaded successfully.");
    } catch (error) {
      setJsonError(`Unable to upload JSON: ${error.message}`);
    } finally {
      setUploadingJson(false);
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer learning-plan-overview-drawer">
        <div className="drawer-header">
          <h2>Plan information</h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="refresh-feed-tabs">
          <button
            className={tab === "visual" ? "active" : ""}
            onClick={() => {
              setTab("visual");
              setJsonError("");
              setJsonMessage("");
              setEditingJson(false);
            }}
          >
            Visual
          </button>
          <button
            className={tab === "json" ? "active" : ""}
            onClick={() => setTab("json")}
          >
            Raw JSON
          </button>
          {tab === "json" && (
            <>
              <button className="overview-json-action overview-download-json" onClick={downloadJson}>
                <JsonActionIcon name="download" />
                <span>Download JSON</span>
              </button>
              <button className="overview-json-action overview-load-json" onClick={() => jsonFileInputRef.current?.click()} disabled={uploadingJson}>
                <JsonActionIcon name="load" />
                <span>Load JSON File</span>
              </button>
              <input
                ref={jsonFileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={loadJsonFile}
                hidden
              />
              {!editingJson ? (
                <button className="overview-json-action overview-edit-json" onClick={startJsonEdit}>
                  <JsonActionIcon name="edit" />
                  <span>Edit JSON</span>
                </button>
              ) : (
                <>
                  <button onClick={cancelJsonEdit} disabled={uploadingJson}>Cancel</button>
                  <button className="overview-upload-json" onClick={uploadJson} disabled={uploadingJson}>
                    {uploadingJson ? "Uploading…" : "Upload JSON"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
        <div className="drawer-body">
          {tab === "visual" ? (
            <>
              <section className="overview-summary">
                <div className="plan-info-identity">
                  {plan.logo_url || plan.logo ? (
                    <img src={plan.logo_url || plan.logo} alt="" />
                  ) : (
                    <span aria-hidden="true">{plan.name?.charAt(0)?.toUpperCase() || "?"}</span>
                  )}
                  <div>
                    <small>Learning plan</small>
                    <h3>{plan.name}</h3>
                  </div>
                </div>
                <p>{plan.description || "No description provided."}</p>
                <div className="overview-progress">
                  <div className="plan-progress-heading">
                    <span>Learning progress</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="plan-progress-track">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="plan-card-counters">
                  <span>{plan.courses?.length || 0} courses</span>
                  <span>{modules.length} modules</span>
                  <span>
                    {watched}/{videos.length} watched
                  </span>
                  <span>{bookmarked} bookmarked</span>
                  <span>{markedForDelete} marked</span>
                </div>
                <section className="plan-info-status">
                  <div>
                    <h4>Plan status</h4>
                    <p>Bookmark, complete, or mark this plan for later cleanup.</p>
                  </div>
                  {labelError && <div className="alert alert-error">{labelError}</div>}
                  <div className="plan-info-status-actions" role="group" aria-label="Plan status">
                    {[
                      ["bookmarked", "Bookmark"],
                      ["watched", "Watched"],
                      ["mark_for_delete", "Mark for delete"],
                    ].map(([label, text]) => (
                      <button
                        type="button"
                        key={label}
                        className={plan.labels?.includes(label) ? "active" : ""}
                        aria-pressed={plan.labels?.includes(label)}
                        disabled={Boolean(updatingLabel)}
                        onClick={() => togglePlanLabel(label)}
                      >
                        <LabelIcon label={label} />
                        <span>{updatingLabel === label ? "Updating…" : text}</span>
                      </button>
                    ))}
                  </div>
                  {plan.labels?.some((label) => !["bookmarked", "watched", "mark_for_delete"].includes(label)) && (
                    <div className="plan-card-labels">
                      {plan.labels
                        .filter((label) => !["bookmarked", "watched", "mark_for_delete"].includes(label))
                        .map((label) => (
                          <span className="badge badge-green" key={label}>{label.replaceAll("_", " ")}</span>
                        ))}
                    </div>
                  )}
                </section>
                <div className="plan-card-timestamps">
                  <span>
                    Created:{" "}
                    {plan.created_at
                      ? new Date(plan.created_at).toLocaleString()
                      : "—"}
                  </span>
                  <span>
                    Updated:{" "}
                    {plan.updated_at
                      ? new Date(plan.updated_at).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </section>
              <hr className="overview-section-divider" />
              <section className="workspace-source-section plan-overview-sources">
                <h3>Content sources</h3>
                {sourceChannels.length ? (
                  <div className="course-source-list">
                    {sourceChannels.map((channel) => (
                      <article
                        className="course-source-card"
                        key={channel.channel_id || channel.title}
                      >
                        <div className="source-channel-header">
                          {channel.logo_url || channel.thumbnail ? (
                            <img
                              src={channel.logo_url || channel.thumbnail}
                              alt=""
                              className="tile-logo"
                            />
                          ) : (
                            <div className="tile-logo tile-logo-fallback">
                              {channel.title?.charAt(0).toUpperCase() || "?"}
                            </div>
                          )}
                          <div>
                            <strong>{channel.title}</strong>
                            <span>
                              {channel.courseCount} course
                              {channel.courseCount === 1 ? "" : "s"} ·{" "}
                              {channel.video_count || channel.videos_count || 0}{" "}
                              videos
                            </span>
                          </div>
                        </div>
                        {channel.playlists?.length > 0 ? (
                          <div className="course-source-playlists">
                            {channel.playlists.map((playlist) => (
                              <div
                                className="course-source-playlist"
                                key={playlist.id || playlist.playlist_id}
                              >
                                {playlist.thumbnail && (
                                  <img src={playlist.thumbnail} alt="" />
                                )}
                                <span>{playlist.title}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="course-source-meta">
                            All channel videos
                          </span>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No content sources recorded.</p>
                )}
              </section>
            </>
          ) : (
            <div className="plan-json-workspace">
              {jsonError && <div className="alert alert-error">{jsonError}</div>}
              {jsonMessage && <div className="alert alert-success">{jsonMessage}</div>}
              {editingJson && (
                <p className="plan-json-warning">
                  Upload replaces the complete plan hierarchy. The plan ID and creation timestamp remain server-controlled.
                </p>
              )}
              {editingJson ? (
                <textarea
                  className="refresh-feed-json plan-json-editor"
                  value={jsonDraft}
                  onChange={(event) => setJsonDraft(event.target.value)}
                  aria-label="Edit learning plan JSON"
                  spellCheck="false"
                />
              ) : (
                <pre className="refresh-feed-json">{JSON.stringify(plan, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default function PlanOverview() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const allPlans = useSelector((state) => state.plans.items);
  const isAllPlans = planId === "all";
  const plan = React.useMemo(() => {
    if (!isAllPlans) return allPlans.find((item) => item.id === planId);
    return {
      id: "all",
      name: "ALL Plans",
      description: "Courses combined from every learning plan.",
      labels: [],
      courses: allPlans.flatMap((ownerPlan) =>
        (ownerPlan.courses || []).map((course) => ({
          ...course,
          _planId: ownerPlan.id,
          _planName: ownerPlan.name,
        })),
      ),
    };
  }, [allPlans, isAllPlans, planId]);
  const [showManual, setShowManual] = React.useState(false);
  const [showAi, setShowAi] = React.useState(false);
  const [submittedAiRequest, setSubmittedAiRequest] = React.useState(null);
  const [courseToEdit, setCourseToEdit] = React.useState(null);
  const [showOverview, setShowOverview] = React.useState(false);
  const [showSortFilter, setShowSortFilter] = React.useState(false);
  const [showMobileActions, setShowMobileActions] = React.useState(false);
  const { query, sortBy, labelFilters, courseLabelTab } = useSelector((state) =>
    selectPlanPageState(state, planId),
  );
  const updatePageState = (changes) =>
    dispatch(updatePlanPage({ planId, changes }));
  React.useEffect(() => {
    dispatch(rememberLearningLocation({ planId, courseId: "all", moduleId: null, videoId: null }));
  }, [dispatch, planId]);
  const standardCourseTabs = [
    { id: "ALL", label: "All courses", shortLabel: "ALL" },
    { id: "bookmarked", label: "Bookmarked" },
    { id: "watched", label: "Watched" },
    { id: "mark_for_delete", label: "Marked for delete" },
    { id: "refresh_needed", label: "Refresh needed" },
  ];
  const standardCourseLabelIds = standardCourseTabs
    .map((tab) => tab.id)
    .filter((id) => id !== "ALL");
  const customCourseLabels = [
    ...new Set((plan?.courses || []).flatMap((course) => course.labels || [])),
  ].filter((label) => !standardCourseLabelIds.includes(label));
  const visibleCourses = [...(plan?.courses || [])]
    .filter(
      (course) =>
        `${course.title} ${course.description || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (courseLabelTab === "ALL" || course.labels?.includes(courseLabelTab)) &&
        (labelFilters.length === 0 ||
          labelFilters.some((label) => course.labels?.includes(label))),
    )
    .sort((a, b) =>
      sortBy === "name"
        ? a.title.localeCompare(b.title)
        : new Date(b.updated_at) - new Date(a.updated_at),
    );
  const courseViewOptions = standardCourseTabs.map((tab) => ({
    ...tab,
    count:
      tab.id === "ALL"
        ? plan?.courses?.length || 0
        : plan?.courses?.filter((course) => course.labels?.includes(tab.id)).length || 0,
  }));
  const sourceChannels = Object.values(
    (plan?.courses || []).reduce((sources, course) => {
      const courseVideos =
        course.modules?.flatMap((module) => module.videos || []) || [];
      for (const channel of course.source_channels || []) {
        const key = channel.channel_id || channel.url || channel.title;
        if (!sources[key])
          sources[key] = {
            ...channel,
            courseCount: 0,
            playlists: [],
            videoIds: new Set(),
          };
        sources[key].courseCount += 1;
        courseVideos.forEach((video) =>
          sources[key].videoIds.add(video.video_id),
        );
        for (const playlist of channel.playlists || []) {
          if (
            !sources[key].playlists.some(
              (item) =>
                (item.id || item.playlist_id) ===
                (playlist.id || playlist.playlist_id),
            )
          )
            sources[key].playlists.push(playlist);
        }
      }
      return sources;
    }, {}),
  ).map(({ videoIds, ...channel }) => ({
    ...channel,
    videos_count: videoIds.size,
  }));

  const renderCourseActions = (className = "") => (
    <div className={`plan-action-panel ${className}`}>
      {!isAllPlans && <button
        className="btn btn-secondary btn-sm icon-button"
        title="Learning plan overview"
        aria-label="Learning plan overview"
        onClick={() => setShowOverview(true)}
      >
        <WorkspaceIcon name="info" />
      </button>}
      <input
        value={query}
        onChange={(event) => updatePageState({ query: event.target.value })}
        placeholder="Search courses..."
        aria-label="Search courses"
      />
      <button
        className={`btn btn-secondary btn-sm icon-button ${labelFilters.length ? "active" : ""}`}
        title="Sort and filter courses"
        aria-label="Sort and filter courses"
        onClick={() => setShowSortFilter(true)}
      >
        <WorkspaceIcon name="sort" />
      </button>
      {!isAllPlans && <button
        className="btn btn-secondary btn-sm ai-request-status-button"
        onClick={() => navigate(`/plans/${planId}/ai-requests`)}
      >
        <WorkspaceIcon name="progress" />
        <span>AI Request Status</span>
      </button>}
      {!isAllPlans && <div className="add-course-group">
        <button className="btn btn-secondary btn-sm" onClick={() => setShowManual(true)}>
          <WorkspaceIcon name="manual" />
          Manual
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowAi(true)}>
          <WorkspaceIcon name="ai" />
          AI
        </button>
      </div>}
    </div>
  );

  if (!plan)
    return (
      <div className="alert alert-info">
        Learning plan not found.{" "}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate("/plans")}
        >
          Back to plans
        </button>
      </div>
    );

  return (
    <div className="plan-overview-page">
      <nav className="plan-detail-breadcrumb" aria-label="Plan and course filter">
        <div className="plan-detail-breadcrumb-path">
          <LearningPlanDropdown
            plans={allPlans}
            selectedPlan={isAllPlans ? null : plan}
            includeAll
            onSelect={(selectedPlan) => {
              if (selectedPlan) {
                navigate(`/plans/${selectedPlan.id}`);
              } else {
                dispatch(rememberLearningLocation({ planId: "all", courseId: "all", moduleId: null, videoId: null }));
                navigate("/plans/all");
              }
            }}
          />
          <span className="learning-path-separator" aria-hidden="true">/</span>
          <CourseViewDropdown
            options={courseViewOptions}
            value={courseLabelTab}
            onSelect={(value) => updatePageState({ courseLabelTab: value })}
          />
        </div>
        <button type="button" className="mobile-page-menu-button" aria-label="Open course actions" aria-expanded={showMobileActions} onClick={() => setShowMobileActions(true)}><WorkspaceIcon name="menu" /></button>
        {renderCourseActions("desktop-page-actions breadcrumb-actions")}
      </nav>
      <div className="plan-course-scroll-body">
        {submittedAiRequest && (
          <div className="alert alert-info">
            AI request <strong>{submittedAiRequest.request_id}</strong> was
            queued.{" "}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/plans/${planId}/ai-requests`)}
            >
              View status
            </button>
          </div>
        )}
        <div className="page-header course-toolbar">
          <h4>
            Courses{" "}
            <span className="badge badge-green">{plan.courses?.length || 0}</span>
          </h4>
        </div>
        <div className="plan-course-list">
        {visibleCourses.length ? (
          visibleCourses.map((course) => {
            const courseVideos =
              course.modules?.flatMap((module) => module.videos || []) || [];
            const videos = courseVideos.length;
            const watched = courseVideos.filter(
              (video) => video.watched || video.labels?.includes("watched"),
            ).length;
            const bookmarked = courseVideos.filter((video) =>
              video.labels?.includes("bookmarked"),
            ).length;
            const markedForDelete = courseVideos.filter((video) =>
              video.labels?.includes("mark_for_delete"),
            ).length;
            const progress = videos ? Math.round((watched / videos) * 100) : 0;
            const logoUrl = course.logo_url || course.logo;
            return (
              <article
                className={`card catalog-tile ${course.labels?.includes("refresh_needed") ? "refresh-needed-course" : ""}`}
                key={`${course._planId || plan.id}:${course.id}`}
                onClick={() =>
                  navigate(`/plans/${course._planId || plan.id}/courses/${course.id}/learn`)
                }
              >
                <header className="catalog-tile-header">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="tile-logo" />
                  ) : (
                    <div className="tile-logo tile-logo-fallback">
                      {course.title?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <div>
                    <h3>{course.title}</h3>
                    {course._planName && <small className="course-owner-plan">{course._planName}</small>}
                    <p>{course.description || "No description provided."}</p>
                  </div>
                </header>
                <section className="course-card-progress">
                  <div className="plan-progress-heading">
                    <span>Learning progress</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="plan-progress-track">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <div className="plan-card-counters">
                    <span>{course.modules?.length || 0} modules</span>
                    <span>
                      {watched}/{videos} watched
                    </span>
                    <span>{bookmarked} bookmarked</span>
                    <span>{markedForDelete} marked</span>
                  </div>
                  <div className="plan-card-timestamps">
                    <span>
                      Created:{" "}
                      {course.created_at
                        ? new Date(course.created_at).toLocaleString()
                        : "—"}
                    </span>
                    <span>
                      Updated:{" "}
                      {course.updated_at
                        ? new Date(course.updated_at).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </section>
                <section className="plan-card-labels">
                  {course.labels?.length ? (
                    course.labels.map((label) => (
                      <span className="badge badge-green" key={label}>
                        {label.replaceAll("_", " ")}
                      </span>
                    ))
                  ) : (
                    <span className="tile-date">No labels</span>
                  )}
                </section>
                <footer className="catalog-tile-footer course-card-actions">
                  <div className="course-label-toggle">
                    {["watched", "bookmarked", "mark_for_delete"].map(
                      (label) => (
                        <button
                          key={label}
                          className={
                            course.labels?.includes(label) ? "active" : ""
                          }
                          title={label.replaceAll("_", " ")}
                          onClick={async (event) => {
                            event.stopPropagation();
                            const labels = course.labels?.includes(label)
                              ? course.labels.filter((item) => item !== label)
                              : [...(course.labels || []), label];
                            const response = await updateCourseLabels(
                              course._planId || plan.id,
                              course.id,
                              labels,
                            );
                            dispatch(updatePlan(response.plan));
                          }}
                        >
                          <LabelIcon label={label} />
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    className="btn btn-secondary btn-sm icon-button"
                    title="Edit"
                    onClick={(event) => {
                      event.stopPropagation();
                      setCourseToEdit(course);
                    }}
                  >
                    <EditIcon />
                  </button>
                </footer>
              </article>
            );
          })
        ) : (
          <div className="card">
            <p>No courses yet. Add a course from this plan.</p>
          </div>
        )}
        </div>
      </div>
      {showMobileActions && (
        <>
          <div className="drawer-overlay mobile-page-actions-overlay" onClick={() => setShowMobileActions(false)} />
          <aside className="drawer mobile-page-actions-drawer">
            <div className="drawer-header">
              <h2>Plan actions</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMobileActions(false)} aria-label="Close">×</button>
            </div>
            <div className="drawer-body">{renderCourseActions("mobile-drawer-actions")}</div>
          </aside>
        </>
      )}
      {!isAllPlans && showManual && (
        <AddCourseModal
          plan={plan}
          onClose={() => setShowManual(false)}
          onCourseCreated={(updated) => dispatch(updatePlan(updated))}
        />
      )}
      {!isAllPlans && showAi && (
        <AiCourseModal
          plan={plan}
          onClose={() => setShowAi(false)}
          onRequestSubmitted={setSubmittedAiRequest}
        />
      )}
      {!isAllPlans && showOverview && (
        <LearningPlanOverviewDrawer
          plan={plan}
          sourceChannels={sourceChannels}
          onClose={() => setShowOverview(false)}
          onPlanUpdated={(updated) => dispatch(updatePlan(updated))}
        />
      )}
      {showSortFilter && (
        <>
          <div
            className="drawer-overlay"
            onClick={() => setShowSortFilter(false)}
          />
          <aside className="drawer">
            <div className="drawer-header">
              <h2>Sort and filter courses</h2>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowSortFilter(false)}
              >
                ×
              </button>
            </div>
            <div className="drawer-body">
              <section className="workspace-filter-section">
                <label>Filter by custom labels</label>
                {customCourseLabels.length ? (
                  customCourseLabels.map((label) => (
                    <label className="filter-checkbox" key={label}>
                      <input
                        type="checkbox"
                        checked={labelFilters.includes(label)}
                        onChange={() =>
                          updatePageState({
                            labelFilters: labelFilters.includes(label)
                              ? labelFilters.filter((item) => item !== label)
                              : [...labelFilters, label],
                          })
                        }
                      />
                      {label}
                    </label>
                  ))
                ) : (
                  <p className="tile-date">No custom course labels yet.</p>
                )}
              </section>
              <div className="material-select">
                <label>Sort courses</label>
                <div
                  className="sort-toggle"
                  role="group"
                  aria-label="Sort courses"
                >
                  <button
                    className={sortBy === "updated" ? "active" : ""}
                    onClick={() => updatePageState({ sortBy: "updated" })}
                  >
                    Recently updated
                  </button>
                  <button
                    className={sortBy === "name" ? "active" : ""}
                    onClick={() => updatePageState({ sortBy: "name" })}
                  >
                    Name
                  </button>
                </div>
              </div>
            </div>
            <div className="drawer-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  updatePageState({ labelFilters: [], sortBy: "updated" });
                }}
              >
                Reset
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowSortFilter(false)}
              >
                Apply
              </button>
            </div>
          </aside>
        </>
      )}
      {courseToEdit && (
        <EditMetadataDrawer
          item={courseToEdit}
          type="course"
          onClose={() => setCourseToEdit(null)}
          onSave={async (form) => {
            const ownerPlanId = courseToEdit._planId || plan.id;
            await updateCourseMetadata(ownerPlanId, courseToEdit.id, {
              title: form.name,
              description: form.description,
              logo_url: form.logo_url,
            });
            const response = await updateCourseLabels(
              ownerPlanId,
              courseToEdit.id,
              form.labels,
            );
            dispatch(updatePlan(response.plan));
            setCourseToEdit(null);
          }}
          onDelete={async () => {
            if (
              !window.confirm(
                `Delete course “${courseToEdit.title}”? This cannot be undone.`,
              )
            )
              return;
            const response = await deleteCourses(courseToEdit._planId || plan.id, [courseToEdit.id]);
            dispatch(updatePlan(response.plan));
            setCourseToEdit(null);
          }}
        />
      )}
    </div>
  );
}
