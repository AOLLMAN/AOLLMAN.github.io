const GITHUB_USERNAME = "AOLLMAN";
const DISPLAY_NAME = "LIM JAEMIN";
const SUPABASE_URL = "https://ymxehuxhsigebqlutmey.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlteGVodXhoc2lnZWJxbHV0bWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTE2MjQsImV4cCI6MjA4OTI2NzYyNH0.PjcwOAdHzjrIxgYVyypoBg150mu3pnZZHNKcYnLLOLI";
const GUESTBOOK_TABLE = "guestbook_entries";
const GUESTBOOK_LIMIT = 12;

const elements = {
  bioCopy: document.querySelector("#bio-copy"),
  factsList: document.querySelector("#facts-list"),
  focusLine: document.querySelector("#focus-line"),
  guestbookForm: document.querySelector("#guestbook-form"),
  guestbookFormStatus: document.querySelector("#guestbook-form-status"),
  guestbookList: document.querySelector("#guestbook-list"),
  guestbookMessage: document.querySelector("#guestbook-message"),
  guestbookName: document.querySelector("#guestbook-name"),
  guestbookNote: document.querySelector("#guestbook-note"),
  guestbookSubmit: document.querySelector("#guestbook-submit"),
  leadCopy: document.querySelector("#lead-copy"),
  locationLine: document.querySelector("#location-line"),
  profileLink: document.querySelector("#profile-link"),
  repoGrid: document.querySelector("#repo-grid"),
  repoNote: document.querySelector("#repo-note"),
  statFollowers: document.querySelector("#stat-followers"),
  statLanguage: document.querySelector("#stat-language"),
  statRepos: document.querySelector("#stat-repos"),
  statStars: document.querySelector("#stat-stars"),
  supabaseStatus: document.querySelector("#supabase-status"),
  timeline: document.querySelector("#timeline"),
};

const repoTemplate = document.querySelector("#repo-template");
const timelineTemplate = document.querySelector("#timeline-template");
const guestbookEntryTemplate = document.querySelector("#guestbook-entry-template");

let guestbookEntries = [];
let guestbookWritable = false;
let guestbookSubmitting = false;

bindEvents();
init();

function bindEvents() {
  elements.guestbookForm?.addEventListener("submit", handleGuestbookSubmit);
}

async function init() {
  syncGuestbookFormState();
  setGuestbookFormStatus("idle", "이름과 메시지를 남기면 바로 목록에 반영됩니다.");

  const [githubResult, guestbookResult] = await Promise.allSettled([
    loadGithubData(),
    loadGuestbookEntries(),
  ]);

  if (guestbookResult.status === "fulfilled") {
    guestbookEntries = guestbookResult.value;
    guestbookWritable = true;
    syncGuestbookFormState();
    renderGuestbookEntries(guestbookEntries);
    renderGuestbookReady(guestbookEntries.length);
  } else {
    renderGuestbookError(guestbookResult.reason);
  }

  if (githubResult.status === "fulfilled") {
    renderProfile(githubResult.value.profile, githubResult.value.repos);
    return;
  }

  renderGithubError(githubResult.reason);
}

async function loadGithubData() {
  const [profile, repos] = await Promise.all([
    fetchJson(`https://api.github.com/users/${GITHUB_USERNAME}`),
    fetchJson(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated&type=owner`
    ),
  ]);

  return { profile, repos };
}

async function loadGuestbookEntries() {
  return fetchSupabaseJson(
    `${SUPABASE_URL}/rest/v1/${GUESTBOOK_TABLE}?select=id,name,message,created_at&order=created_at.desc&limit=${GUESTBOOK_LIMIT}`
  );
}

async function createGuestbookEntry(entry) {
  const created = await fetchSupabaseJson(
    `${SUPABASE_URL}/rest/v1/${GUESTBOOK_TABLE}`,
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: [entry],
    }
  );

  return Array.isArray(created) ? created[0] : created;
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error(`GitHub API request failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function fetchSupabaseJson(url, options = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...options.headers,
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const rawText = await response.text();
  const payload = rawText ? parseJsonSafely(rawText) : null;

  if (!response.ok) {
    const error = new Error(getSupabaseErrorMessage(response.status, payload));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function handleGuestbookSubmit(event) {
  event.preventDefault();

  if (!guestbookWritable) {
    setGuestbookFormStatus(
      "error",
      "방명록 작성이 아직 준비되지 않았습니다. 아래 안내를 먼저 확인해 주세요."
    );
    return;
  }

  const name = elements.guestbookName?.value.trim() || "";
  const message = elements.guestbookMessage?.value.trim() || "";

  if (!name || !message) {
    setGuestbookFormStatus("error", "이름과 메시지를 모두 입력해 주세요.");
    return;
  }

  guestbookSubmitting = true;
  syncGuestbookFormState();
  setGuestbookFormStatus("submitting", "방명록을 저장하는 중입니다.");

  try {
    const entry = await createGuestbookEntry({ name, message });
    guestbookEntries = [entry, ...guestbookEntries].slice(0, GUESTBOOK_LIMIT);
    renderGuestbookEntries(guestbookEntries);
    renderGuestbookReady(guestbookEntries.length);
    elements.guestbookForm?.reset();
    setGuestbookFormStatus("success", "방명록이 저장되었습니다.");
  } catch (error) {
    const copy = getGuestbookErrorCopy(error);
    if (copy.lockForm) {
      guestbookWritable = false;
      syncGuestbookFormState();
      setSupabaseStatus("error", copy.statusText);
    }

    if (elements.guestbookNote) {
      elements.guestbookNote.textContent = copy.note;
    }

    setGuestbookFormStatus("error", copy.formMessage);
  } finally {
    guestbookSubmitting = false;
    syncGuestbookFormState();
  }
}

function renderProfile(profile, repos) {
  const publicRepos = repos.filter((repo) => !repo.fork);
  const totalStars = publicRepos.reduce(
    (sum, repo) => sum + repo.stargazers_count,
    0
  );
  const languageMap = buildLanguageMap(publicRepos);
  const topLanguage = Object.entries(languageMap).sort(
    (left, right) => right[1] - left[1]
  )[0]?.[0];
  const featuredRepos = [...publicRepos]
    .sort((left, right) => {
      if (right.stargazers_count !== left.stargazers_count) {
        return right.stargazers_count - left.stargazers_count;
      }

      return new Date(right.pushed_at) - new Date(left.pushed_at);
    })
    .slice(0, 6);
  const recentRepos = [...publicRepos]
    .sort((left, right) => new Date(right.pushed_at) - new Date(left.pushed_at))
    .slice(0, 5);

  document.title = `${DISPLAY_NAME} | 스케치북 포트폴리오`;
  elements.profileLink.href = profile.html_url;
  elements.leadCopy.textContent = buildLead(profile, publicRepos.length);
  elements.bioCopy.textContent = buildBio(
    profile,
    publicRepos.length,
    totalStars,
    topLanguage
  );
  elements.focusLine.textContent = topLanguage
    ? `${topLanguage} 중심으로 작업 중`
    : "새로운 아이디어를 탐색 중";
  elements.locationLine.textContent = profile.location || "위치 정보 없음";
  elements.statRepos.textContent = formatNumber(profile.public_repos);
  elements.statFollowers.textContent = formatNumber(profile.followers);
  elements.statStars.textContent = formatNumber(totalStars);
  elements.statLanguage.textContent = topLanguage || "여러 언어";
  elements.repoNote.textContent = `대표 공개 저장소 ${featuredRepos.length}개를 표시하고 있습니다.`;

  renderFacts(profile);
  renderRepos(featuredRepos);
  renderTimeline(recentRepos);
}

function renderFacts(profile) {
  const rows = [
    { label: "GitHub", value: "프로필 열기", href: profile.html_url },
    { label: "소속", value: profile.company || "미등록" },
    {
      label: "블로그",
      value: profile.blog ? "사이트 열기" : "미등록",
      href: profile.blog ? toExternalUrl(profile.blog) : null,
    },
    { label: "가입일", value: formatDate(profile.created_at) },
  ];

  const fragment = document.createDocumentFragment();

  rows.forEach(({ label, value, href }) => {
    const row = document.createElement("div");
    row.className = "fact-row";

    const term = document.createElement("dt");
    term.textContent = label;

    const description = document.createElement("dd");

    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = value;
      description.append(link);
    } else {
      description.textContent = value;
    }

    row.append(term, description);
    fragment.append(row);
  });

  elements.factsList.replaceChildren(fragment);
}

function renderRepos(repos) {
  if (repos.length === 0) {
    elements.repoGrid.innerHTML =
      '<div class="empty-state">표시할 공개 저장소가 아직 없습니다.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  repos.forEach((repo) => {
    const node = repoTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".repo-title").textContent = repo.name;
    node.querySelector(".repo-language").textContent = repo.language || "기타";
    node.querySelector(".repo-description").textContent = buildRepoSummary(repo);
    node.querySelector(".repo-stars").textContent = `스타 ${repo.stargazers_count}`;
    node.querySelector(".repo-date").textContent = `업데이트 ${formatDate(
      repo.pushed_at
    )}`;

    const link = node.querySelector(".repo-link");
    link.href = repo.html_url;

    fragment.append(node);
  });

  elements.repoGrid.replaceChildren(fragment);
}

function renderTimeline(repos) {
  if (repos.length === 0) {
    elements.timeline.innerHTML =
      '<div class="empty-state">최근 공개 활동이 여기에 표시됩니다.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  repos.forEach((repo) => {
    const node = timelineTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".timeline-date").textContent = formatDate(repo.pushed_at);
    node.querySelector(".timeline-title").textContent = repo.name;
    node.querySelector(".timeline-copy").textContent = buildTimelineCopy(repo);
    fragment.append(node);
  });

  elements.timeline.replaceChildren(fragment);
}

function renderGuestbookEntries(entries) {
  if (!elements.guestbookList || !guestbookEntryTemplate) {
    return;
  }

  if (entries.length === 0) {
    elements.guestbookList.innerHTML =
      '<div class="empty-state">첫 번째 방명록을 남겨 보세요.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  entries.forEach((entry) => {
    const node = guestbookEntryTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".guestbook-name").textContent = entry.name;
    node.querySelector(".guestbook-date").textContent = formatDateTime(
      entry.created_at
    );
    node.querySelector(".guestbook-message").textContent = entry.message;
    fragment.append(node);
  });

  elements.guestbookList.replaceChildren(fragment);
}

function renderGuestbookReady(entryCount) {
  setSupabaseStatus(
    "connected",
    entryCount > 0
      ? `연결됨 · ${formatNumber(entryCount)}개 로드`
      : "연결됨 · 첫 글 대기"
  );

  if (elements.guestbookNote) {
    elements.guestbookNote.textContent =
      entryCount > 0
        ? `최근 방명록 ${formatNumber(entryCount)}개를 표시하고 있습니다.`
        : "첫 번째 방명록을 남겨 보세요.";
  }
}

function renderGuestbookError(error) {
  const copy = getGuestbookErrorCopy(error);
  guestbookWritable = false;
  syncGuestbookFormState();
  setSupabaseStatus("error", copy.statusText);

  if (elements.guestbookNote) {
    elements.guestbookNote.textContent = copy.note;
  }

  if (elements.guestbookList) {
    elements.guestbookList.innerHTML = `<div class="error-state">${copy.listMessage}</div>`;
  }

  setGuestbookFormStatus("error", copy.formMessage);
}

function renderGithubError(error) {
  const message =
    error.status === 403
      ? "GitHub API 요청 한도에 도달했습니다. 잠시 후 다시 새로고침해 주세요."
      : "지금은 GitHub 프로필 데이터를 불러올 수 없습니다.";

  elements.leadCopy.textContent = message;
  elements.bioCopy.textContent = message;
  elements.focusLine.textContent = "실시간 데이터를 불러올 수 없음";
  elements.locationLine.textContent = "네트워크 상태 확인 필요";
  elements.repoGrid.innerHTML = `<div class="error-state">${message}</div>`;
  elements.timeline.innerHTML = `<div class="error-state">${message}</div>`;
  elements.factsList.innerHTML = `<div class="error-state">${message}</div>`;
}

function buildLead(profile, repoCount) {
  const parts = [
    `${DISPLAY_NAME}의 GitHub 기반 스케치북 페이지입니다.`,
    `${formatNumber(repoCount)}개의 공개 저장소를 따뜻한 손그림 스타일 레이아웃에 담았습니다.`,
  ];

  if (profile.location) {
    parts.push(`활동 지역은 ${profile.location}입니다.`);
  }

  return parts.join(" ");
}

function buildBio(profile, repoCount, totalStars, topLanguage) {
  const parts = [
    `${DISPLAY_NAME}의 공개 코드와 최근 작업 흐름을 종이 질감의 한 화면에 정리한 개인 페이지입니다.`,
    `현재 공개 저장소는 ${formatNumber(repoCount)}개이고, 누적 스타 수는 ${formatNumber(
      totalStars
    )}개입니다.`,
  ];

  if (topLanguage) {
    parts.push(`가장 많이 보이는 언어는 ${topLanguage}입니다.`);
  }

  if (profile.location) {
    parts.push(`활동 지역은 ${profile.location}으로 표시됩니다.`);
  }

  return parts.join(" ");
}

function buildLanguageMap(repos) {
  return repos.reduce((map, repo) => {
    if (!repo.language) {
      return map;
    }

    map[repo.language] = (map[repo.language] || 0) + 1;
    return map;
  }, {});
}

function buildRepoSummary(repo) {
  const parts = [];

  if (repo.language) {
    parts.push(`${repo.language} 중심으로 구성된`);
  } else {
    parts.push("여러 기술이 함께 쓰인");
  }

  parts.push("공개 저장소입니다.");

  if (repo.homepage) {
    parts.push("연결된 외부 페이지도 함께 운영 중입니다.");
  }

  return parts.join(" ");
}

function buildTimelineCopy(repo) {
  if (repo.language) {
    return `${repo.language} 관련 작업이 최근에 업데이트되었습니다.`;
  }

  return "최근에 푸시된 공개 저장소입니다.";
}

function getGuestbookErrorCopy(error) {
  const payload = error?.payload || {};
  const message = [error?.message, payload?.message, payload?.hint]
    .filter(Boolean)
    .join(" ");

  if (
    payload?.code === "PGRST205" ||
    message.includes("Could not find the table")
  ) {
    return {
      statusText: "테이블 필요",
      note: "Supabase SQL Editor에서 supabase/guestbook.sql을 먼저 실행해 주세요.",
      listMessage:
        "방명록 테이블이 아직 없습니다. supabase/guestbook.sql을 실행한 뒤 새로고침하면 바로 사용할 수 있습니다.",
      formMessage:
        "방명록 테이블이 아직 준비되지 않았습니다. supabase/guestbook.sql을 먼저 적용해 주세요.",
      lockForm: true,
    };
  }

  if (message.toLowerCase().includes("row-level security")) {
    return {
      statusText: "정책 확인 필요",
      note: "읽기 또는 쓰기 정책이 없어 방명록에 접근할 수 없습니다.",
      listMessage:
        "RLS policy가 없어서 방명록을 열 수 없습니다. supabase/guestbook.sql의 policy 구문을 적용해 주세요.",
      formMessage:
        "쓰기 권한이 막혀 있습니다. Supabase의 RLS policy 설정을 확인해 주세요.",
      lockForm: true,
    };
  }

  if (error?.status === 401 || error?.status === 403) {
    return {
      statusText: "권한 확인 필요",
      note: "anon key 또는 정책 설정 때문에 방명록에 접근하지 못하고 있습니다.",
      listMessage:
        "현재 권한으로 방명록을 읽을 수 없습니다. anon key와 policy 설정을 확인해 주세요.",
      formMessage:
        "현재 권한으로는 글을 저장할 수 없습니다. anon key와 policy 설정을 확인해 주세요.",
      lockForm: true,
    };
  }

  if (error?.status >= 500) {
    return {
      statusText: "서버 응답 대기",
      note: "Supabase가 일시적으로 응답하지 않았습니다. 잠시 후 다시 시도해 주세요.",
      listMessage:
        "Supabase 응답이 일시적으로 불안정합니다. 잠시 후 새로고침해 다시 확인해 주세요.",
      formMessage:
        "서버가 일시적으로 응답하지 않았습니다. 잠시 후 다시 시도해 주세요.",
      lockForm: false,
    };
  }

  return {
    statusText: "연결 문제",
    note: "방명록을 불러오지 못했습니다. 네트워크나 Supabase 설정을 다시 확인해 주세요.",
    listMessage:
      "방명록 데이터를 불러오지 못했습니다. 네트워크 상태 또는 Supabase 설정을 확인해 주세요.",
    formMessage:
      "방명록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    lockForm: false,
  };
}

function getSupabaseErrorMessage(status, payload) {
  if (payload && typeof payload === "object" && payload.message) {
    return payload.message;
  }

  return `Supabase request failed with ${status}`;
}

function parseJsonSafely(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function setSupabaseStatus(state, message) {
  if (!elements.supabaseStatus) {
    return;
  }

  elements.supabaseStatus.dataset.state = state;
  elements.supabaseStatus.textContent = message;
}

function setGuestbookFormStatus(state, message) {
  if (!elements.guestbookFormStatus) {
    return;
  }

  elements.guestbookFormStatus.dataset.state = state;
  elements.guestbookFormStatus.textContent = message;
}

function syncGuestbookFormState() {
  const disabled = guestbookSubmitting || !guestbookWritable;

  [elements.guestbookName, elements.guestbookMessage, elements.guestbookSubmit]
    .filter(Boolean)
    .forEach((node) => {
      node.disabled = disabled;
    });

  if (!elements.guestbookSubmit) {
    return;
  }

  if (guestbookSubmitting) {
    elements.guestbookSubmit.textContent = "저장 중...";
    return;
  }

  elements.guestbookSubmit.textContent = guestbookWritable ? "남기기" : "준비 필요";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function toExternalUrl(value) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}
