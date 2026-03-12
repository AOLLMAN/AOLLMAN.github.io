const GITHUB_USERNAME = "AOLLMAN";
const DISPLAY_NAME = "LIM JAEMIN";

const elements = {
  bioCopy: document.querySelector("#bio-copy"),
  factsList: document.querySelector("#facts-list"),
  focusLine: document.querySelector("#focus-line"),
  leadCopy: document.querySelector("#lead-copy"),
  locationLine: document.querySelector("#location-line"),
  profileLink: document.querySelector("#profile-link"),
  repoGrid: document.querySelector("#repo-grid"),
  repoNote: document.querySelector("#repo-note"),
  statFollowers: document.querySelector("#stat-followers"),
  statLanguage: document.querySelector("#stat-language"),
  statRepos: document.querySelector("#stat-repos"),
  statStars: document.querySelector("#stat-stars"),
  timeline: document.querySelector("#timeline"),
};

const repoTemplate = document.querySelector("#repo-template");
const timelineTemplate = document.querySelector("#timeline-template");

init();

async function init() {
  try {
    const [profile, repos] = await Promise.all([
      fetchJson(`https://api.github.com/users/${GITHUB_USERNAME}`),
      fetchJson(
        `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated&type=owner`
      ),
    ]);

    renderProfile(profile, repos);
  } catch (error) {
    renderError(error);
  }
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

function renderError(error) {
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

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
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
