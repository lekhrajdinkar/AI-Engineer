import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import AddCourseModal from "../components/AddCourseModal";
import AiCourseModal from "../components/AiCourseModal";
import { deletePlan as removePlan, updatePlan } from "../store/plansSlice";
import {
  deleteCourses,
  deletePlan as deletePlanRequest,
  replacePlan,
  updateCourseLabels,
  updateCourseMetadata,
  updatePlanLabels,
  updatePlanMetadata,
} from "../api/client";
import EditMetadataDrawer from "../components/EditMetadataDrawer";
import LoadingBar from "../components/LoadingBar";
import { CloseIcon, EditIcon, LabelIcon, WorkspaceIcon } from "../components/Icons";
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

function HighlightedJson({ value, text }) {
  const json = text ?? JSON.stringify(value, null, 2);
  const tokenPattern = /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"\s*:)|("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")|\b(true|false)\b|\b(null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  const parts = [];
  let cursor = 0;
  let match;

  while ((match = tokenPattern.exec(json)) !== null) {
    if (match.index > cursor) parts.push(json.slice(cursor, match.index));
    const token = match[0];
    const className = match[1]
      ? "json-token-key"
      : match[2]
        ? "json-token-string"
        : match[3]
          ? "json-token-boolean"
          : match[4]
            ? "json-token-null"
            : "json-token-number";
    parts.push(<span className={className} key={`${match.index}-${token}`}>{token}</span>);
    cursor = tokenPattern.lastIndex;
  }
  if (cursor < json.length) parts.push(json.slice(cursor));

  return <pre className="refresh-feed-json plan-json-highlight" aria-label="Learning plan JSON"><code>{parts}</code></pre>;
}

function CourseThumbnail({ logoUrl, title }) {
  const [imageShape, setImageShape] = React.useState("emblem");

  React.useEffect(() => {
    setImageShape("emblem");
  }, [logoUrl]);

  if (!logoUrl) {
    return (
      <div className="course-card-thumbnail is-empty">
        <div className="course-card-thumbnail-fallback">
          {title?.charAt(0).toUpperCase() || "?"}
        </div>
      </div>
    );
  }

  return (
    <div className={`course-card-thumbnail has-logo is-${imageShape}`}>
      <img
        src={logoUrl}
        alt=""
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          setImageShape(
            naturalHeight > 0 && naturalWidth / naturalHeight >= 1.35
              ? "wide"
              : "emblem",
          );
        }}
      />
    </div>
  );
}

const BULK_ACTION_OPTIONS = [
  {
    value: "label:mark_for_delete",
    label: "Mark for delete",
    description: "Flag selected courses for deletion",
    icon: "delete",
  },
  {
    value: "label:bookmarked",
    label: "Bookmark",
    description: "Bookmark selected courses",
    icon: "bookmark",
  },
  {
    value: "label:watched",
    label: "Mark watched",
    description: "Mark selected courses as watched",
    icon: "check",
  },
  {
    value: "custom_label",
    label: "Add custom label",
    description: "Attach a label to selected courses",
    icon: "label",
  },
  {
    value: "clear_labels",
    label: "Clear all labels",
    description: "Remove every label from selected courses",
    icon: "clear",
  },
  {
    value: "update_logo",
    label: "Update logo",
    description: "Replace the selected course logos",
    icon: "image",
  },
];

function BulkActionIcon({ name }) {
  const paths = {
    delete: "M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5",
    bookmark: "M6 3h12v18l-6-4-6 4V3Z",
    check: "m5 12 4 4L19 6",
    label: "M4 5h9l7 7-8 8-8-8V5Zm5 4h.01",
    clear: "m5 16 7-9 7 9-3 3H8l-3-3Zm5 3h10",
    image: "M4 5h16v14H4V5Zm0 11 5-5 4 4 2-2 5 5M15 9h.01",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function BulkActionDropdown({ value, onChange, disabled }) {
  const [open, setOpen] = React.useState(false);
  const pickerRef = React.useRef(null);
  const selected =
    BULK_ACTION_OPTIONS.find((option) => option.value === value) ||
    BULK_ACTION_OPTIONS[0];

  React.useEffect(() => {
    const close = (event) => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  React.useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div className="learning-path-picker course-bulk-action-picker" ref={pickerRef}>
      <button
        type="button"
        className="learning-path-trigger course-bulk-action-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`course-bulk-action-icon is-${selected.icon}`}>
          <BulkActionIcon name={selected.icon} />
        </span>
        <span>{selected.label}</span>
        <svg className="course-bulk-chevron" viewBox="0 0 16 16" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="learning-path-menu course-bulk-action-menu" role="menu" aria-label="Choose bulk action">
          <strong>Choose bulk action</strong>
          {BULK_ACTION_OPTIONS.map((option) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              className={`course-bulk-action-option ${option.value === value ? "active" : ""}`}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span className="learning-path-menu-check">
                {option.value === value && (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="m3 8 3 3 7-7" />
                  </svg>
                )}
              </span>
              <span className={`course-bulk-action-icon is-${option.icon}`}>
                <BulkActionIcon name={option.icon} />
              </span>
              <span>
                <b>{option.label}</b>
                <small>{option.description}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LearningPlanOverviewDrawer({
  plan,
  sourceChannels,
  onClose,
  onEdit,
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
          <div className="plan-info-drawer-actions">
            <button className="btn btn-secondary btn-sm icon-button" onClick={onEdit} title="Edit learning plan" aria-label="Edit learning plan"><EditIcon /></button>
            <button className="btn btn-secondary btn-sm icon-button" onClick={onClose} title="Close plan information" aria-label="Close plan information"><CloseIcon /></button>
          </div>
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
                <HighlightedJson value={plan} />
              )}
            </div>
          )}
        </div>
        {tab === "json" && <div className="drawer-footer learning-plan-json-footer">
          <button className="overview-json-action overview-download-json" onClick={downloadJson}>
            <JsonActionIcon name="download" />
            <span>Download JSON</span>
          </button>
          <button className="overview-json-action overview-load-json" onClick={() => jsonFileInputRef.current?.click()} disabled={uploadingJson}>
            <JsonActionIcon name="load" />
            <span>Upload JSON</span>
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
              <button className="btn btn-secondary" onClick={cancelJsonEdit} disabled={uploadingJson}>Cancel</button>
              <button className="btn btn-primary overview-upload-json" onClick={uploadJson} disabled={uploadingJson}>
                {uploadingJson ? "Uploading…" : "Upload JSON"}
              </button>
            </>
          )}
        </div>}
      </aside>
    </>
  );
}

export default function PlanOverview({ loading = false }) {
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
  const [showPlanEdit, setShowPlanEdit] = React.useState(false);
  const [showSortFilter, setShowSortFilter] = React.useState(false);
  const [labelSearch, setLabelSearch] = React.useState("");
  const [showMobileActions, setShowMobileActions] = React.useState(false);
  const [selectedCourseKeys, setSelectedCourseKeys] = React.useState([]);
  const [bulkAction, setBulkAction] = React.useState("label:mark_for_delete");
  const [bulkCustomLabel, setBulkCustomLabel] = React.useState("");
  const [bulkLogoUrl, setBulkLogoUrl] = React.useState("");
  const [bulkUpdating, setBulkUpdating] = React.useState(false);
  const [bulkError, setBulkError] = React.useState("");
  const { query, sortBy, labelFilters, courseLabelTab, showCourseProgress } = useSelector((state) =>
    selectPlanPageState(state, planId),
  );
  const updatePageState = (changes) =>
    dispatch(updatePlanPage({ planId, changes }));
  React.useEffect(() => {
    dispatch(rememberLearningLocation({ planId, courseId: "all", moduleId: null, videoId: null }));
  }, [dispatch, planId]);
  const standardCourseTabs = [
    { id: "ALL", label: "All courses", shortLabel: "All Courses" },
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
  const visibleCustomCourseLabels = customCourseLabels
    .filter((label) => label.toLowerCase().includes(labelSearch.trim().toLowerCase()))
    .sort((left, right) => left.localeCompare(right));
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
  const getCourseKey = (course) => `${course._planId || plan?.id}:${course.id}`;
  const selectedKeySet = new Set(selectedCourseKeys);
  const selectedCourses = (plan?.courses || []).filter((course) =>
    selectedKeySet.has(getCourseKey(course)),
  );
  const visibleCourseKeys = visibleCourses.map(getCourseKey);
  const allVisibleSelected =
    visibleCourseKeys.length > 0 &&
    visibleCourseKeys.every((courseKey) => selectedKeySet.has(courseKey));
  const someVisibleSelected = visibleCourseKeys.some((courseKey) =>
    selectedKeySet.has(courseKey),
  );

  React.useEffect(() => {
    const validKeys = new Set((plan?.courses || []).map(getCourseKey));
    setSelectedCourseKeys((current) =>
      current.filter((courseKey) => validKeys.has(courseKey)),
    );
  }, [plan]);

  const toggleCourseSelection = (course) => {
    const courseKey = getCourseKey(course);
    setSelectedCourseKeys((current) =>
      current.includes(courseKey)
        ? current.filter((item) => item !== courseKey)
        : [...current, courseKey],
    );
  };

  const toggleAllVisibleCourses = () => {
    setSelectedCourseKeys((current) => {
      const currentKeys = new Set(current);
      if (allVisibleSelected) {
        visibleCourseKeys.forEach((courseKey) => currentKeys.delete(courseKey));
      } else {
        visibleCourseKeys.forEach((courseKey) => currentKeys.add(courseKey));
      }
      return [...currentKeys];
    });
  };

  const updateSelectedCourses = async (updater) => {
    if (!selectedCourses.length || bulkUpdating) return;
    setBulkUpdating(true);
    setBulkError("");
    try {
      for (const course of selectedCourses) {
        const response = await updater(course, course._planId || plan.id);
        if (response?.plan) dispatch(updatePlan(response.plan));
      }
    } catch (error) {
      setBulkError(error.message || "Unable to update the selected courses.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const applyBulkCourseAction = async () => {
    if (bulkAction.startsWith("label:")) {
      const label = bulkAction.slice("label:".length);
      await updateSelectedCourses((course, ownerPlanId) =>
        course.labels?.includes(label)
          ? null
          : updateCourseLabels(ownerPlanId, course.id, [...(course.labels || []), label]),
      );
      return;
    }
    if (bulkAction === "custom_label") {
      const label = bulkCustomLabel.trim();
      if (!label) return;
      await updateSelectedCourses((course, ownerPlanId) =>
        course.labels?.includes(label)
          ? null
          : updateCourseLabels(ownerPlanId, course.id, [...(course.labels || []), label]),
      );
      setBulkCustomLabel("");
      return;
    }
    if (bulkAction === "clear_labels") {
      await updateSelectedCourses((course, ownerPlanId) =>
        course.labels?.length
          ? updateCourseLabels(ownerPlanId, course.id, [])
          : null,
      );
      return;
    }
    if (bulkAction === "update_logo") {
      const logoUrl = bulkLogoUrl.trim();
      if (!logoUrl) return;
      await updateSelectedCourses((course, ownerPlanId) =>
        updateCourseMetadata(ownerPlanId, course.id, { logo_url: logoUrl }),
      );
      setBulkLogoUrl("");
    }
  };
  const courseViewOptions = [
    ...standardCourseTabs.map((tab) => ({
      ...tab,
      group: "built-in",
      count:
        tab.id === "ALL"
          ? plan?.courses?.length || 0
          : plan?.courses?.filter((course) => course.labels?.includes(tab.id)).length || 0,
    })),
    ...customCourseLabels
      .sort((left, right) => left.localeCompare(right))
      .map((label) => ({
        id: label,
        label: label.replaceAll("_", " "),
        group: "custom",
        count:
          plan?.courses?.filter((course) => course.labels?.includes(label)).length || 0,
      })),
  ];
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

      
      {!isAllPlans && <div className="add-course-group">
        <button className="btn btn-secondary btn-sm" onClick={() => setShowManual(true)}>
          <WorkspaceIcon name="manual" />
          Manual course
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowAi(true)}>
          <WorkspaceIcon name="ai" />
          AI suggested Course
        </button>
      </div>}

      {!isAllPlans && <button
        className="btn btn-secondary btn-sm ai-request-status-button"
        onClick={() => navigate(`/plans/${planId}/ai-requests`)}
      >
        <WorkspaceIcon name="progress" />
        <span>AI Request Status</span>
      </button>}

      <input
        value={query}
        onChange={(event) => updatePageState({ query: event.target.value })}
        placeholder="Search courses..."
        aria-label="Search courses"
      />
      <button
        className={`btn btn-secondary btn-sm icon-button ${labelFilters.length ? "active" : ""}`}
        title="Sort and Filter ourses"
        aria-label="Sort and filter courses"
        onClick={() => setShowSortFilter(true)}
      >
        <WorkspaceIcon name="sort" />
      </button>

    </div>
  );

  if (!plan && loading)
    return <div className="plan-overview-page"><LoadingBar active label="Loading learning plans…" /></div>;

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
            showCount
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
      <LoadingBar active={loading} label="Refreshing learning plans…" />
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
        <section
          className={`course-bulk-panel ${selectedCourses.length > 0 ? "open" : ""}`}
          aria-label="Selected course actions"
          aria-hidden={selectedCourses.length === 0}
        >
          <div className="course-bulk-panel-inner">
            <div className="course-bulk-selection">
              <span className="course-bulk-count">{selectedCourses.length}</span>
              <div>
                <strong>course{selectedCourses.length === 1 ? "" : "s"} selected</strong>
                <button type="button" onClick={() => setSelectedCourseKeys([])} disabled={!selectedCourses.length || bulkUpdating}>
                  Clear selection
                </button>
              </div>
            </div>
            <div className="course-bulk-field">
              <BulkActionDropdown
                value={bulkAction}
                onChange={(value) => {
                  setBulkAction(value);
                  setBulkError("");
                }}
                disabled={!selectedCourses.length || bulkUpdating}
              />
            </div>
            {bulkAction === "custom_label" && (
              <label className="course-bulk-field course-bulk-value-field">
                <span>Label name</span>
                <input
                  value={bulkCustomLabel}
                  onChange={(event) => setBulkCustomLabel(event.target.value)}
                  placeholder="Enter custom label"
                  disabled={!selectedCourses.length || bulkUpdating}
                />
              </label>
            )}
            {bulkAction === "update_logo" && (
              <label className="course-bulk-field course-bulk-value-field">
                <span>Logo URL</span>
                <input
                  type="url"
                  value={bulkLogoUrl}
                  onChange={(event) => setBulkLogoUrl(event.target.value)}
                  placeholder="https://…"
                  disabled={!selectedCourses.length || bulkUpdating}
                />
              </label>
            )}
            <button
              type="button"
              className={`btn btn-sm ${bulkAction === "clear_labels" ? "btn-danger" : "btn-primary"} course-bulk-apply`}
              onClick={applyBulkCourseAction}
              disabled={
                !selectedCourses.length ||
                bulkUpdating ||
                (bulkAction === "custom_label" && !bulkCustomLabel.trim()) ||
                (bulkAction === "update_logo" && !bulkLogoUrl.trim())
              }
            >
              {bulkUpdating ? <><span className="spinner" /> Updating…</> : "Apply"}
            </button>
          </div>
          {bulkUpdating && <span className="course-bulk-running-bar" role="status" aria-live="polite"><i /></span>}
        </section>
        <div className="page-header course-toolbar">
          <div className="course-toolbar-title">
            <h4>
              Courses{" "}
              <span className="badge badge-green">{plan.courses?.length || 0}</span>
            </h4>
            {labelFilters.length > 0 && <div className="course-toolbar-filter-tags" aria-label="Selected custom labels">
              {labelFilters.map((label) => {
                const labelCourseCount = (plan.courses || []).filter((course) =>
                  course.labels?.includes(label),
                ).length;
                return (
                  <button
                    type="button"
                    key={label}
                    title={`Remove ${label} filter`}
                    onClick={() =>
                      updatePageState({
                        labelFilters: labelFilters.filter((item) => item !== label),
                      })
                    }
                  >
                    <span>{label}</span>
                    <em aria-label={`${labelCourseCount} courses`}>{labelCourseCount}</em>
                    <b aria-hidden="true">×</b>
                  </button>
                );
              })}
            </div>}
          </div>
          <div className="course-toolbar-options">
            <label className="course-progress-switch">
              <input
                type="checkbox"
                checked={showCourseProgress}
                onChange={(event) => updatePageState({ showCourseProgress: event.target.checked })}
              />
              <span className="course-progress-switch-track" aria-hidden="true" />
              <span>Show progress</span>
            </label>
            <label className="course-select-all">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someVisibleSelected && !allVisibleSelected;
                }}
                onChange={toggleAllVisibleCourses}
                disabled={!visibleCourses.length || bulkUpdating}
              />
              <span>Select all visible</span>
            </label>
          </div>
        </div>
        {bulkError && <div className="alert alert-error course-bulk-error">{bulkError}</div>}
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
                className={`card catalog-tile course-card-modern ${showCourseProgress ? "showing-progress" : "progress-hidden"} ${selectedKeySet.has(getCourseKey(course)) ? "course-card-selected" : ""} ${course.labels?.includes("refresh_needed") ? "refresh-needed-course" : ""}`}
                key={getCourseKey(course)}
                onClick={() =>
                  navigate(`/plans/${course._planId || plan.id}/courses/${course.id}/learn`)
                }
              >
                <label
                  className="course-card-selector"
                  title={`Select ${course.title}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedKeySet.has(getCourseKey(course))}
                    onChange={() => toggleCourseSelection(course)}
                    disabled={bulkUpdating}
                    aria-label={`Select ${course.title}`}
                  />
                  <span aria-hidden="true" />
                </label>
                <CourseThumbnail logoUrl={logoUrl} title={course.title} />
                <header className="catalog-tile-header">
                  <div>
                    <h3>{course.title}</h3>
                    {course._planName && <small className="course-owner-plan">{course._planName}</small>}
                    <p>{course.description || "No description provided."}</p>
                  </div>
                </header>
                {showCourseProgress && <section className="course-card-progress">
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
                </section>}
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
              <div className="mobile-action-drawer-heading">
                <span className="mobile-action-drawer-icon"><WorkspaceIcon name="menu" /></span>
                <div><small>Learning plan</small><h2>Plan actions</h2></div>
              </div>
              <button className="mobile-action-drawer-close" onClick={() => setShowMobileActions(false)} aria-label="Close"><CloseIcon /></button>
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
          onEdit={() => {
            setShowOverview(false);
            setShowPlanEdit(true);
          }}
          onPlanUpdated={(updated) => dispatch(updatePlan(updated))}
        />
      )}
      {!isAllPlans && showPlanEdit && (
        <EditMetadataDrawer
          item={plan}
          type="plan"
          onClose={() => setShowPlanEdit(false)}
          onSave={async (form) => {
            await updatePlanMetadata(plan.id, {
              name: form.name,
              description: form.description,
              logo_url: form.logo_url,
            });
            const response = await updatePlanLabels(plan.id, form.labels);
            dispatch(updatePlan(response.plan));
            setShowPlanEdit(false);
          }}
          onDelete={async () => {
            const confirmed = window.confirm(
              `Delete “${plan.name}”? This permanently removes the learning plan and all of its courses.`,
            );
            if (!confirmed) return;
            setShowPlanEdit(false);
            setBulkError("");
            try {
              await deletePlanRequest(plan.id);
              dispatch(removePlan(plan.id));
              dispatch(rememberLearningLocation({ planId: "all", courseId: "all", moduleId: null, videoId: null }));
              navigate("/plans/all");
            } catch (error) {
              setBulkError(error.message || "Unable to delete the learning plan.");
            }
          }}
        />
      )}
      {showSortFilter && (
        <>
          <div
            className="drawer-overlay"
            onClick={() => setShowSortFilter(false)}
          />
          <aside className="drawer course-sort-filter-drawer">
            <div className="drawer-header">
              <h2>COURSES - SORT AND FILTER</h2>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowSortFilter(false)}
              ><CloseIcon /></button>
            </div>
            <div className="drawer-body course-sort-filter-body">
              <section className="material-select course-sort-section">
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
              </section>

              <section className="workspace-filter-section course-label-filter-section">
                <label>Filter by custom labels</label>
                <label className="course-label-search">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
                  <input type="search" value={labelSearch} onChange={(event) => setLabelSearch(event.target.value)} placeholder="Search labels..." aria-label="Search custom course labels" />
                </label>
                <div className="course-label-filter-list">
                {visibleCustomCourseLabels.length ? (
                  visibleCustomCourseLabels.map((label) => (
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
                ) : customCourseLabels.length ? (
                  <p className="tile-date">No labels match “{labelSearch}”.</p>
                ) : (
                  <p className="tile-date">No custom course labels yet.</p>
                )}
                </div>
              </section>
            </div>
            <div className="drawer-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  updatePageState({ labelFilters: [], sortBy: "updated" });
                  setLabelSearch("");
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
