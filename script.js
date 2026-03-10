const GITHUB_USERNAME = "AOLLMAN";
const DISPLAY_NAME = "LIM JAEMIN";

const elements = {
  avatar: document.querySelector("#avatar"),
  bio: document.querySelector("#bio"),
  displayName: document.querySelector("#display-name"),
  githubHandle: document.querySelector("#github-handle"),
  heroDescription: document.querySelector("#hero-description"),
  languageList: document.querySelector("#language-list"),
  profileDetails: document.querySelector("#profile-details"),
  profileLink: document.querySelector("#profile-link"),
  repoGrid: document.querySelector("#repo-grid"),
  statFollowers: document.querySelector("#stat-followers"),
  statRepos: document.querySelector("#stat-repos"),
  statSince: document.querySelector("#stat-since"),
  statStars: document.querySelector("#stat-stars"),
  statusPill: document.querySelector("#status-pill"),
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

  document.title = `${DISPLAY_NAME} | GitHub Portfolio`;
  elements.avatar.src = profile.avatar_url;
  elements.avatar.alt = `${DISPLAY_NAME} GitHub avatar`;
  elements.displayName.textContent = DISPLAY_NAME;
  elements.githubHandle.textContent = DISPLAY_NAME;
  elements.bio.textContent =
    profile.bio || "GitHub 프로필에 등록된 소개 문구가 없습니다.";
  elements.heroDescription.textContent = buildHeroCopy(profile, publicRepos.length);
  elements.profileLink.href = profile.html_url;
  elements.statusPill.textContent = "Live from GitHub API";
  elements.statRepos.textContent = formatNumber(profile.public_repos);
  elements.statFollowers.textContent = formatNumber(profile.followers);
  elements.statStars.textContent = formatNumber(totalStars);
  elements.statSince.textContent = new Date(profile.created_at).getFullYear();

  renderProfileDetails(profile);
  renderLanguageList(languageMap);
  renderRepoCards(featuredRepos);
  renderTimeline(recentRepos);
}

function buildHeroCopy(profile, repoCount) {
  const segments = [
    `Live portfolio for ${DISPLAY_NAME}, powered by GitHub profile data.`,
    `${formatNumber(repoCount)} public repositories and ${formatNumber(
      profile.followers
    )} followers in one place.`,
  ];

  if (profile.location) {
    segments.push(`Location: ${profile.location}.`);
  }

  return segments.join(" ");
}

function renderProfileDetails(profile) {
  const rows = [
    { label: "GitHub", value: "Open profile", href: profile.html_url },
    { label: "Company", value: profile.company || "Not listed" },
    { label: "Location", value: profile.location || "Not listed" },
    {
      label: "Blog",
      value: profile.blog ? "Open site" : "Not listed",
      href: profile.blog ? toExternalUrl(profile.blog) : null,
    },
    { label: "Member Since", value: formatDate(profile.created_at) },
  ];

  const list = document.createElement("dl");
  list.className = "detail-list";

  rows.forEach(({ label, value, href }) => {
    const row = document.createElement("div");
    row.className = "detail-row";

    const term = document.createElement("dt");
    term.textContent = label;

    const description = document.createElement("dd");
    description.style.margin = "0";
    description.style.textAlign = "right";

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
    list.append(row);
  });

  elements.profileDetails.replaceChildren(list);
}

function renderLanguageList(languageMap) {
  const entries = Object.entries(languageMap)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);

  if (entries.length === 0) {
    elements.languageList.innerHTML =
      '<div class="empty-state">언어 데이터를 계산할 공개 저장소가 없습니다.</div>';
    return;
  }

  const topValue = entries[0][1];
  const fragment = document.createDocumentFragment();

  entries.forEach(([language, count]) => {
    const row = document.createElement("div");
    row.className = "language-row";

    const left = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = language;

    const bar = document.createElement("div");
    bar.className = "language-bar";

    const fill = document.createElement("div");
    fill.className = "language-fill";
    fill.style.width = `${Math.max((count / topValue) * 100, 12)}%`;

    bar.append(fill);
    left.append(name, bar);
    left.style.flex = "1";

    const total = document.createElement("span");
    total.textContent = `${count} repos`;

    row.append(left, total);
    fragment.append(row);
  });

  elements.languageList.replaceChildren(fragment);
}

function renderRepoCards(repos) {
  if (repos.length === 0) {
    elements.repoGrid.innerHTML =
      '<div class="empty-state">표시할 공개 저장소가 없습니다.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  repos.forEach((repo) => {
    const node = repoTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".repo-title").textContent = repo.name;
    node.querySelector(".repo-language").textContent = repo.language || "Mixed";
    node.querySelector(".repo-description").textContent =
      repo.description || "저장소 설명이 아직 없습니다.";
    node.querySelector(".repo-stars").textContent = `★ ${repo.stargazers_count}`;
    node.querySelector(".repo-updated").textContent =
      "Updated " + formatDate(repo.pushed_at);

    const link = node.querySelector(".repo-link");
    link.href = repo.html_url;

    fragment.append(node);
  });

  elements.repoGrid.replaceChildren(fragment);
}

function renderTimeline(repos) {
  if (repos.length === 0) {
    elements.timeline.innerHTML =
      '<div class="empty-state">최근 활동으로 표시할 저장소가 없습니다.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  repos.forEach((repo) => {
    const node = timelineTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".timeline-date").textContent = formatDate(repo.pushed_at);
    node.querySelector(".timeline-title").textContent = repo.name;
    node.querySelector(".timeline-text").textContent =
      repo.description || "최근 푸시가 있었지만 설명은 등록되지 않았습니다.";
    fragment.append(node);
  });

  elements.timeline.replaceChildren(fragment);
}

function renderError(error) {
  const message =
    error.status === 403
      ? "GitHub API 요청 제한에 걸렸습니다. 잠시 후 다시 시도하세요."
      : "GitHub 프로필을 불러오지 못했습니다. 사용자명과 네트워크 상태를 확인하세요.";

  elements.statusPill.textContent = "GitHub fetch failed";
  elements.heroDescription.textContent = message;
  elements.bio.textContent = message;
  elements.repoGrid.innerHTML = `<div class="error-state">${message}</div>`;
  elements.timeline.innerHTML = `<div class="error-state">${message}</div>`;
  elements.languageList.innerHTML = `<div class="error-state">${message}</div>`;
  elements.profileDetails.innerHTML = `<div class="error-state">${message}</div>`;
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

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function toExternalUrl(value) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}
