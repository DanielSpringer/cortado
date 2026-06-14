document.documentElement.classList.add("js");

const revealItems = document.querySelectorAll("[data-reveal]");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const videos = Array.from(document.querySelectorAll("video"));
const concertList = document.querySelector("[data-concert-list]");

const revealObserver =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.18,
          rootMargin: "0px 0px -8% 0px",
        }
      )
    : null;

if (revealObserver) {
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const syncMotionPreference = () => {
  if (reducedMotionQuery.matches) {
    videos.forEach((video) => {
      video.pause();
      video.removeAttribute("autoplay");
    });
    return;
  }

  videos.forEach((video) => {
    video.setAttribute("autoplay", "");
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  });
};

syncMotionPreference();

if (typeof reducedMotionQuery.addEventListener === "function") {
  reducedMotionQuery.addEventListener("change", syncMotionPreference);
} else if (typeof reducedMotionQuery.addListener === "function") {
  reducedMotionQuery.addListener(syncMotionPreference);
}

const formatConcertDate = (dateValue) => {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return {
      month: "Date",
      day: "TBA",
      year: "",
    };
  }

  return {
    month: new Intl.DateTimeFormat("en", { month: "short" }).format(date),
    day: new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date),
    year: new Intl.DateTimeFormat("en", { year: "numeric" }).format(date),
  };
};

const appendText = (parent, tagName, className, text) => {
  if (!text) {
    return null;
  }

  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
};

const createConcertCard = (concert) => {
  const item = document.createElement("article");
  item.className = "concert-item";

  const dateParts = formatConcertDate(concert.date);
  const date = document.createElement("time");
  date.className = "concert-date";
  if (concert.date) {
    date.dateTime = concert.date;
  }

  appendText(date, "span", "concert-date__month", dateParts.month);
  appendText(date, "strong", "concert-date__day", dateParts.day);
  appendText(date, "span", "concert-date__year", dateParts.year);

  const body = document.createElement("div");
  body.className = "concert-item__body";
  appendText(body, "h3", "concert-item__title", concert.title);
  appendText(
    body,
    "p",
    "concert-item__place",
    [concert.venue, concert.city, concert.country].filter(Boolean).join(" · ")
  );
  appendText(body, "p", "concert-item__program", concert.program);
  appendText(body, "span", "concert-item__format", concert.format);

  item.append(date, body);
  return item;
};

const showConcertStatus = (message) => {
  if (!concertList) {
    return;
  }

  const status = document.createElement("p");
  status.className = "concert-list__status";
  status.textContent = message;
  concertList.replaceChildren(status);
};

const renderConcerts = (concerts) => {
  if (!concertList) {
    return;
  }

  const sortedConcerts = concerts
    .filter((concert) => concert && concert.title)
    .sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`));

  if (!sortedConcerts.length) {
    showConcertStatus("No previous concerts are listed yet.");
    return;
  }

  concertList.replaceChildren(...sortedConcerts.map(createConcertCard));
};

if (concertList) {
  fetch("previous-concerts.json", { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Concert data request failed with ${response.status}`);
      }

      return response.json();
    })
    .then((data) => renderConcerts(Array.isArray(data) ? data : data.concerts || []))
    .catch(() => {
      showConcertStatus("Previous concerts could not be loaded. Check previous-concerts.json.");
    });
}
