const GITHUB_USERNAME = "AOLLMAN";
const FALLBACK_NAME = "LIM JAEMIN";
const SITE_REPO_URL = "https://github.com/AOLLMAN/AOLLMAN.github.io";

const elements = {
  aboutCopy: document.querySelector("#about-copy"),
  activityList: document.querySelector("#activity-list"),
  activityNote: document.querySelector("#activity-note"),
  bioLead: document.querySelector("#bio-lead"),
  closingCopy: document.querySelector("#closing-copy"),
  contactLinks: document.querySelector("#contact-links"),
  displayName: document.querySelector("#display-name"),
  factCompany: document.querySelector("#fact-company"),
  factLastPush: document.querySelector("#fact-last-push"),
  factLocation: document.querySelector("#fact-location"),
  factWebsite: document.querySelector("#fact-website"),
  githubLink: document.querySelector("#github-link"),
  languageCloud: document.querySelector("#language-cloud"),
  profileStatus: document.querySelector("#profile-status"),
  projectGrid: document.querySelector("#project-grid"),
  projectNote: document.querySelector("#project-note"),
  statFollowers: document.querySelector("#stat-followers"),
  statRepos: document.querySelector("#stat-repos"),
  statStars: document.querySelector("#stat-stars"),
  statYears: document.querySelector("#stat-years"),
  topLanguage: document.querySelector("#top-language"),
};

const projectTemplate = document.querySelector("#project-template");
const activityTemplate = document.querySelector("#activity-template");

init();

async function init() {
  try {
    const [profile, repos] = await Promise.all([
      fetchJson(`https://api.github.com/users/${GITHUB_USERNAME}`),
      fetchJson(
        `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated&type=owner`
      ),
    ]);

    renderPage(profile, repos.filter((repo) => !repo.fork));
  } catch (error) {
    renderErrorState(error);
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const error = new Error(`Request failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function renderPage(profile, repos) {
  const displayName = profile.name || FALLBACK_NAME;
  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const topLanguages = buildTopLanguages(repos);
  const featuredRepos = [...repos]
    .sort((left, right) => {
      if (right.stargazers_count !== left.stargazers_count) {
        return right.stargazers_count - left.stargazers_count;
      }

      return new Date(right.pushed_at) - new Date(left.pushed_at);
    })
    .slice(0, 6);
  const recentRepos = [...repos]
    .sort((left, right) => new Date(right.pushed_at) - new Date(left.pushed_at))
    .slice(0, 6);

  document.title = `${displayName} | GitHub Portfolio`;
  elements.displayName.textContent = displayName;
  elements.githubLink.href = profile.html_url;
  elements.profileStatus.textContent = buildStatusLine(profile, repos, topLanguages);
  elements.bioLead.textContent = buildLeadCopy(profile);
  elements.aboutCopy.textContent = buildAboutCopy(profile, repos.length, totalStars, topLanguages);
  elements.closingCopy.textContent = buildClosingCopy(profile, repos.length, featuredRepos);

  elements.statRepos.textContent = formatNumber(profile.public_repos);
  elements.statFollowers.textContent = formatNumber(profile.followers);
  elements.statStars.textContent = formatNumber(totalStars);
  elements.statYears.textContent = String(new Date(profile.created_at).getFullYear());
  elements.topLanguage.textContent = topLanguages[0]?.name || "Mixed";

  elements.factLocation.textContent = profile.location || "Not specified";
  elements.factCompany.textContent = profile.company || "Independent";
  elements.factWebsite.textContent = profile.blog ? trimUrl(toExternalUrl(profile.blog)) : "GitHub Pages";
  elements.factLastPush.textContent = recentRepos[0] ? formatDate(recentRepos[0].pushed_at) : "No recent push";

  elements.projectNote.textContent = `현재 작업 자료와 함께 공개 저장소 ${formatNumber(repos.length)}개 중 대표 작업 ${featuredRepos.length}개를 보여줍니다.`;
  elements.activityNote.textContent = `최근 푸시된 저장소 ${recentRepos.length}개를 기준으로 정렬했습니다.`;

  renderLanguages(topLanguages);
  renderProjects(featuredRepos);
  renderActivity(recentRepos);
  renderContactLinks(profile);
}

function buildTopLanguages(repos) {
  const languageMap = repos.reduce((map, repo) => {
    if (!repo.language) {
      return map;
    }

    map[repo.language] = (map[repo.language] || 0) + 1;
    return map;
  }, {});

  return Object.entries(languageMap)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
}

function buildStatusLine(profile, repos, topLanguages) {
  const parts = [
    `${formatNumber(repos.length)} public repositories`,
    `${formatNumber(profile.followers)} followers`,
  ];

  if (topLanguages[0]) {
    parts.push(`top language ${topLanguages[0].name}`);
  }

  return parts.join(" / ");
}

function buildLeadCopy(profile) {
  if (profile.bio) {
    return profile.bio;
  }

  return "GitHub 공개 기록을 바탕으로 프로젝트와 최근 활동을 한 페이지에서 읽기 쉽게 정리한 개인 홈페이지입니다.";
}

function buildAboutCopy(profile, repoCount, totalStars, topLanguages) {
  const parts = [
    `${profile.name || FALLBACK_NAME}의 공개 작업 기록을 중심으로 정리한 포트폴리오입니다.`,
    `현재 공개 저장소는 ${formatNumber(repoCount)}개이고, 누적 스타는 ${formatNumber(totalStars)}개입니다.`,
  ];

  if (topLanguages.length > 0) {
    parts.push(`주요 언어는 ${topLanguages[0].name}이며, 상위 언어 흐름도 함께 표시합니다.`);
  }

  if (profile.location) {
    parts.push(`프로필에 등록된 활동 위치는 ${profile.location}입니다.`);
  }

  return parts.join(" ");
}

function buildClosingCopy(profile, repoCount, featuredRepos) {
  const parts = [
    `이 페이지는 GitHub API를 기반으로 ${formatNumber(repoCount)}개의 공개 저장소 중 주요 작업을 추려 보여줍니다.`,
  ];

  if (featuredRepos[0]) {
    parts.push(`현재 대표 작업은 ${featuredRepos[0].name} 저장소를 포함해 정렬됩니다.`);
  }

  if (profile.blog) {
    parts.push(`외부 링크가 등록되어 있어 GitHub 외의 작업 흔적도 함께 확인할 수 있습니다.`);
  }

  return parts.join(" ");
}

function renderLanguages(topLanguages) {
  if (!elements.languageCloud) {
    return;
  }

  if (topLanguages.length === 0) {
    elements.languageCloud.innerHTML = '<span class="chip">No language data</span>';
    return;
  }

  const fragment = document.createDocumentFragment();

  topLanguages.forEach((language) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `${language.name} (${language.count})`;
    fragment.append(chip);
  });

  elements.languageCloud.replaceChildren(fragment);
}

function renderProjects(repos) {
  if (!elements.projectGrid || !projectTemplate) {
    return;
  }

  if (repos.length === 0) {
    elements.projectGrid.innerHTML =
      '<div class="empty-state">표시할 공개 저장소가 아직 없습니다.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  repos.forEach((repo) => {
    const node = projectTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".project-language").textContent = repo.language || "General";
    node.querySelector(".project-updated").textContent = formatDate(repo.pushed_at);
    node.querySelector(".project-title").textContent = repo.name;
    node.querySelector(".project-description").textContent = buildRepoDescription(repo);
    node.querySelector(".project-stars").textContent = `Stars ${formatNumber(repo.stargazers_count)}`;

    const link = node.querySelector(".project-link");
    link.href = repo.html_url;

    fragment.append(node);
  });

  elements.projectGrid.replaceChildren(fragment);
}

function renderActivity(repos) {
  if (!elements.activityList || !activityTemplate) {
    return;
  }

  if (repos.length === 0) {
    elements.activityList.innerHTML =
      '<div class="empty-state">최근 공개 활동이 아직 없습니다.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  repos.forEach((repo) => {
    const node = activityTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".timeline-date").textContent = formatDate(repo.pushed_at);
    node.querySelector(".timeline-title").textContent = repo.name;
    node.querySelector(".timeline-copy").textContent = buildTimelineCopy(repo);
    fragment.append(node);
  });

  elements.activityList.replaceChildren(fragment);
}

function renderContactLinks(profile) {
  if (!elements.contactLinks) {
    return;
  }

  const links = [
    {
      title: "GitHub Profile",
      meta: profile.html_url.replace("https://", ""),
      href: profile.html_url,
    },
    {
      title: "Homepage Source",
      meta: "AOLLMAN.github.io",
      href: SITE_REPO_URL,
    },
  ];

  if (profile.blog) {
    links.push({
      title: "External Website",
      meta: trimUrl(toExternalUrl(profile.blog)),
      href: toExternalUrl(profile.blog),
    });
  }

  const fragment = document.createDocumentFragment();

  links.forEach((entry) => {
    const link = document.createElement("a");
    link.className = "contact-item";
    link.href = entry.href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.innerHTML = `<span class="contact-title">${entry.title}</span><span class="contact-meta">${entry.meta}</span>`;
    fragment.append(link);
  });

  elements.contactLinks.replaceChildren(fragment);
}

function buildRepoDescription(repo) {
  const parts = [];

  if (repo.description) {
    parts.push(repo.description);
  } else if (repo.language) {
    parts.push(`${repo.language} 중심으로 구성된 공개 저장소입니다.`);
  } else {
    parts.push("구현과 실험 흐름을 정리한 공개 저장소입니다.");
  }

  if (repo.homepage) {
    parts.push("배포 링크가 함께 연결되어 있습니다.");
  }

  return parts.join(" ");
}

function buildTimelineCopy(repo) {
  const parts = [];

  if (repo.language) {
    parts.push(`${repo.language} 기반 작업이 최근에 갱신되었습니다.`);
  } else {
    parts.push("최근 커밋이 반영된 공개 저장소입니다.");
  }

  if (repo.description) {
    parts.push(repo.description);
  }

  return parts.join(" ");
}

function renderErrorState(error) {
  const message =
    error?.status === 403
      ? "GitHub API 호출 제한으로 데이터를 잠시 불러오지 못하고 있습니다."
      : "지금은 GitHub 데이터를 불러올 수 없습니다.";

  elements.profileStatus.textContent = message;
  elements.bioLead.textContent = message;
  elements.aboutCopy.textContent = "네트워크 상태가 정상화되면 공개 저장소와 최근 활동을 다시 렌더링합니다.";
  elements.projectGrid.innerHTML = `<div class="empty-state">${message}</div>`;
  elements.activityList.innerHTML = `<div class="empty-state">${message}</div>`;
  elements.languageCloud.innerHTML = '<span class="chip">Unavailable</span>';
  elements.projectNote.textContent = "대표 프로젝트를 불러오지 못했습니다.";
  elements.activityNote.textContent = "최근 활동을 불러오지 못했습니다.";
  elements.factLocation.textContent = "Unavailable";
  elements.factCompany.textContent = "Unavailable";
  elements.factWebsite.textContent = "Unavailable";
  elements.factLastPush.textContent = "Unavailable";
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

function trimUrl(value) {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
