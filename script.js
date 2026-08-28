const words = ["Imagine", "Create", "Explore", "Repeat"];

const title = document.querySelector("#changing-title");
const titleNumber = document.querySelector("#title-number");
const nextButton = document.querySelector("#next-word");
const buttonZone = document.querySelector("#button-zone");
const progressBars = document.querySelectorAll("#progress span");

let currentWord = 0;

nextButton.addEventListener("click", () => {
  currentWord = (currentWord + 1) % words.length;

  title.textContent = words[currentWord];
  titleNumber.textContent = String(currentWord + 1).padStart(2, "0");

  progressBars.forEach((bar, index) => {
    bar.classList.toggle("active", index === currentWord);
  });

  title.classList.remove("word-in");
  void title.offsetWidth;
  title.classList.add("word-in");
});

function moveButtonAway(pointerX, pointerY) {
  const zoneRect = buttonZone.getBoundingClientRect();
  const buttonRect = nextButton.getBoundingClientRect();
  const maxX = Math.max(0, zoneRect.width - buttonRect.width);
  const maxY = Math.max(0, zoneRect.height - buttonRect.height);

  let bestPosition = { x: 0, y: 0, distance: 0 };

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const x = Math.random() * maxX;
    const y = Math.random() * maxY;
    const centerX = zoneRect.left + x + buttonRect.width / 2;
    const centerY = zoneRect.top + y + buttonRect.height / 2;
    const distance = Math.hypot(pointerX - centerX, pointerY - centerY);

    if (distance > bestPosition.distance) {
      bestPosition = { x, y, distance };
    }
  }

  nextButton.style.transform = `translate(${bestPosition.x}px, ${bestPosition.y}px)`;
}

document.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse") {
    return;
  }

  const buttonRect = nextButton.getBoundingClientRect();
  const buttonCenterX = buttonRect.left + buttonRect.width / 2;
  const buttonCenterY = buttonRect.top + buttonRect.height / 2;
  const pointerDistance = Math.hypot(
    event.clientX - buttonCenterX,
    event.clientY - buttonCenterY,
  );

  if (pointerDistance < 130) {
    moveButtonAway(event.clientX, event.clientY);
  }
});

window.addEventListener("resize", () => {
  nextButton.style.transform = "translate(0, 0)";
});
