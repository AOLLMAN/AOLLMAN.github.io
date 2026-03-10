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

  document.title = `${DISPLAY_NAME} | Sketchbook Portfolio`;
  elements.profileLink.href = profile.html_url;
  elements.leadCopy.textContent = buildLead(profile, publicRepos.length);
  elements.bioCopy.textContent =
    profile.bio ||
    `${DISPLAY_NAME} keeps this page simple: soft visuals, public code, and current work in one place.`;
  elements.focusLine.textContent = topLanguage
    ? `building with ${topLanguage}`
    : "exploring new ideas";
  elements.locationLine.textContent = profile.location || "location not listed";
  elements.statRepos.textContent = formatNumber(profile.public_repos);
  elements.statFollowers.textContent = formatNumber(profile.followers);
  elements.statStars.textContent = formatNumber(totalStars);
  elements.statLanguage.textContent = topLanguage || "mixed stack";
  elements.repoNote.textContent = `Showing ${featuredRepos.length} highlighted public repositories.`;

  renderFacts(profile);
  renderRepos(featuredRepos);
  renderTimeline(recentRepos);
}

function buildLead(profile, repoCount) {
  const parts = [
    `${DISPLAY_NAME}'s GitHub-backed sketchbook page.`,
    `${formatNumber(repoCount)} public repositories collected into a warm, hand-drawn layout.`,
  ];

  if (profile.location) {
    parts.push(`Based in ${profile.location}.`);
  }

  return parts.join(" ");
}

function renderFacts(profile) {
  const rows = [
    { label: "GitHub", value: "Open profile", href: profile.html_url },
    { label: "Company", value: profile.company || "Not listed" },
    { label: "Blog", value: profile.blog ? "Visit site" : "Not listed", href: profile.blog ? toExternalUrl(profile.blog) : null },
    { label: "Joined", value: formatDate(profile.created_at) },
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
      '<div class="empty-state">No public repositories are available yet.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  repos.forEach((repo) => {
    const node = repoTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".repo-title").textContent = repo.name;
    node.querySelector(".repo-language").textContent = repo.language || "Mixed";
    node.querySelector(".repo-description").textContent =
      repo.description || "A quiet repository with no summary written yet.";
    node.querySelector(".repo-stars").textContent = `Stars ${repo.stargazers_count}`;
    node.querySelector(".repo-date").textContent = `Updated ${formatDate(
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
      '<div class="empty-state">Recent public activity will appear here.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  repos.forEach((repo) => {
    const node = timelineTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".timeline-date").textContent = formatDate(repo.pushed_at);
    node.querySelector(".timeline-title").textContent = repo.name;
    node.querySelector(".timeline-copy").textContent =
      repo.description || "Updated recently, with the repository summary left blank.";
    fragment.append(node);
  });

  elements.timeline.replaceChildren(fragment);
}

function renderError(error) {
  const message =
    error.status === 403
      ? "GitHub API rate limit reached. Try refreshing in a little while."
      : "GitHub profile data could not be loaded right now.";

  elements.leadCopy.textContent = message;
  elements.bioCopy.textContent = message;
  elements.focusLine.textContent = "live data unavailable";
  elements.locationLine.textContent = "check network";
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

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
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
